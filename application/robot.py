import asyncio
import json
import socketio
from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
)
from aiortc.contrib.media import MediaPlayer

# ----------------------------
# ICE / TURN configuration
# ----------------------------
ice_servers = [
    RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
    RTCIceServer(
        urls=["turn:openrelay.metered.ca:80"],
        username="openrelayproject",
        credential="openrelayproject",
    ),
]
rtc_config = RTCConfiguration(iceServers=ice_servers)

# ----------------------------
# Globals
# ----------------------------
sio = socketio.AsyncClient()
pc: RTCPeerConnection | None = None
dc = None  # DataChannel
player: MediaPlayer | None = None

SIGNALING_URL = "https://application-8mai.onrender.com"  # change if needed


# ----------------------------
# Helpers
# ----------------------------
def print_ice_servers():
    print("📡 Using ICE servers:")
    for s in ice_servers:
        print("   -", s.urls)


def create_media_player() -> MediaPlayer:
    """
    Try to open the default webcam. On Windows with DirectShow, you can pass the
    device name like "video=Chicony USB2.0 Camera", format="dshow".
    If that fails, fall back to index 0.
    """
    try:
        # Windows DirectShow example (uncomment / adjust if you know the device name)
        # return MediaPlayer("video=Chicony USB2.0 Camera", format="dshow")
        return MediaPlayer(0)  # Default webcam
    except Exception as e:
        print("❌ Could not open webcam with index 0:", e)
        raise


# ----------------------------
# Socket.IO events
# ----------------------------
@sio.event
async def connect():
    print("✅ Connected to signaling server")
    await sio.emit("register-robot")


@sio.event
async def offer(data):
    """
    The signaling server forwards the SDP offer from the frontend here.
    We create an RTCPeerConnection, attach the webcam, answer, and send it back.
    """
    global pc, player

    print("📩 Received offer")
    print_ice_servers()

    pc = RTCPeerConnection(rtc_config)

    # Log ICE state changes for debugging (very useful across networks)
    @pc.on("iceconnectionstatechange")
    def on_ice_state_change():
        print("🔄 ICE connection state:", pc.iceConnectionState)

    # Listen for a DataChannel created by the frontend
    @pc.on("datachannel")
    def on_datachannel(channel):
        global dc
        dc = channel
        print(f"📡 DataChannel created by frontend: {channel.label}")

        @channel.on("message")
        def on_message(msg):
            print("📥 From frontend:", msg)
            # Simple JSON-aware echo
            try:
                parsed = json.loads(msg)
                if parsed.get("cmd") == "ping":
                    channel.send(json.dumps({"status": "ok", "from": "robot"}))
                    return
            except Exception:
                pass

            channel.send("Ack: " + msg)

        # Send an initial hello message
        try:
            channel.send("🤖 Robot ready (DataChannel active)")
        except Exception as e:
            print("⚠️ Could not send on DataChannel yet:", e)

    # Set remote description (the offer from frontend)
    await pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"], type=data["type"]))

    # Start camera & add track
    try:
        player = create_media_player()
        if player.video:
            pc.addTrack(player.video)
            print("🎥 Webcam track added")
        else:
            print("⚠️ No video track found on the player.")
    except Exception as e:
        print("❌ Failed to start camera:", e)

    # Create and send answer
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await sio.emit("answer", {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})
    print("✅ Sent answer")


@sio.on("candidate")
async def on_candidate(data):
    """
    Add remote ICE candidates coming from the frontend.
    Make sure the fields match what your signaling server forwards.
    """
    if not pc:
        return

    try:
        candidate = RTCIceCandidate(
            component=data.get("component", 1),
            foundation=data.get("foundation", "0"),
            priority=data.get("priority", 0),
            protocol=data.get("protocol", "udp"),
            ip=data.get("ip"),
            port=data.get("port"),
            type=data.get("type", "host"),
            sdpMid=data.get("sdpMid"),
            sdpMLineIndex=data.get("sdpMLineIndex"),
        )
        await pc.addIceCandidate(candidate)
        print("➕ Added ICE candidate from frontend")
    except Exception as e:
        print("⚠️ Failed to add ICE candidate:", e)


@sio.event
def disconnect():
    print("🔌 Disconnected from signaling server")


# ----------------------------
# Main
# ----------------------------
async def main():
    await sio.connect(SIGNALING_URL)
    await sio.wait()


if __name__ == "__main__":
    asyncio.run(main())

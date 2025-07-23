import socketio
import asyncio
from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate
)
from aiortc.contrib.media import MediaPlayer

# STUN + TURN config (Metered.ca for testing)
ice_servers = [
    RTCIceServer(urls="stun:stun.l.google.com:19302"),
    RTCIceServer(
        urls="turn:openrelay.metered.ca:80",
        username="openrelayproject",
        credential="openrelayproject"
    ),
    RTCIceServer(
        urls="turn:openrelay.metered.ca:443",
        username="openrelayproject",
        credential="openrelayproject"
    ),
    RTCIceServer(
        urls="turn:openrelay.metered.ca:443?transport=tcp",
        username="openrelayproject",
        credential="openrelayproject"
    )
]
rtc_config = RTCConfiguration(iceServers=ice_servers)
sio = socketio.AsyncClient()
pc = RTCPeerConnection(rtc_config)
dc = None

async def setup_media():
    return MediaPlayer("video=Chicony USB2.0 Camera", format="dshow")

@sio.event
async def connect():
    print("Connected to signaling server")
    await sio.emit("register-robot")

@sio.event
async def offer(data):
    print("📥 Received offer")
    await pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"], type=data["type"]))

    player = await setup_media()
    if player.video:
        pc.addTrack(player.video)

    @pc.on("datachannel")
    def on_datachannel(channel):
        global dc
        dc = channel
        print("🔄 DataChannel created")

        @channel.on("message")
        def on_message(msg):
            print(f"📨 Received command: {msg}")
            if msg == "stop":
                print(" Stopping...")

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await sio.emit("answer", {
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })

@sio.on("candidate")
async def on_candidate(data):
    candidate = RTCIceCandidate(
        component=data["component"],
        foundation=data["foundation"],
        priority=data["priority"],
        protocol=data["protocol"],
        ip=data["ip"],
        port=data["port"],
        type=data["type"],
        sdpMid=data["sdpMid"],
        sdpMLineIndex=data["sdpMLineIndex"]
    )
    await pc.addIceCandidate(candidate)

async def main():
    await sio.connect("https://application-8mai.onrender.com")
    await sio.wait()

if __name__ == "__main__":
    asyncio.run(main())

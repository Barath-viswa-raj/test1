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

ice_servers = [
    RTCIceServer(
        urls='turn:192.168.1.2:3478',
        username='test',
        credential='test123'
    ),
    RTCIceServer(
        urls='stun:stun.l.google.com:19302'
    )
]

rtc_config = RTCConfiguration(iceServers=ice_servers)
pc = RTCPeerConnection(configuration=rtc_config)
sio = socketio.AsyncClient()
dc = None

async def setup_media():
    try:
        player = MediaPlayer("video=Chicony USB2.0 Camera", format="dshow")
        if player.video:
            print("Webcam ready")
        else:
            print("No video track found")
        return player
    except Exception as e:
        print("Webcam error:", e)
        return None

# 📡 Handle signaling connection
@sio.event
async def connect():
    print("Connected to signaling server")
    await sio.emit("register-robot")

@pc.on("connectionstatechange")
async def on_connectionstatechange():
    print(f"Connection state changed: {pc.connectionState}")
    if pc.connectionState == "failed":
        print("Connection failed, closing...")
        await pc.close()

# ✅ Always listen for datachannel once at start
@pc.on("datachannel")
def on_datachannel(channel):
    global dc
    dc = channel
    print("DataChannel created with frontend")

    @channel.on("message")
    def on_message(msg):
        print(f"Received from frontend:", msg)
        reply = "Ack: " + msg
        print(f"Sending back: {reply}")
        channel.send(reply)

    dc.send("Robot ready (DataChannel active)")

# Handle WebRTC offer
@sio.event
async def offer(data):
    print("Received offer")
    await pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"], type=data["type"]))

    player = await setup_media()
    if player and player.video:
        pc.addTrack(player.video)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await sio.emit("answer", {
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })
    print("Sent answer")

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
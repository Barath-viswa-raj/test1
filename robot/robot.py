import socketio
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer
import json

sio = socketio.AsyncClient()
pc = RTCPeerConnection()
dc = None  # DataChannel

async def setup_media():
    # Change this based on your device (use ffmpeg to list)
    return MediaPlayer("video=Chicony USB2.0 Camera", format="dshow")

@sio.event
async def connect():
    print("Connected to signaling server")
    await sio.emit("register-robot")

@sio.event
async def offer(data):
    print("📥 Received offer")
    offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
    await pc.setRemoteDescription(offer)

    # Add webcam stream
    player = await setup_media()
    if player.video:
        pc.addTrack(player.video)

    # DataChannel support
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
    await sio.connect("http://192.168.1.4:9010")  
    await sio.wait()

if __name__ == "__main__":
    asyncio.run(main())

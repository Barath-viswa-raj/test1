import socketio
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.signaling import BYE

sio = socketio.AsyncClient()
pc = None
dc = None

SIGNALING_SERVER_URL = "https://application-8mai.onrender.com/"

@sio.event
async def connect():
    print("[Backend] Connected to signaling server")
    await sio.emit("register-robot")
    await sio.emit("robot-registered")

@sio.event
async def offer(data):
    global pc, dc
    print("[Backend] Offer received:", data)

    pc = RTCPeerConnection()

    @pc.on("datachannel")
    def on_datachannel(channel):
        global dc
        dc = channel
        print("[Backend] Data channel opened:", channel.label)

        @channel.on("message")
        def on_message(message):
            print(f"[Backend] Received message from frontend: {message}")
            response = f"Ack: {message}"
            print(f"[Backend] Sending response: {response}")
            channel.send(response)

    await pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"], type=data["type"]))

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await sio.emit("answer", {
        "sdp": pc.localDescription.sdp,
        "type": pc.localDescription.type
    })
    print("[Backend] Sent answer")

@sio.event
async def candidate(data):
    print("[Backend] Candidate received:", data)


async def main():
    await sio.connect(SIGNALING_SERVER_URL)
    await sio.wait()

if __name__ == "__main__":
    asyncio.run(main())

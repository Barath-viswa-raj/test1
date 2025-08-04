import socketio
import asyncio
import base64
import cv2
import numpy as np
from aiortc import RTCPeerConnection, RTCConfiguration, RTCIceServer

SIGNALING_SERVER_URL = "https://application-8mai.onrender.com/"

sio = socketio.AsyncClient()
pc = RTCPeerConnection(configuration=RTCConfiguration(iceServers=[
    RTCIceServer(urls=["stun:bn-turn1.xirsys.com"])
]))

@sio.event
async def connect():
    print("🔌 Connected to signaling server.")
    await sio.emit("register-robot")

@sio.event
async def disconnect():
    print("🔌 Disconnected from signaling server.")

@sio.event
async def take_snapshot():
    print("📸 Snapshot request received.")
    # Open the camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Failed to open camera.")
        return

    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("❌ Failed to read frame.")
        return

    # Encode to JPEG
    _, jpeg = cv2.imencode('.jpg', frame)
    jpg_bytes = jpeg.tobytes()

    # Convert to base64
    b64_img = base64.b64encode(jpg_bytes).decode("utf-8")

    # Emit snapshot to frontend
    await sio.emit("snapshot", {"image": b64_img})
    print("📤 Snapshot sent to frontend.")

async def main():
    await sio.connect(SIGNALING_SERVER_URL)
    await sio.wait()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 Exiting...")

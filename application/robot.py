import socketio
import asyncio
from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
)
from aiortc.contrib.media import MediaPlayer


SIGNALING_SERVER_URL = "https://application-8mai.onrender.com"

pc = None
sio = socketio.AsyncClient()
dc = None
player = None


async def fetch_ice_servers():
    return [
        RTCIceServer(urls=["stun:bn-turn1.xirsys.com"]),
        RTCIceServer(
            urls=[
                "turn:bn-turn1.xirsys.com:80?transport=udp",
                "turn:bn-turn1.xirsys.com:80?transport=tcp",
                "turns:bn-turn1.xirsys.com:443?transport=tcp"
            ],
            username="Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
            credential="c0f43e62-4cd4-11f0-aba7-0242ac140004",
        )
    ]


async def try_access_camera():
    global player
    try:
        print("📸 Attempting to access camera...")
        player = MediaPlayer("video=Chicony USB2.0 Camera", format="dshow")
        if player.video:
            print("✅ Camera accessed successfully.")
        else:
            print("❌ Camera opened, but no video track found.")
    except Exception as e:
        print(f"❌ Failed to access camera: {e}")


async def main():
    global pc
    ice_servers = await fetch_ice_servers()
    rtc_config = RTCConfiguration(iceServers=ice_servers)
    pc = RTCPeerConnection(configuration=rtc_config)

    print("🛠 PeerConnection created")

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"🔄 Connection state changed: {pc.connectionState}")
        if pc.connectionState == "connected":
            print("✅ Peer-to-peer connection established")
        elif pc.connectionState == "disconnected":
            print("⚠️ Disconnected. Closing connection.")
            await pc.close()

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        print(f"🔍 ICE connection state changed: {pc.iceConnectionState}")

    @pc.on("icegatheringstatechange")
    async def on_icegatheringstatechange():
        print(f"❄️ ICE gathering state: {pc.iceGatheringState}")

    @pc.on("icecandidate")
    async def on_ice_candidate(event):
        if event.candidate:
            print(f"📤 Sending ICE candidate to frontend")
            await sio.emit("candidate", {
                "candidate": event.candidate.candidate,
                "sdpMid": event.candidate.sdpMid,
                "sdpMLineIndex": event.candidate.sdpMLineIndex,
            })

    @pc.on("datachannel")
    def on_datachannel(channel):
        global dc
        dc = channel
        print("✅ DataChannel opened with frontend")

        @channel.on("message")
        def on_message(msg):
            print(f"📩 Message from frontend: {msg}")
            if msg == "access-camera":
                loop = asyncio.get_event_loop()
                loop.create_task(try_access_camera())
                channel.send("📷 Camera access attempted.")
            else:
                print("⚠️ Unknown command received.")
                channel.send("❓ Unknown command.")

    @sio.event
    async def connect():
        print(f"🔌 Connected to signaling server (SID: {sio.get_sid()})")
        await sio.emit("register-robot")
        await sio.emit("robot-registered")

    @sio.event
    async def offer(data):
        print("📨 Received offer from frontend")
        await pc.setRemoteDescription(RTCSessionDescription(
            sdp=data["sdp"],
            type=data["type"]
        ))

        # Not adding video track unless requested
        print("🔕 Skipping media track attachment (text-only mode)")

        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        print("✅ Answer created and set")
        await sio.emit("answer", {
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type
        })
        print("📤 Answer sent to frontend")

    @sio.on("candidate")
    async def on_candidate(data):
        candidate = RTCIceCandidate(
            candidate=data["candidate"],
            sdpMid=data["sdpMid"],
            sdpMLineIndex=data["sdpMLineIndex"]
        )
        print("📥 Received ICE candidate from frontend")
        await pc.addIceCandidate(candidate)

    await sio.connect(SIGNALING_SERVER_URL)
    print("🚀 Socket.IO connected. Awaiting events...")
    await sio.wait()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("👋 Shutting down gracefully...")
        if pc:
            asyncio.run(pc.close())
        if sio.connected:
            asyncio.run(sio.disconnect())

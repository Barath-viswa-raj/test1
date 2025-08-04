import socketio
import asyncio
from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    VideoStreamTrack
)
from aiortc.contrib.media import MediaPlayer
import aiohttp

# Signal server URL
SIGNALING_SERVER_URL = "https://application-8mai.onrender.com/"

async def fetch_ice_servers():
    return [
        RTCIceServer(urls=["stun:bn-turn1.xirsys.com"]),
        RTCIceServer (
        # urls = ["turn:global.relay.metered.ca:80"],
        # username = "f42ebdd62391966c28dc7e37",
        # credential =  "VVULqJQU+41ZKGZX",
        urls = ["turn:bn-turn1.xirsys.com:80?transport=udp",
                "turn:bn-turn1.xirsys.com:80?transport=tcp",
               ],
        username = "Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
        credential = "c0f43e62-4cd4-11f0-aba7-0242ac140004",
        )
    ]
     # api_url = "https://applicationtestwebrtc.metered.live/api/v1/turn/credentials?apiKey=026cee6cbdb1ca82089a5f6658aba9787578"
    # try:
    #     async with aiohttp.ClientSession() as session:
    #         async with session.get(api_url) as response:
    #             if response.status == 200:
    #                 data = await response.json()
    #                 print("Fetched ICE servers:", data)
    #                 ice_servers = [
    #                      RTCIceServer(
    #                         urls=item.get("urls", []),
    #                         username=item.get("username",""),
    #                         credential=item.get("credential","")
    #                     ) for item in data
    #                 ]
    #                 print("Parsed ICE servers:", ice_servers.username)
    #                 return ice_servers
    #             else:
    #                 print(f"Failed to fetch TURN credentials, status: {response.status}")
    #                 return [
    #                     RTCIceServer(urls=["stun:bn-turn1.xirsys.com"]),
    #                     RTCIceServer(
    #                         urls=[
    #                             "turn:bn-turn1.xirsys.com:80?transport=udp",
    #                             "turn:bn-turn1.xirsys.com:3478?transport=udp",
    #                             "turn:bn-turn1.xirsys.com:80?transport=tcp",
    #                             "turn:bn-turn1.xirsys.com:3478?transport=tcp",
    #                             "turns:bn-turn1.xirsys.com:443?transport=tcp",
    #                             "turns:bn-turn1.xirsys.com:5349?transport=tcp"
    #                         ],
    #                         username="Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
    #                         credential="c0f43e62-4cd4-11f0-aba7-0242ac140004"
    #                     )
    #                 ]
    # except Exception as e:
    #     print("Error fetching TURN credentials:", e)
    #     return [
    #         RTCIceServer(urls=["stun:bn-turn1.xirsys.com"]),
    #         RTCIceServer(
    #             urls=[
    #                 "turn:bn-turn1.xirsys.com:80?transport=udp",
    #                 "turn:bn-turn1.xirsys.com:3478?transport=udp",
    #                 "turn:bn-turn1.xirsys.com:80?transport=tcp",
    #                 "turn:bn-turn1.xirsys.com:3478?transport=tcp",
    #                 "turns:bn-turn1.xirsys.com:443?transport=tcp",
    #                 "turns:bn-turn1.xirsys.com:5349?transport=tcp"
    #             ],
    #             username="Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
    #             credential="c0f43e62-4cd4-11f0-aba7-0242ac140004"
    #         )
    #     ]

# Global variables
pc = None
sio = socketio.AsyncClient()
dc = None
player = None

async def setup_media():
    global player
    try:
        player = MediaPlayer(
            "video=Chicony USB2.0 Camera",
            format="dshow"
        )
        if player.video:
            print("Media player initialized with video track")
            return player.video
        else:
            print("No video track found in media file")
            return None
    except Exception as e:
        print("Media setup error:", e)
        return None

async def main():
    global pc
    ice_servers = await fetch_ice_servers()
    rtc_config = RTCConfiguration(iceServers=ice_servers)
    pc = RTCPeerConnection(configuration=rtc_config)

    print(f"Connection state changed: {pc.connectionState}")

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"Connection state changed: {pc.connectionState}")
        if pc.connectionState == "disconnected":
            print("Connection failed, attempting to close...")
            await pc.close()
        elif pc.connectionState == "connected":
            print("P2P connection established successfully")

    @pc.on("iceconnectionstatechange")
    async def on_iceconnectionstatechange():
        print(f"ICE connection state changed: {pc.iceConnectionState}")

    @pc.on("icegatheringstatechange")
    async def on_icegatheringstatechange():
        print(f"🔍 ICE gathering state: {pc.iceGatheringState}")

    @pc.on("icecandidate")
    async def on_ice_candidate(event):
        if event.candidate:
            print(f"Sending ICE candidate: {event.candidate}")
            await sio.emit("candidate", {
                "candidate": event.candidate,
                # "component": event.candidate.component,
                # "foundation": event.candidate.foundation,
                # "priority": event.candidate.priority,
                # "protocol": event.candidate.protocol,
                # "ip": event.candidate.ip,
                # "port": event.candidate.port,
                # "type": event.candidate.type,
                # "sdpMid": event.candidate.sdpMid,
                # "sdpMLineIndex": event.candidate.sdpMLineIndex
            })
        else:
            print("ICE candidate gathering complete")

    @pc.on("datachannel")
    def on_datachannel(channel):
        global dc
        dc = channel
        print("DataChannel created with frontend")

        @channel.on("message")
        def on_message(msg):
            print(f"Received from frontend: {msg}")
            reply = "Ack: " + msg
            print(f"Sending back to frontend: {reply}")
            channel.send(reply)

        dc.send("Robot ready (DataChannel active)")

    @sio.event
    async def connect():
        print(f"Connected to signaling server with SID: {sio.get_sid()}")
        await sio.emit("register-robot")
        await sio.emit("robot-registered")

    @sio.event
    async def offer(data):
        print("Received offer:", data)
        await pc.setRemoteDescription(RTCSessionDescription(sdp=data["sdp"], type=data["type"]))

        video_track = await setup_media()
        if video_track:
            print("Adding video track to peer connection")
            pc.addTrack(video_track)
        else:
            print("Failed to add video track, check media file or setup")

        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        print("Created and set local description for answer")

        await sio.emit("answer", {
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type
        })
        print("Sent answer to signaling server")

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
        print(f"Adding ICE candidate: {candidate}")
        await pc.addIceCandidate(candidate)

    await sio.connect(SIGNALING_SERVER_URL)
    await sio.wait()
    print("Socket.IO client connected and waiting for events")
    await setup_media()
    print("Media setup complete, ready to handle WebRTC offers")
    await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Shutting down...")
        if pc:
            asyncio.run_coroutine_threadsafe(pc.close(), asyncio.get_event_loop())
        if sio.connected:
            asyncio.run_coroutine_threadsafe(sio.disconnect(), asyncio.get_event_loop())
import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

const SIGNAL_URL = "https://application-8mai.onrender.com"; // update to real URL when deployed

function App() {
  const videoRef = useRef();
  const pcRef = useRef();
  const socketRef = useRef();

  useEffect(() => {
    const init = async () => {
      const iceServers = [
        { urls: ["stun:bn-turn1.xirsys.com"] },
        {
          urls: [
            "turn:bn-turn1.xirsys.com:80?transport=udp",
            "turn:bn-turn1.xirsys.com:80?transport=tcp",
            "turns:bn-turn1.xirsys.com:443?transport=tcp"
          ],
          username: "Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
          credential: "c0f43e62-4cd4-11f0-aba7-0242ac140004"
        }
      ];

      socketRef.current = io(SIGNAL_URL);
      socketRef.current.on("connect", () => console.log("Connected to signaling"));

      socketRef.current.on("answer", async (data) => {
        console.log("Answer received");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
      });

      socketRef.current.on("candidate", async (data) => {
        console.log("Candidate from backend:", data);
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
      });

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit("candidate", {
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex
          });
        }
      };

      pc.ontrack = (event) => {
        videoRef.current.srcObject = event.streams[0];
      };
    };
    init();
    return () => {
      pcRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, []);

  const startStream = async () => {
    const pc = pcRef.current;
    pc.addTransceiver("video", { direction: "recvonly" });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit("offer", {
      sdp: offer.sdp,
      type: offer.type
    });
    console.log("Offer sent");
  };

  return (
    <div>
      <h2>Robot Feed</h2>
      <video ref={videoRef} autoPlay playsInline style={{ width: "640px" }} />
      <button onClick={startStream}>Start Stream</button>
    </div>
  );
}

export default App;

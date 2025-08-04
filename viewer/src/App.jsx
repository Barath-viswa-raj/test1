import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNAL_URL = "https://application-8mai.onrender.com"; // your signaling server

function App() {
  const pcRef = useRef();
  const socketRef = useRef();
  const dcRef = useRef();
  const [status, setStatus] = useState("Disconnected");

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
      socketRef.current.on("connect", () => {
        console.log("✅ Connected to signaling server");
        setStatus("Connected to signaling");
      });

      socketRef.current.on("answer", async (data) => {
        console.log("✅ Answer received from robot");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
      });

      socketRef.current.on("candidate", async (data) => {
        console.log("✅ ICE candidate from robot");
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
      });

      const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "relay" });
      pcRef.current = pc;

      const dc = pc.createDataChannel("control");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("✅ DataChannel opened");
        setStatus("DataChannel connected");
      };

      dc.onmessage = (e) => {
        console.log("📩 Message from robot:", e.data);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current.emit("candidate", {
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex
          });
        }
      };
    };

    init();

    return () => {
      pcRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, []);

  const startConnection = async () => {
    const pc = pcRef.current;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit("offer", {
      sdp: offer.sdp,
      type: offer.type
    });
    console.log("📤 Offer sent");
  };

  const accessCamera = () => {
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send("access-camera");
      console.log("📤 Sent 'access-camera' command");
    } else {
      console.log("❌ DataChannel not open");
    }
  };

  return (
    <div>
      <h2>Robot Controller</h2>
      <p>Status: {status}</p>
      <button onClick={startConnection}>Start Connection</button>
      <button onClick={accessCamera}>Access Camera (Only)</button>
    </div>
  );
}

export default App;

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "https://application-8mai.onrender.com";

const iceConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:192.168.1.2:3478",
      username: "test",
      credential: "test123"
    }
  ]
};

const Viewer = () => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const dataChannelRef = useRef(null);

  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SIGNALING_SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to signaling server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.warn("❌ Disconnected from signaling server");
      setConnected(false);
    });

    socket.on("answer", async ({ sdp, type }) => {
      console.log("📥 Answer received");
      const pc = pcRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("✅ ICE candidate added");
      } catch (err) {
        console.error("🚫 Error adding ICE candidate:", err);
      }
    });

    socket.on("robot-disconnected", () => {
      console.warn("🤖 Robot disconnected");
    });

    return () => {
      socket.disconnect();
      pcRef.current?.close();
    };
  }, []);

  const setupDataChannel = (channel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("🟢 DataChannel opened");
      addToLog("[System] Chat ready");
    };

    channel.onmessage = (event) => {
      console.log("📩 Robot:", event.data);
      addToLog("Robot: " + event.data);
    };

    channel.onclose = () => {
      console.log("🔴 DataChannel closed");
      addToLog("[System] Chat closed");
    };
  };

  const startStream = async () => {
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    };

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    // Optional: Create chat channel from viewer
    const dc = pc.createDataChannel("chat");
    setupDataChannel(dc);

    pc.addTransceiver("video", { direction: "recvonly" });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("offer", {
      sdp: offer.sdp,
      type: offer.type
    });

    console.log("📤 Offer sent to robot");
  };

  const sendMessage = () => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(message);
      addToLog("You: " + message);
      setMessage("");
    } else {
      alert("⚠️ Chat not ready");
    }
  };

  const addToLog = (line) => {
    setChatLog((prev) => [...prev, line]);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>🤖 Live Robot Feed + Command Chat</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        controls
        style={{ width: "80%", maxWidth: "720px", border: "2px solid black" }}
      />

      <br />
      <button onClick={startStream} disabled={!connected}>
        ▶️ Start Camera + Chat
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>💬 Command Chat</h3>
        <div
          style={{
            border: "1px solid #ccc",
            height: "150px",
            padding: "10px",
            overflowY: "auto",
            background: "#000",
            color: "#fff",
            marginBottom: "10px"
          }}
        >
          {chatLog.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type command..."
          style={{ width: "300px", marginRight: "10px" }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Viewer;

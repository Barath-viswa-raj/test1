import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "https://application-8mai.onrender.com";

const iceConfig = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    {
      username: "test",
      credential: "test123",
      urls: ["turn:171.76.103.17:3478"]  
    }
  ]
};

function App() {
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
      console.log("🔌 Disconnected from signaling server");
      setConnected(false);
    });

    socket.on("answer", async (data) => {
      console.log("📩 Received answer from robot");
      const remoteDesc = new RTCSessionDescription(data);
      await pcRef.current.setRemoteDescription(remoteDesc);
    });

    socket.on("candidate", async (data) => {
      console.log("📩 Received ICE candidate from robot:", data);
      const candidate = new RTCIceCandidate(data);
      await pcRef.current.addIceCandidate(candidate).catch(err => console.error("Error adding candidate:", err));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const setupPeerConnection = () => {
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log("🔄 ICE state:", pc.iceConnectionState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 Sending ICE candidate to robot:", event.candidate);
        socketRef.current.emit("candidate", {
          component: event.candidate.component,
          foundation: event.candidate.foundation,
          priority: event.candidate.priority,
          protocol: event.candidate.protocol,
          ip: event.candidate.ip,
          port: event.candidate.port,
          type: event.candidate.type,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("🎥 Received track from robot:", event.streams[0]);
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(err => console.error("Error playing video:", err));
      }
    };

    pc.ondatachannel = (event) => {
      console.log("🔗 DataChannel received from robot");
      setupDataChannel(event.channel);
    };

    // Optional: Create DataChannel if initiating
    const dc = pc.createDataChannel("chat");
    setupDataChannel(dc);
  };

  const setupDataChannel = (channel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("🟢 DataChannel opened");
      addToLog("[System] Chat is ready");
      channel.send("Hello from frontend!");  // Initial message
    };

    channel.onmessage = (event) => {
      console.log("📥 Robot:", event.data);
      addToLog("Robot: " + event.data);
    };

    channel.onclose = () => {
      console.log("🔴 DataChannel closed");
      addToLog("[System] Chat closed");
    };
  };

  const startStream = async () => {
    if (!pcRef.current) setupPeerConnection();

    const pc = pcRef.current;
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
      <h2>Live Robot Feed + Command Chat</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        muted
        style={{ width: "640px", height: "360px", background: "#000" }}
      />
      {/* Remove duplicate video element */}
      <br />
      <button onClick={startStream} disabled={!connected}>
        Start Camera + Chat
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>Command Chat</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            border: "1px solid #ccc",
            height: "150px",
            padding: "10px",
            overflowY: "auto",
            background: "#000000ff",
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
}

export default App;
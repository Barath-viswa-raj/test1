import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "https://application-8mai.onrender.com";

const iceConfig = {
  iceServers: [{
   urls: [ "stun:bn-turn1.xirsys.com" ]
}, {
   username: "Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
   credential: "c0f43e62-4cd4-11f0-aba7-0242ac140004",
   urls: [
       "turn:bn-turn1.xirsys.com:80?transport=udp",
       "turn:bn-turn1.xirsys.com:3478?transport=udp",
       "turn:bn-turn1.xirsys.com:80?transport=tcp",
       "turn:bn-turn1.xirsys.com:3478?transport=tcp",
       "turns:bn-turn1.xirsys.com:443?transport=tcp",
       "turns:bn-turn1.xirsys.com:5349?transport=tcp"
   ] 
}]
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
      console.log("Connected to signaling server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
      setConnected(false);
    });

    socket.on("answer", async (data) => {
      console.log("Received answer from robot");
      const remoteDesc = new RTCSessionDescription(data);
      await pcRef.current.setRemoteDescription(remoteDesc);
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

    pc.ontrack = (event) => {
      console.log("Received track from robot:",event.streams);
      console.log("🎥 Track received");
      videoRef.current.srcObject = event.streams[1];
    };

    pc.ondatachannel = (event) => {
      console.log("🔗 DataChannel received from robot");
      const channel = event.channel;
      setupDataChannel(channel);
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 Sending ICE candidate to robot:", event.candidate);
        socketRef.current.emit("candidate", {
          candidate: event.candidate
        });
      }
    }
  };

  const setupDataChannel = (channel) => {
    dataChannelRef.current = channel;

    channel.onopen = () => {
      console.log("🟢 DataChannel opened");
      addToLog("[System] Chat is ready");
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
    setupPeerConnection();

    // Optional: create DataChannel from frontend
    const dc = pcRef.current.createDataChannel("chat");
    setupDataChannel(dc);

    pcRef.current.addTransceiver("video", { direction: "recvonly" });

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

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
      <h2> Live Robot Feed + Command Chat</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        muted
        style={{ width: "640px", height: "360px", background: "#000" }}
      />

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

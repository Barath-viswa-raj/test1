import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "https://application-8mai.onrender.com";

const iceServers = {
  iceServers: [
    {
       urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
  ],
};

function App() {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const dataChannelRef = useRef(null);

  const [robotReady, setRobotReady] = useState(false);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    pcRef.current = new RTCPeerConnection(iceServers);
    socketRef.current = io(SIGNALING_SERVER_URL);

    socketRef.current.on("connect", () => {
      console.log("Connected to signaling server");
    });

    socketRef.current.on("robot-ready", () => {
      console.log("Robot is ready");
      setRobotReady(true);
    });

    socketRef.current.on("answer", async (data) => {
      console.log("Answer received from robot");
      const answer = new RTCSessionDescription(data);
      await pcRef.current.setRemoteDescription(answer);
    });

    pcRef.current.ontrack = (event) => {
      console.log("Track received");
      videoRef.current.srcObject = event.streams[0];
    };

    pcRef.current.ondatachannel = (event) => {
      console.log("DataChannel received from robot");
      const channel = event.channel;
      dataChannelRef.current = channel;

      channel.onmessage = (event) => {
        console.log("Message from robot:", event.data);
        setChatLog((prev) => [...prev, "Robot: " + event.data]);
      };

      channel.onopen = () => {
        console.log("DataChannel opened");
        setChatLog((prev) => [...prev, "[System] Chat is ready"]);
      };

      channel.onclose = () => {
        console.log("DataChannel closed");
        setChatLog((prev) => [...prev, "[System] Chat closed"]);
      };
    };
  }, []);

  const startStream = async () => {
    if (!robotReady) {
      alert("Robot not ready yet!");
      return;
    }

    pcRef.current.addTransceiver("video", { direction: "recvonly" });

    // Create DataChannel from viewer side too (optional)
    const dc = pcRef.current.createDataChannel("chat");
    dataChannelRef.current = dc;

    dc.onopen = () => {
      console.log("DataChannel opened (from viewer)");
      setChatLog((prev) => [...prev, "[System] Chat is ready"]);
    };

    dc.onmessage = (event) => {
      console.log("Message from robot:", event.data);
      setChatLog((prev) => [...prev, "Robot: " + event.data]);
    };

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socketRef.current.emit("offer", {
      sdp: offer.sdp,
      type: offer.type,
    });

    console.log("Offer sent to robot");
  };

  const sendMessage = () => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(message);
      setChatLog((prev) => [...prev, "You: " + message]);
      setMessage("");
    } else {
      alert("DataChannel not open");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Live Robot Feed + Command Chat</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{ width: "640px", height: "360px", background: "#000" }}
      />
      <br />
      <button onClick={startStream} disabled={!robotReady}>
        Start Camera + Chat
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>Command Chat</h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "1px solid #ccc",
            height: "150px",
            padding: "10px",
            overflowY: "scroll",
            background: "#000000ff",
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
          placeholder="Enter message"
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;

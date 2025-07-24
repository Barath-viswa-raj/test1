import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "https://application-8mai.onrender.com";

const iceServers = {
  iceServers: [
    {
      urls: ["stun:bn-turn1.xirsys.com"],
    },
    {
      urls: [
        "turn:bn-turn1.xirsys.com:80?transport=udp",
        "turn:bn-turn1.xirsys.com:3478?transport=udp",
        "turn:bn-turn1.xirsys.com:80?transport=tcp",
        "turn:bn-turn1.xirsys.com:3478?transport=tcp",
        "turns:bn-turn1.xirsys.com:443?transport=tcp",
        "turns:bn-turn1.xirsys.com:5349?transport=tcp",
      ],
      username:
        "Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
      credential: "c0f43e62-4cd4-11f0-aba7-0242ac140004",
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
  const [chat, setChat] = useState([]);

  useEffect(() => {
    const socket = io(SIGNALING_SERVER_URL);
    socketRef.current = socket;

    const pc = new RTCPeerConnection(iceServers);
    pcRef.current = pc;

    // Create DataChannel
    const dc = pc.createDataChannel("chat");
    dataChannelRef.current = dc;

    dc.onopen = () => {
      console.log("DataChannel open");
    };

    dc.onmessage = (event) => {
      console.log("Message from robot:", event.data);
      setChat((prev) => [...prev, { sender: "robot", text: event.data }]);
    };

    pc.ontrack = (event) => {
      console.log("Track received");
      videoRef.current.srcObject = event.streams[0];
    };

    socket.on("connect", () => {
      console.log("Connected to signaling server");
    });

    socket.on("robot-ready", () => {
      console.log("Robot is ready");
      setRobotReady(true);
    });

    socket.on("answer", async (data) => {
      console.log("Answer received from robot");
      const answer = new RTCSessionDescription(data);
      await pc.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await pc.addIceCandidate(candidate);
        console.log("Added ICE candidate from robot");
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };

    return () => {
      socket.disconnect();
    };
  }, []);

  const startStream = async () => {
    if (!robotReady) {
      console.warn("Robot is not connected");
      return;
    }

    pcRef.current.addTransceiver("video", { direction: "recvonly" });

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socketRef.current.emit("offer", {
      sdp: offer.sdp,
      type: offer.type,
    });

    console.log("Offer sent to robot");
  };

  const sendMessage = () => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(message);
      setChat((prev) => [...prev, { sender: "you", text: message }]);
      setMessage("");
    } else {
      console.warn("DataChannel is not open");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Live Robot Feed</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        style={{ width: "640px", height: "360px", background: "#000" }}
      />
      <br />
      <button onClick={startStream} disabled={!robotReady}>
        Start Camera
      </button>

      <hr />

      <h3>Chat with Robot</h3>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        {chat.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.sender}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Send message to robot"
      />
      <button onClick={sendMessage} disabled={!robotReady || !message}>
        Send
      </button>
    </div>
  );
}

export default App;

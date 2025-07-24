import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "https://application-8mai.onrender.com";
const App = () => {
  const [socketConnected, setSocketConnected] = useState(false);
  const [robotReady, setRobotReady] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [message, setMessage] = useState("");

  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const socket = io(SIGNALING_SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to signaling server");
      setSocketConnected(true);
    });

    socket.on("robot-ready", () => {
      console.log("Robot is ready");
      setRobotReady(true);
    });

    socket.on("answer", async (answer) => {
      const remoteDesc = new RTCSessionDescription(answer);
      await pcRef.current.setRemoteDescription(remoteDesc);
      console.log("Received answer from robot");
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await pcRef.current.addIceCandidate(candidate);
        console.log("ICE candidate added");
      } catch (e) {
        console.error("Error adding ICE candidate", e);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startStream = async () => {
    if (!robotReady) {
      alert("Robot not ready yet!");
      return;
    }

    const pc = new RTCPeerConnection({
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
});

    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", event.candidate);
      }
    };

    pc.ontrack = (event) => {
      console.log("Received track");
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;

      channel.onopen = () => {
        console.log("DataChannel opened");
        setChatLog((prev) => [...prev, "[System] Chat is ready"]);
        // Tell robot to start camera
        channel.send("start-camera");
      };

      channel.onmessage = (event) => {
        console.log("Message from robot:", event.data);
        setChatLog((prev) => [...prev, "Robot: " + event.data]);
      };

      channel.onclose = () => {
        console.log("DataChannel closed");
      };
    };

    pc.addTransceiver("video", { direction: "recvonly" });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

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
      alert("DataChannel not open yet");
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Robot Viewer (WebRTC + DataChannel)</h2>

      <button onClick={startStream} disabled={!socketConnected || !robotReady}>
        Start Stream & Chat
      </button>

      <div style={{ marginTop: 20 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls={false}
          width="500"
          height="400"
          style={{ border: "2px solid black" }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Chat with Robot</h3>
        <div
          style={{
            height: 150,
            overflowY: "scroll",
            background: "#eee",
            padding: 10,
            border: "1px solid #ccc",
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
          style={{ marginTop: 10, width: 300 }}
        />
        <button onClick={sendMessage} style={{ marginLeft: 10 }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default App;

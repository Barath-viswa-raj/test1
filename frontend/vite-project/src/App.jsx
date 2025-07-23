import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER_URL = "http://192.168.1.4:9010";

function App() {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const [robotReady, setRobotReady] = useState(false);

  useEffect(() => {
    pcRef.current = new RTCPeerConnection();
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
      console.log(" Track received");
      videoRef.current.srcObject = event.streams[0];
    };
  }, []);

  const startStream = async () => {
    if (!robotReady) {
      console.warn(" Robot is not connected");
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

  return (
    <div>
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
    </div>
  );
}

export default App;

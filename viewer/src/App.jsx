import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNAL_URL = "https://application-8mai.onrender.com"; // Your signaling server

function App() {
  const socketRef = useRef();
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io(SIGNAL_URL);

    socketRef.current.on("connect", () => {
      console.log("✅ Connected to signaling server");
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected from signaling server");
    });

    // Receive snapshot
    socketRef.current.on("snapshot", (data) => {
      console.log("📸 Snapshot received from robot");
      setSnapshot(`data:image/jpeg;base64,${data.image}`);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const requestSnapshot = () => {
    console.log("📩 Requesting snapshot...");
    socketRef.current.emit("take_snapshot");
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Robot Camera Snapshot Viewer</h2>
      <button onClick={requestSnapshot} style={{ padding: "10px 20px", fontSize: "16px" }}>
        Take Snapshot
      </button>
      <div style={{ marginTop: "2rem" }}>
        {snapshot ? (
          <img src={snapshot} alt="Robot Snapshot" style={{ width: "480px", border: "1px solid #ccc" }} />
        ) : (
          <p>No snapshot yet</p>
        )}
      </div>
    </div>
  );
}

export default App;

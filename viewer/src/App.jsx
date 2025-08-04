import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNAL_URL = "https://application-8mai.onrender.com"; // Your signaling server

function App() {
  const socketRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    socketRef.current = io(SIGNAL_URL);

    socketRef.current.on("connect", () => {
      console.log("✅ Connected to signaling server");
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected from signaling server");
    });

    socketRef.current.on("snapshot", (data) => {
      console.log("📸 Snapshot received from robot");
      if (data && data.image) {
        setSnapshot(`data:image/jpeg;base64,${data.image}`);
      } else {
        console.warn("⚠️ Snapshot data is missing or invalid.");
      }
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const requestSnapshot = () => {
    console.log("📩 Requesting snapshot...");
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("take_snapshot");
    } else {
      console.warn("Socket not connected yet.");
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h2>Robot Camera Snapshot Viewer</h2>
      <button
        onClick={requestSnapshot}
        style={{ padding: "10px 20px", fontSize: "16px" }}
      >
        Take Snapshot
      </button>
      <div style={{ marginTop: "2rem" }}>
        {snapshot ? (
          <img
            src={snapshot}
            alt="Robot Snapshot"
            style={{ width: "480px", border: "1px solid #ccc" }}
          />
        ) : (
          <p>No snapshot yet</p>
        )}
      </div>
    </div>
  );
}

export default App;

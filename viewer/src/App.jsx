import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNAL_URL = "https://application-8mai.onrender.com";

function App() {
  const [messages, setMessages] = useState([]);
  const pcRef = useRef();
  const socketRef = useRef();
  const dcRef = useRef();

  useEffect(() => {
    console.log("[Frontend] Initializing connection...");

    socketRef.current = io(SIGNAL_URL);

    socketRef.current.on("connect", () => {
      console.log("[Frontend] Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("answer", async (data) => {
      console.log("[Frontend] Received answer:", data);
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
        console.log("[Frontend] Remote description set");
      } catch (e) {
        console.error("[Frontend] Error setting remote description:", e);
      }
    });

    socketRef.current.on("candidate", async (data) => {
      console.log("[Frontend] Received candidate:", data);
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        console.log("[Frontend] Candidate added");
      } catch (e) {
        console.error("[Frontend] Error adding candidate:", e);
      }
    });

    const iceServers = [
      { urls: ["stun:bn-turn1.xirsys.com"] },
      {
        urls: [
          "turn:bn-turn1.xirsys.com:80?transport=udp",
          "turn:bn-turn1.xirsys.com:80?transport=tcp",
          "turns:bn-turn1.xirsys.com:443?transport=tcp",
        ],
        username: "Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
        credential: "c0f43e62-4cd4-11f0-aba7-0242ac140004",
      },
    ];

    pcRef.current = new RTCPeerConnection({ iceServers, iceTransportPolicy: "relay" });

    // Create data channel (for sending text)
    const dataChannel = pcRef.current.createDataChannel("chat");
    dcRef.current = dataChannel;

    dataChannel.onopen = () => {
      console.log("[Frontend] Data channel opened");
      addMessage("[System] Data channel open");
    };

    dataChannel.onmessage = (event) => {
      console.log("[Frontend] Received message:", event.data);
      addMessage("Robot: " + event.data);
    };

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("[Frontend] ICE candidate generated:", e.candidate);
        socketRef.current.emit("candidate", {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
        });
      } else {
        console.log("[Frontend] ICE gathering complete");
      }
    };

    pcRef.current.ondatachannel = (event) => {
      console.log("[Frontend] Data channel received:", event.channel.label);
      event.channel.onmessage = (e) => {
        console.log("[Frontend] Received on data channel:", e.data);
        addMessage("Robot: " + e.data);
      };
    };

    return () => {
      console.log("[Frontend] Cleaning up");
      pcRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, []);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const startConnection = async () => {
    try {
      console.log("[Frontend] Starting connection (creating offer)");
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("offer", {
        sdp: offer.sdp,
        type: offer.type,
      });
      console.log("[Frontend] Offer sent");
    } catch (e) {
      console.error("[Frontend] Error starting connection:", e);
    }
  };

  const sendMessage = () => {
    const text = prompt("Enter message to send to robot:");
    if (text && dcRef.current && dcRef.current.readyState === "open") {
      dcRef.current.send(text);
      addMessage("You: " + text);
      console.log("[Frontend] Sent message:", text);
    } else {
      alert("Data channel is not open yet.");
    }
  };

  return (
    <div>
      <h2>Robot Text Feed</h2>
      <button onClick={startConnection}>Start Connection</button>
      <button onClick={sendMessage}>Send Message</button>
      <div style={{ border: "1px solid black", height: "200px", overflowY: "scroll", padding: "10px", marginTop: "10px" }}>
        {messages.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

export default App;

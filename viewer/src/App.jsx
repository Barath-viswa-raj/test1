import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import "./App.css";


const SIGNAL_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || "https://application-8mai.onrender.com";

function App() {
  const pcRef = useRef();
  const socketRef = useRef();
  const dcRef = useRef();
  const videoRef = useRef();
  
  const [status, setStatus] = useState("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState("new");
  const [robotReady, setRobotReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const iceServers = [
        // { urls: ["stun:stun.l.google.com:19302"] },
        // { urls: ["stun:stun1.l.google.com:19302"] },
        // { urls: ["stun:stun2.l.google.com:19302"] },
        
        // { urls: ["stun:bn-turn1.xirsys.com"] },
        
        // {
        //   urls: [
        //     "turn:bn-turn1.xirsys.com:80?transport=udp",
        //     "turn:bn-turn1.xirsys.com:80?transport=tcp",
        //     "turns:bn-turn1.xirsys.com:443?transport=tcp"
        //   ],
        //   username: "Jc0EzhdGBYiCzaKjrC1P7o2mcXTo6TlM_E9wjvXn16Eqs7ntsZaGMeRVAxM4m31rAAAAAGhTqu5CYXJhdGg=",
        //   credential: "c0f43e62-4cd4-11f0-aba7-0242ac140004"
        // },
        {
          urls: ["turn:139.59.66.172:3478"],
          username: "robotcoturn",
          credential: "robot@123"
        }
      ];

      socketRef.current = io(SIGNAL_URL);
      
      socketRef.current.on("connect", () => {
        console.log("✅ Connected to signaling server");
        setStatus("Connected to signaling server");
      });

      socketRef.current.on("robot-ready", () => {
        console.log("✅ Robot is ready");
        setRobotReady(true);
        setStatus("Robot ready - Click 'Start Video Stream' to begin");
      });

      socketRef.current.on("robot-disconnected", () => {
        console.log("❌ Robot disconnected");
        setRobotReady(false);
        setIsConnected(false);
        setStatus("Robot disconnected");
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      });

      socketRef.current.on("answer", async (data) => {
        console.log("✅ Answer received from robot");
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
          setStatus("WebRTC connection established");
        } catch (error) {
          console.error("Error setting remote description:", error);
          setStatus("Error establishing connection");
        }
      });

      socketRef.current.on("candidate", async (data) => {
        console.log("✅ ICE candidate from robot");
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      });

      // Initialize WebRTC peer connection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Create data channel for control messages
      const dc = pc.createDataChannel("control");
      dcRef.current = dc;

      dc.onopen = () => {
        console.log("✅ DataChannel opened");
        setIsConnected(true);
        setStatus("Connected - Video streaming active");
      };

      dc.onclose = () => {
        console.log("❌ DataChannel closed");
        setIsConnected(false);
        setStatus("DataChannel closed");
      };

      dc.onmessage = (e) => {
        console.log("📩 Message from robot:", e.data);
      };

      // Handle ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log("📤 Sending ICE candidate");
          socketRef.current.emit("candidate", {
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        setConnectionState(pc.connectionState);
        
        switch (pc.connectionState) {
          case "connecting":
            setStatus("Connecting to robot...");
            break;
          case "connected":
            setStatus("Connected - Video streaming active");
            setIsConnected(true);
            break;
          case "disconnected":
            setStatus("Disconnected from robot");
            setIsConnected(false);
            break;
          case "failed":
            setStatus("Connection failed");
            setIsConnected(false);
            break;
          case "closed":
            setStatus("Connection closed");
            setIsConnected(false);
            break;
        }
      };

      // Handle incoming video stream
      pc.ontrack = (event) => {
        console.log("✅ Received remote video track");
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          setStatus("Video stream received");
        }
      };
    };

    init();

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const startVideoStream = async () => {
    if (!robotReady) {
      alert("Robot is not ready. Please wait for the robot to connect.");
      return;
    }

    try {
      setStatus("Starting video stream...");
      const pc = pcRef.current;
      
      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      
      await pc.setLocalDescription(offer);
      
      // Send offer to robot
      socketRef.current.emit("offer", {
        sdp: offer.sdp,
        type: offer.type
      });
      
      console.log("📤 Offer sent to robot");
      setStatus("Offer sent, waiting for response...");
    } catch (error) {
      console.error("Error starting video stream:", error);
      setStatus("Error starting video stream");
    }
  };

  const stopVideoStream = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnected(false);
    setStatus("Video stream stopped");
    
    // Reinitialize peer connection for next session
    window.location.reload();
  };

  const toggleVideo = () => {
    if (dcRef.current?.readyState === "open") {
      const command = isVideoEnabled ? "stop-video" : "start-video";
      dcRef.current.send(command);
      setIsVideoEnabled(!isVideoEnabled);
      
      if (videoRef.current) {
        videoRef.current.style.display = isVideoEnabled ? "none" : "block";
      }
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (videoRef.current) {
      videoRef.current.muted = isAudioEnabled;
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "#4CAF50";
      case "connecting":
        return "#FF9800";
      case "failed":
      case "disconnected":
      case "closed":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>WebRTC Video Streaming</h1>
        <div className="status-indicator">
          <div 
            className="status-dot" 
            style={{ backgroundColor: getStatusColor() }}
          ></div>
          <span className="status-text">{status}</span>
        </div>
      </div>

      <div className="main-content">
        <div className="video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={!isAudioEnabled}
            style={{ display: isVideoEnabled ? "block" : "none" }}
          />
          {!isVideoEnabled && (
            <div className="video-placeholder">
              <p>Video is hidden</p>
            </div>
          )}
        </div>

        <div className="controls">
          <div className="connection-controls">
            <button 
              onClick={startVideoStream} 
              disabled={isConnected || !robotReady}
              className="primary-button"
            >
              {robotReady ? "Start Video Stream" : "Waiting for Robot..."}
            </button>
            <button 
              onClick={stopVideoStream} 
              disabled={!isConnected}
              className="secondary-button"
            >
              Stop Stream
            </button>
          </div>

          <div className="media-controls">
            <button 
              onClick={toggleVideo} 
              disabled={!isConnected}
              className={`media-button ${isVideoEnabled ? "active" : "inactive"}`}
            >
              {isVideoEnabled ? "🎥 Hide Video" : "🎥 Show Video"}
            </button>
            <button 
              onClick={toggleAudio} 
              disabled={!isConnected}
              className={`media-button ${isAudioEnabled ? "active" : "inactive"}`}
            >
              {isAudioEnabled ? "🔊 Mute Audio" : "🔇 Unmute Audio"}
            </button>
          </div>
        </div>

        <div className="info-panel">
          <h3>Connection Info</h3>
          <div className="info-item">
            <strong>Robot Status:</strong> {robotReady ? "Ready" : "Not Connected"}
          </div>
          <div className="info-item">
            <strong>WebRTC State:</strong> {connectionState}
          </div>
          <div className="info-item">
            <strong>Video:</strong> {isVideoEnabled ? "Enabled" : "Disabled"}
          </div>
          <div className="info-item">
            <strong>Audio:</strong> {isAudioEnabled ? "Enabled" : "Muted"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
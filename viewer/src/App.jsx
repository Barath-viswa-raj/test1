import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

const Viewer = () => {
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);

  useEffect(() => {
    const startViewer = async () => {
      socketRef.current = io("https://application-8mai.onrender.com");

      socketRef.current.on("connect", async () => {
        console.log("✅ Connected to signaling server");

        peerConnectionRef.current = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        });

        const pc = peerConnectionRef.current;

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("📨 Sending ICE candidate to robot");
            socketRef.current.emit("ice-candidate", {
              to: "robot",
              candidate: event.candidate,
            });
          }
        };

        pc.ontrack = (event) => {
          const stream = event.streams[0];
          console.log("🎥 Received stream from robot:", stream);
          console.log("🎞️ Tracks:", stream.getTracks());

          if (videoRef.current) {
            videoRef.current.srcObject = stream;

            videoRef.current.onloadedmetadata = () => {
              videoRef.current
                .play()
                .then(() => console.log("▶️ Video playing"))
                .catch((err) =>
                  console.error("🚫 Error playing video:", err)
                );
            };
          }
        };

        pc.addTransceiver("video", { direction: "recvonly" });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        console.log("📤 Sending offer to robot...");
        socketRef.current.emit("offer", {
          to: "robot",
          offer: offer,
        });
      });

      socketRef.current.on("answer", async ({ answer }) => {
        console.log("📥 Received answer from robot");
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socketRef.current.on("ice-candidate", async ({ candidate }) => {
        console.log("📥 Received ICE candidate from robot");
        const pc = peerConnectionRef.current;
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.error("🚫 Error adding received ICE candidate:", e);
        }
      });

      socketRef.current.on("robot-disconnected", () => {
        console.warn("❌ Robot disconnected");
      });

      return () => {
        socketRef.current?.disconnect();
        peerConnectionRef.current?.close();
      };
    };

    startViewer();

    // Cleanup on unmount
    return () => {
      socketRef.current?.disconnect();
      peerConnectionRef.current?.close();
    };
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h2>📡 Viewer Page</h2>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "80%", maxWidth: "720px", border: "2px solid black" }}
      />
    </div>
  );
};

export default Viewer;

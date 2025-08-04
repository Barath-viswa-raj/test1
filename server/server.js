const { Server } = require("socket.io");

const PORT = process.env.PORT || 9010;

const io = new Server(PORT, {
  cors: {
    origin: [
      "http://localhost:5173",           // Local development
      "http://localhost:3000",           // Alternative local port
      "https://your-app-name.vercel.app", // Your Vercel deployment
      "https://application-8mai.onrender.com" // Your current deployment
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

let robotSocket = null;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register-robot", () => {
    console.log("Robot registered:", socket.id);
    robotSocket = socket;
    socket.broadcast.emit("robot-ready");
  });

  socket.on("offer", (data) => {
    console.log("Offer from frontend -> robot");
    if (robotSocket) {
      robotSocket.emit("offer", data);
    }
  });

  socket.on("answer", (data) => {
    console.log("Answer from robot -> frontend");
    socket.broadcast.emit("answer", data);
  });

  socket.on("candidate", (data) => {
    console.log("ICE candidate received, forwarding...");
    socket.broadcast.emit("candidate", data);
  });

  socket.on("disconnect", () => {
    if (socket === robotSocket) {
      console.log("Robot disconnected");
      robotSocket = null;
      io.emit("robot-disconnected");
    } else {
      console.log("Frontend client disconnected:", socket.id);
    }
  });
});

console.log(`Signaling server running on port ${PORT}`); 
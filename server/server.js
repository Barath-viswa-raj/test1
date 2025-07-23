const { Server } = require("socket.io");

const io = new Server(9010, {
  cors: {
    origin: "*",
  },
});

let robotSocket = null;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register-robot", () => {
    console.log("Robot registered:", socket.id);
    robotSocket = socket;
    io.emit("robot-ready");
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

  socket.on("disconnect", () => {
    if (socket === robotSocket) {
      console.log(" Robot disconnected");
      robotSocket = null;
    }
  });
});

console.log("Signaling server running on port 9010");

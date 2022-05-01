require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

/* DB MODELS */

/* ---------------------------------- */

/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var socket = require("socket.io");
const RoomModel = require("./db/roomSchema");
var cors = require('cors')

const authRoutes = require("./src/route/authRoutes");
const roomRoutes = require("./src/route/roomRoutes");

/* ---------------------------------- */

const app = express();
const PORT = process.env.PORT || 5001;
const uri = process.env.MONGO_URL || "mongodb+srv://word-chain:b0LRFzOfjbCoXkVO@cluster0.gisn7.mongodb.net/word-chain?retryWrites=true&w=majority";
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
/* Disable Cors */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

/* DB connection */
console.log(uri);
mongoose.connect(uri, {
  useNewUrlParser: true,
});
/* ---------------------------------- */

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use(authRoutes);
app.use(roomRoutes);

var server = app.listen(PORT, () => {
  console.log(PORT, "Sunucu çalışıyor...");
});

const io = socket(server, {cors: {origin: "*"}});

io.on("connection", function (socket) {
  console.log("New user Connected");

  socket.on("joinRoom", async function (data) {
    socket.join(data.roomId);
    socket.broadcast.to(data.roomId).emit("join", {
      ...data,
    });
    // TODO: Find next user Id and send with data : DONE
    // TODO: Add words to DB
    socket.on("gameMessage", async function (message) {

      switch (message.action_type) {
        case "MESSAGE":
          try {
            const room = await RoomModel.findOneAndUpdate(
              { roomId: message.roomId },
              { $push: { words: message.message } },
            );
            const userList = [...room.users];

            const clearUserList = userList.filter(user => !user.isEliminated);

            const userIdx = clearUserList.findIndex(user => user.id == message.message.ownerId);

            let nextUserId = null;

            if (userIdx == clearUserList.length - 1) {
              nextUserId = clearUserList[0].id
            } else {
              nextUserId = clearUserList[userIdx + 1].id
            }

            io.in(message.roomId).emit("gameMessage", {
              message,
              nextUserId
            });
          } catch (error) {
            console.log(error)
          }
          break;
      }
    });

    // Leave Room
    socket.on("leave", async function (message) {
      socket.broadcast.to(data.roomId).emit("leave", {
        message,
      });
      socket.leave(message.roomId);
    });

    // Game Start 
    socket.on("start", async function (message) {
      io.in(data.roomId).emit("start", { message });
    });


    // User Eliminated
    socket.on("eliminate", async function (message) {
      console.log(message)
      io.in(data.roomId).emit("eliminate", { message });
    });

    // End Of The Game
    socket.on("gameFinish", async function (message) {
      io.in(data.roomId).emit("gameFinish", { message });
    });

    // Restart Game
    socket.on("restart", async function (message) {
      io.in(data.roomId).emit("restart", { message });
    });
  });
});

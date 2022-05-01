require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

/* DB MODELS */

/* ---------------------------------- */

/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var socket = require("socket.io");
const RoomModel = require("./db/roomSchema");

const authRoutes = require("./src/route/authRoutes");
const roomRoutes = require("./src/route/roomRoutes");

/* ---------------------------------- */

const app = express();
const PORT = process.env.PORT || 3001;
const uri = process.env.MONGO_URL || "mongodb://localhost:27017/wordChainDev";

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
    console.log({ data });
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
            let nextUserId = null;
            const currentUserIdx = room.users.findIndex(user => user.id == message.message.ownerId);

            if (currentUserIdx == room.users.length - 1) {
              nextUserId = room.users[0].id
            } else {
              nextUserId = room.users[currentUserIdx + 1].id
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
      console.log(message);
      socket.broadcast.to(data.roomId).emit("leave", {
        message,
      });
      socket.leave(message.roomId);
    });

    // Game Start
    socket.on("gameStart", async function () {
      socket.broadcast.to(data.roomId).emit("start", {
        status: "started",
      });
    });

    // User Eliminated
    socket.on("eliminate", async function (message) {
      socket.broadcast.to(data.roomId).emit("eliminate", { message });
    });

    // End Of The Game
    socket.on("gameFinish", async function (message) {
      socket.broadcast.to(data.roomId).emit("gameFinish", { message });
    });

    // Restart Game
    socket.on("restart", async function (message) {
      socket.broadcast.to(data.roomId).emit("restart", { message });
    });
  });
});

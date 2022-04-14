require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

/* DB MODELS */

/* ---------------------------------- */

/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var socket = require("socket.io");

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

const io = socket(server);

io.on("connection", function (socket) {
  console.log("New user Connected");

  socket.on("joinRoom", async function (data) {
    socket.join(data.roomId);
    socket.broadcast.to(data.roomId).emit("join", {
      ...data,
    });
    // TODO: Find next user Id and send with data
    socket.on("gameMessage", async function (message) {
      switch (message.action_type) {
        case "MESSAGE":
          io.in(message.roomId).emit("gameMessage", {
            message,
            nextUserId: 1231,
          });
          break;
      }
    });
    socket.on("leave", async function (message) {
      socket.broadcast.to(data.roomId).emit("leave", {
        message,
      });
      socket.leave(message.roomId);
    });
  });
});
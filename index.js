require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

/* DB MODELS */
const RoomModel = require("./db/roomSchema");

/* ---------------------------------- */

/* Imports */
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
/* ---------------------------------- */

const app = express();
const PORT = process.env.PORT || 3001;

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
const uri = process.env.MONGO_URL;
console.log(uri);
mongoose.connect(uri, {
  useNewUrlParser: true,
});
/* ---------------------------------- */

app.post("/createRoom", (req, res) => {
  console.log(req.body);
  const { roomAvatarId, userInfo, roomSize, roomName, isPublic } = req.body;

  const room = {
    roomId: uuidv4(),
    createDate: Date.now(),
    roomAvatarId,
    ownerId: userInfo.id,
    users: [
      {
        name: userInfo.name,
        id: userInfo.id,
        isEliminated: false,
        language: userInfo.lang,
        userAvatarId: userInfo.avatarId,
      },
    ],
    roomSize,
    roomName,
    isPublic,
  };
  RoomModel.create(room, (err) => {
    if (err) {
      console.log(err);
      res.send(err);
    }
    res.statusCode = 200;
    res.statusMessage = "Success";
    res.send({ status: res.statusCode, message: res.statusMessage });
  });
});

app.get("/listRooms/", (req, res) => {
  RoomModel.find({ isActive: true, isPublic: true }, (err, rooms) => {
    var roomMap = {};
    rooms.forEach((room) => {
      roomMap = {
        roomId: room.roomId,
        roomAvatarId: room.roomAvatarId,
        roomName: room.roomName,
        roomStatus: room.isStarted,
        roomSize: room.roomSize,
      };
    });
    res.send(roomMap);
  });
});

app.post("/joinRoom", function (req, res) {
  const { roomId, userInfo } = req.body;

  RoomModel.findOne({ roomId: roomId }, (err, room) => {
    if (err) {
      console.log(err);
      res.send(err);
    }

    var user = {
      id: userInfo.id,
      name: userInfo.name,
      isEliminated: false,
      language: userInfo.lang,
      userAvatarId: userInfo.avatarId,
    };
    const searchFindUser = (element) => element.id == user.id;
    if (room.blockedUsers.findIndex(searchFindUser) != -1) {
      res.send("User blocked.");
      return;
    }
    console.log(room.roomSize);
    console.log(room.users.length);
    if (room.users.length < room.roomSize) {
      room.users.push(user);
      room.save((err, response) => {
        if (err) res.send(err);
        res.statusCode = 200;
        res.statusMessage = "Success";
        res.send({ status: res.statusCode, message: res.statusMessage });
      });
    } else {
      res.statusCode = 400;
      res.statusMessage = "Failed";
      res.send({ status: res.statusCode, message: res.statusMessage });
    }
  });
});

app.listen(PORT, () => {
  console.log(PORT, "Sunucu çalışıyor...");
});

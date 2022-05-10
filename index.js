require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

/* DB MODELS */

/* ---------------------------------- */

/* Imports */
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
var socket = require("socket.io");
const RoomModel = require("./db/roomSchema");
const { v4: uuidv4 } = require("uuid");
var cors = require("cors");

const authRoutes = require("./src/route/authRoutes");
const roomRoutes = require("./src/route/roomRoutes");

/* ---------------------------------- */

const app = express();
const PORT = process.env.PORT || 5001;
const uri =
  process.env.MONGO_URL ||
  "mongodb+srv://word-chain:b0LRFzOfjbCoXkVO@cluster0.gisn7.mongodb.net/word-chain?retryWrites=true&w=majority";
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

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(authRoutes);
app.use(roomRoutes);

var server = app.listen(PORT, () => {
  console.log(PORT, "Sunucu çalışıyor...");
});

const io = socket(server, { cors: { origin: "*" } });

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
              { $push: { words: message.message } }
            );
            const idxOfUser = room.users.findIndex(
              (user) => user.id == message.message.ownerId
            );
            const pointOfWord = message.message?.word?.length || 0;
            room.users[idxOfUser].point = pointOfWord;
            await room.save();
            console.log(message.message);
            const userList = [...room.users];

            const clearUserList = userList.filter((user) => !user.isEliminated);

            const userIdx = clearUserList.findIndex(
              (user) => user.id == message.message.ownerId
            );

            let nextUserId = null;

            if (userIdx == clearUserList.length - 1) {
              nextUserId = clearUserList[0].id;
            } else {
              nextUserId = clearUserList[userIdx + 1].id;
            }

            io.in(message.roomId).emit("gameMessage", {
              message,
              nextUserId,
              point: pointOfWord,
              userList,
            });
          } catch (error) {
            console.log(error);
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
      console.log(message);
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

  socket.on("reconnect", async function (data) {
    try {
      const room = await RoomModel.findOne({
        roomId: data.roomId,
      });
      if (!room) {
        socket.emit("notJoined", { message: "RoomIsNotExist" });
        return true;
      }
      if (room.users.length == room.roomSize) {
        socket.emit("notJoined", { message: "RoomFull" });
        return true;
      }
      socket.emit("room", room);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("quickJoin", async function (data) {
    try {
      const rooms = await RoomModel.find({
        isActive: true,
        isPublic: true,
        isStarted: false,
      }).exec();
      const avaibleRoom = rooms?.find(
        (room) => room.users.length < room.roomSize
      );

      if (avaibleRoom) {
        const user = {
          id: data.user.id,
          name: data.user.name,
          isEliminated: false,
          language: data.user.language,
          userAvatarId: data.user.userAvatarId,
        };

        await avaibleRoom.users.push(user);
        await avaibleRoom.save(() => {
          socket.emit("room", avaibleRoom);
        });
      } else {
        try {
          const roomId = uuidv4();
          const newRoom = {
            roomId,
            createDate: Date.now(),
            roomAvatarId: "1",
            ownerId: data.user.id,
            currentUserTurn: data.user.id,
            users: [
              {
                name: data.user.name,
                id: data.user.id,
                isEliminated: false,
                language: data.user.language,
                userAvatarId: data.user.userAvatarId,
                point: 0,
              },
            ],
            words: [],
            roomSize: 8,
            roomName: `${data.user.name}'s Room`,
            isPublic: true,
          };

          await RoomModel.create(newRoom);
          socket.emit("room", newRoom);
        } catch (err) {
          console.log({ err, message: "creatingRoom-quickJoin" });
        }
      }
    } catch (err) {
      console.log({ err, message: "creatingRoom-quickJoin" });
    }
  });

  socket.on("join", async function (data) {
    const room = await RoomModel.findOne({ roomId: data.roomId });
    try {
      if (!room) return true;
      if (room.users.length == room.roomSize) {
        socket.emit("notJoined", { message: "RoomFull" });
        return true;
      }
      if (room.isStarted) {
        socket.emit("notJoined", { message: "Started" });
        return true;
      }
      room.users.push(data.user);
      room.save();
      socket.join(data.roomId);
      socket.broadcast.to(data.roomId).emit("join", data.user);
      socket.emit("room", room);
    } catch (error) {
      console.log(error);
    }

    // Game Start
    socket.on("start", async function () {
      if (room.ownerId == data.user.id) {
        room.isStarted = true;
        room.save();
        io.in(data.roomId).emit("start", true);
      }
    });

    // Time up
    socket.on("timeUp", async function () {
      room.users = room.users.map((user) => ({
        ...user,
        isEliminate: user.id == data.user.id ? true : user.isEliminate,
      }));
      room.save();
      const clearUserList = room.users.filter((user) => !user.isEliminated);

      io.in(data.roomId).emit("eliminate", data.user);

      if (clearUserList.length > 1) {
        const index = room.users.findIndex((user) => user.id === 2);
        const nextUser = room.users
          .slice(index + 1, room.users.length)
          .find((user) => !user.isElimated);
        if (nextUser) {
          room.currentUserTurn = nextUser.id;
          io.in(data.roomId).emit("turn", nextUser.id);
        } else {
          const nextUserInfoFromBegin = room.users.find(
            (user) => !user.isElimated
          );
          room.currentUserTurn = nextUserInfoFromBegin.id;
          io.in(data.roomId).emit("turn", nextUserInfoFromBegin.id);
        }
      } else {
        const winner = clearUserList[0];
        const newRoomIdForSave = uuidv4();
        const currentRoomId = room.roomId;
        room.roomId = newRoomIdForSave;
        room.isActive = false;
        room.winner = winner;
        io.in(data.roomId).emit("winner", winner);

        await room.save();

        const newUser = room.users.map((user) => ({
          ...user,
          isEliminated: false,
          point: 0,
        }));

        const newRoom = {
          roomId: currentRoomId,
          createDate: Date.now(),
          roomAvatarId: room.roomAvatarId,
          ownerId: room.ownerId,
          currentUserTurn: room.ownerId,
          blockedUsers: [],
          words: [],
          winner: [],
          users: newUser,
          roomSize: room.roomSize,
          roomName: room.roomName,
          isPublic: room.isPublic,
          isStarted: false,
        };
        RoomModel.create(newRoom, () => {
          socket.broadcast.to(data.roomId).emit("finish", newRoom);
        });
      }
    });

    // Leave the Game
    socket.on("leave", async function () {
      const newUserList = room.users.filter((user) => user.id != data.user.id);
      room.users = newUserList;
      const clearUserList = newUserList.filter((user) => !user.isEliminated);
      //If owner leave the room make new owner first person of user list after old owner kick from list
      if (room.ownerId == data.user.id) {
        room.ownerId = room.users[0].id;
      }
      // Check If there is more than 2 people not eliminated and also check if current turn user leave the room send a next userid for turn;
      // If 1 person left in the game make it winner! And save this game then create new room;
      if (clearUserList.length > 1) {
        if (room.currentUserTurn == data.user.id) {
          const index = room.users.findIndex((user) => user.id === 2);
          const nextUser = room.users
            .slice(index + 1, room.users.length)
            .find((user) => !user.isElimated);
          if (nextUser) {
            room.currentUserTurn = nextUser.id;
            io.in(data.roomId).emit("turn", nextUser.id);
          } else {
            const nextUserInfoFromBegin = room.users.find(
              (user) => !user.isElimated
            );
            room.currentUserTurn = nextUserInfoFromBegin.id;
            io.in(data.roomId).emit("turn", nextUserInfoFromBegin.id);
          }
        }
        socket.broadcast.to(data.roomId).emit("leave", data.user.id);
        room.save();
      } else {
        const winner = clearUserList[0];
        const newRoomIdForSave = uuidv4();
        const currentRoomId = room.roomId;
        room.roomId = newRoomIdForSave;
        room.isActive = false;
        room.winner = winner;
        io.in(data.roomId).emit("winner", winner);

        await room.save();

        const newUser = room.users.map((user) => ({
          ...user,
          isEliminated: false,
          point: 0,
        }));

        const newRoom = {
          roomId: currentRoomId,
          createDate: Date.now(),
          roomAvatarId: room.roomAvatarId,
          ownerId: room.ownerId,
          currentUserTurn: room.ownerId,
          blockedUsers: [],
          words: [],
          winner: {},
          users: newUser,
          roomSize: room.roomSize,
          roomName: room.roomName,
          isPublic: room.isPublic,
          isStarted: false,
        };
        RoomModel.create(newRoom, () => {
          io.in(data.roomId).emit("finish", newRoom);
        });
      }
    });
  });

  socket.on("createRoom", async function (data) {
    try {
      const newRoomId = uuidv4();
      const users = [];
      users.push(data.user);
      const newRoom = {
        roomId: newRoomId,
        createDate: Date.now(),
        roomAvatarId: data.room.roomAvatarId,
        ownerId: data.user.id,
        currentUserTurn: data.user.id,
        blockedUsers: [],
        words: [],
        winner: {},
        users: users,
        roomSize: data.room.roomSize,
        roomName: data.room.roomName,
        isPublic: data.room.isPublic,
        isStarted: false,
      };
      RoomModel.create(newRoom, () => {
        socket.emit("createdRoom", newRoom);
      });
    } catch (error) {
      console.log(error);
    }
  });
});

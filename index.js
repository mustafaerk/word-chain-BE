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
              { $push: { words: message.message } },
            );
            const idxOfUser = room.users.findIndex(
              (user) => user.id == message.message.ownerId
            );
            const pointOfWord = message.message?.word?.length || 0
            room.users[idxOfUser].point = pointOfWord;
            await room.save();
            console.log(message.message)
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
              nextUserId,
              point: pointOfWord,
              userList
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

  socket.on('join', async function (data) {
    const room = await RoomModel.findOne(
      { roomId: data.roomId },
    );
    try {
      if (room) {
        if (room.users.length < room.roomSize) {
          if (!room.isStarted) {
            room.users.push(data.user);
            room.save();
            socket.join(data.roomId);
            socket.broadcast.to(data.roomId).emit("join", data.user);
            socket.emit('room', room);
          } else {
            socket.emit('notJoined', { message: 'Started' });
          }
        } else {
          socket.emit('notJoined', { message: 'RoomFull' });
        }

      }
    } catch (error) {
      console.log(error)
    }

    // Game Start 
    socket.on("start", async function () {
      if (room.ownerId == data.user.id) {
        room.isStarted = true;
        room.save();
        io.in(data.roomId).emit("start", true);
      }
    });

    // Leave the Game 
    socket.on("leave", async function () {
      const newUserList = room.users.filter(user => user.id != data.user.id);
      room.users = newUserList;
      const clearUserList = newUserList.filter(user => !user.isEliminated)
      //If owner leave the room make new owner first person of user list after old owner kick from list 
      if (room.ownerId == data.user.id) {
        room.ownerId = room.users[0].id;
      }
      // Check If there is more than 2 people not eliminated and also check if current turn user leave the room send a next userid for turn;
      // If 1 person left in the game make it winner! And save this game then create new room; 
      if (clearUserList.length > 1) {
        if (room.currentUserTurn == data.user.id) {
          const index = room.users.findIndex((user) => user.id === 2);
          const nextUser = arr.slice(index + 1, arr.length).find((user) => !user.isElimated);
          if (nextUser) {
            room.currentUserTurn = nextUser.id;
            socket.broadcast.to(data.roomId).emit("turn", nextUser.id);
          }
          else {
            const nextUserInfoFromBegin = room.users.find((user) => !user.isElimated);
            room.currentUserTurn = nextUserInfoFromBegin.id;
            socket.broadcast.to(data.roomId).emit("turn", nextUserInfoFromBegin.id);

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
        socket.broadcast.to(data.roomId).emit("winner’", winner);

        await room.save();

        const newUser = room.users.map((user) => ({ ...user, isEliminated: false, point: 0 }));

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

  })
});

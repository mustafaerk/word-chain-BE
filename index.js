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
  console.log(PORT, "Server is Running...");
});

const io = socket(server, { cors: { origin: "*" } });

io.on("connection", function (socket) {
  console.log("New user Connected");

  socket.on("quickJoin", async function (data) {
    try {
      const rooms = await RoomModel.find({
        isActive: true,
        isPublic: true,
      }).exec();
      const avaibleRoom = rooms?.find(
        (room) => room.users.length < room.roomSize
      );

      if (avaibleRoom) {
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
            users: [],
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
    const handleLeave = async () => {
      try {
        const currentRoom = await RoomModel.findOne({
          roomId: data.roomId,
        }).exec();
        const newUsers = currentRoom.users.map((user) => ({
          ...user,
          isOnline: user.id == data.user.id ? false : user.isOnline,
          isEliminated:
            user.id == data.user.id &&
              currentRoom.isStarted &&
              currentRoom.currentUserTurn == data.user.id
              ? true
              : user.isEliminated,
        }));
        currentRoom.users = newUsers;

        const onlineUserList = newUsers.filter((user) => user.isOnline);

        if (onlineUserList.length == 0) {
          io.socketsLeave(data.roomId);
          currentRoom.isActive = false;
        } else {
          const notEliminatedUsers = onlineUserList.filter(
            (user) => !user.isEliminated
          );
          //If owner leave the currentRoom make new owner first person of user list after old owner kick from list
          if (currentRoom.ownerId == data.user.id) {
            currentRoom.ownerId = notEliminatedUsers[0].id;
            io.in(data.roomId).emit("owner", notEliminatedUsers[0].id);
            if (currentRoom.isStarted == false) {
              io.in(data.roomId).emit("turn", notEliminatedUsers[0].id);
              currentRoom.currentUserTurn = notEliminatedUsers[0].id;
            }
          }

          io.in(data.roomId).emit("leave", data.user.id);
          // Check If there is more than 2 people not eliminated and also check if current turn user leave the currentRoom send a next userid for turn;
          // If 1 person left in the game make it winner! And save this game then create new currentRoom;
          if (currentRoom.isStarted) {
            if (notEliminatedUsers.length > 1) {
              if (currentRoom.currentUserTurn == data.user.id) {
                const index = currentRoom.users.findIndex(
                  (user) => user.id === data.user.id
                );
                const nextUser = currentRoom.users
                  .slice(index + 1, currentRoom.users.length)
                  .find((user) => !user.isEliminated && user.isOnline);

                if (nextUser) {
                  currentRoom.currentUserTurn = nextUser.id;
                  io.in(data.roomId).emit("turn", nextUser.id);
                } else {
                  const nextUserInfoFromBegin = currentRoom.users.find(
                    (user) => !user.isEliminated && user.isOnline
                  );
                  currentRoom.currentUserTurn = nextUserInfoFromBegin.id;
                  io.in(data.roomId).emit("turn", nextUserInfoFromBegin.id);
                }
              }
              await currentRoom.save();

            } else {
              const winner = notEliminatedUsers[0];
              const newRoomIdForSave = uuidv4();
              const currentRoomId = currentRoom.roomId;
              currentRoom.roomId = newRoomIdForSave;
              currentRoom.isActive = false;
              currentRoom.winner = winner;
              io.in(data.roomId).emit("winner", winner);

              const newUser = currentRoom.users.map((user) => ({
                ...user,
                isEliminated: false,
                point: 0,
              }));

              const newRoom = {
                roomId: currentRoomId,
                createDate: Date.now(),
                roomAvatarId: currentRoom.roomAvatarId,
                ownerId: currentRoom.ownerId,
                currentUserTurn: currentRoom.ownerId,
                blockedUsers: [],
                words: [],
                winner: {},
                users: newUser,
                roomSize: currentRoom.roomSize,
                roomName: currentRoom.roomName,
                isPublic: currentRoom.isPublic,
                isStarted: false,
              };

              await currentRoom.save();
              RoomModel.create(newRoom, function (err, createdRoom) {
                if (err) console.error(err);
                else io.in(data.roomId).emit("finish", createdRoom);
              });
            }
          }
        }
        socket.leave(data.roomId);
      } catch (error) {
        console.error(error);
        return;
      }
    };

    socket.on("disconnect", async function () {
      handleLeave();
    });

    try {
      const room = await RoomModel.findOne({
        roomId: data.roomId,
      }).exec();
      const onlineUserList = room.users.filter((user) => user.isOnline);
      if (!room) return true;
      if (onlineUserList?.length == room.roomSize) {
        socket.emit("notJoined", { message: "Room is Full" });
        return true;
      }
      // if (room.isStarted) {
      //   socket.emit("notJoined", { message: "Started" });
      //   return true;
      // }
      const isUserExist = room.users.find((user) => user.id == data.user.id);
      if (isUserExist) {
        let userList = [...room.users];
        if (isUserExist.isOnline) {
          socket.emit("notJoined", { message: "You are already in this room" });
          return true;
        } else {
          const newUsers = userList.map((user) => ({
            ...user,
            isOnline: user.id == data.user.id ? true : user.isOnline,
          }));
          const joinedUser = isUserExist.toObject();

          room.users = newUsers;
          socket.broadcast
            .to(data.roomId)
            .emit("join", { ...joinedUser, isOnline: true });
        }
      } else {
        const user = {
          ...data.user,
          isEliminated: room.isStarted ? true : false,
        };
        room.users.push(user);
        socket.broadcast.to(data.roomId).emit("join", user);
      }
      room.save();
      socket.join(data.roomId);
      socket.emit("room", room);
    } catch (error) {
      console.log(error);
    }

    // Game Start
    socket.on("start", async function () {
      const currentRoom = await RoomModel.findOne({ roomId: data.roomId });
      const onlineUserList = currentRoom?.users.filter(
        (user) => user.isOnline && !user.isEliminated
      );
      if (currentRoom.ownerId == data.user.id && onlineUserList.length > 1) {
        //TODO CHECK USERS LENGTH IF >1 DONE I THINK
        currentRoom.isStarted = true;
        currentRoom.save();
        io.in(data.roomId).emit("start", true);
      }
    });

    //gameMessage Eliminated users can write wtf? Fixed I think
    socket.on("word", async function (word) {
      try {
        const currentRoom = await RoomModel.findOneAndUpdate(
          { roomId: data.roomId },
          { $push: { words: { word, ownerId: data.user.id } } }
        );
        const onlineUserList = currentRoom.users.filter(
          (user) => user.isOnline && !user.isEliminated
        );

        const pointOfWord = word.length || 0;
        io.in(data.roomId).emit("word", {
          word: { word, ownerId: data.user.id },
          pointOfWord,
        });

        const indexOfOwner = onlineUserList.findIndex(
          (user) => user.id === data.user.id
        );

        const nextUser = onlineUserList
          .slice(indexOfOwner + 1, onlineUserList.length)
          .find((user) => !user.isEliminated);

        if (nextUser) {
          currentRoom.currentUserTurn = nextUser.id;
          io.in(data.roomId).emit("turn", nextUser.id);
        } else {
          const nextUserInfoFromBegin = onlineUserList.find(
            (user) => !user.isEliminated
          );
          currentRoom.currentUserTurn = nextUserInfoFromBegin.id;
          io.in(data.roomId).emit("turn", nextUserInfoFromBegin.id);
        }
        await currentRoom.save();
      } catch (error) {
        console.error(error);
        return;
      }
    });

    // Time up
    socket.on("timeUp", async function () {
      try {
        const currentRoom = await RoomModel.findOne({ roomId: data.roomId });
        currentRoom.users = currentRoom.users.map((user) => ({
          ...user,
          isEliminated: user.id == data.user.id ? true : user.isEliminated,
        }));
        await currentRoom.save();
        const clearUserList = currentRoom.users.filter(
          (user) => !user.isEliminated && user.isOnline
        );

        io.in(data.roomId).emit("eliminate", data.user.id);

        if (clearUserList.length > 1) {
          const index = currentRoom.users.findIndex(
            (user) => user.id === data.user.id
          );
          const nextUser = currentRoom.users
            .slice(index + 1, currentRoom.users.length)
            .find((user) => !user.isEliminated);
          if (nextUser) {
            currentRoom.currentUserTurn = nextUser.id;
            io.in(data.roomId).emit("turn", nextUser.id);
          } else {
            const nextUserInfoFromBegin = currentRoom.users.find(
              (user) => !user.isEliminated
            );
            currentRoom.currentUserTurn = nextUserInfoFromBegin.id;
            io.in(data.roomId).emit("turn", nextUserInfoFromBegin.id);
          }
        } else {
          const oldRoom = await RoomModel.findOne({
            roomId: data.roomId,
          }).exec();
          const winner = clearUserList[0];
          const currentRoomId = oldRoom.roomId;

          const newRoomIdForSave = uuidv4();
          oldRoom.roomId = newRoomIdForSave;
          oldRoom.isActive = false;
          const currentUsers = [...oldRoom.users];
          oldRoom.winner = winner;
          io.in(data.roomId).emit("winner", winner);

          await oldRoom.save();
          const newUser = currentUsers.map((user) => {
            return { ...user, isEliminated: false, point: 0 };
          });

          const newRoom = {
            roomId: currentRoomId,
            createDate: Date.now(),
            roomAvatarId: oldRoom.roomAvatarId,
            ownerId: oldRoom.ownerId,
            currentUserTurn: oldRoom.ownerId,
            blockedUsers: [],
            words: [],
            winner: {},
            users: newUser,
            roomSize: oldRoom.roomSize,
            roomName: oldRoom.roomName,
            isPublic: oldRoom.isPublic,
            isStarted: false,
          };

          RoomModel.create(newRoom, function (err, createdRoom) {
            if (err) console.error(err);
            else io.in(data.roomId).emit("finish", createdRoom);
          });
        }
      } catch (error) {
        console.error(error);
        return;
      }
    });

    // Leave the Game Turn not working when someone leaving...
    socket.on("leave", async function () {
      handleLeave();
    });
  });

  socket.on("createRoom", async function (data) {
    try {
      const newRoomId = uuidv4();
      const newRoom = {
        roomId: newRoomId,
        createDate: Date.now(),
        roomAvatarId: data.room.roomAvatarId,
        ownerId: data.user.id,
        currentUserTurn: data.user.id,
        blockedUsers: [],
        words: [],
        winner: {},
        users: [],
        roomSize: data.room.roomSize,
        roomName: data.room.roomName,
        isPublic: data.room.isPublic,
        isStarted: false,
      };
      RoomModel.create(newRoom, function (err, createdRoom) {
        if (err) console.error(err);
        else socket.emit("room", createdRoom);
      });
    } catch (error) {
      console.log(error);
      return;
    }
  });
});

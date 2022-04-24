const { v4: uuidv4 } = require("uuid");

const RoomModel = require("../../db/roomSchema");

module.exports.createRoom_post = async (req, res) => {
  try {
    const { roomAvatarId, userToken, roomSize, roomName, isPublic } = req.body;
    const roomId = uuidv4();
    const room = {
      roomId,
      createDate: Date.now(),
      roomAvatarId,
      ownerId: userToken.id,
      users: [
        {
          name: userToken.name,
          id: userToken.id,
          isEliminated: false,
          language: userToken.language,
          userAvatarId: userToken.avatarId,
        },
      ],
      roomSize,
      roomName,
      isPublic,
    };
    RoomModel.create(room, () => {
      res.statusCode = 200;
      res.statusMessage = "Success";
      res.send({ status: res.statusCode, message: res.statusMessage });
    });
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.listRoom_get = async (req, res) => {
  try {
    RoomModel.find({ isActive: true, isPublic: true }, (err, rooms) => {
      const newRoomList = rooms.map((room) => {
        {
          return {
            currentUserLength: room.users.length,
            roomId: room.roomId,
            roomAvatarId: room.roomAvatarId,
            point: room.point,
            roomSize: room.roomSize,
            roomName: room.roomName,
            isStarted: room.isStarted,
          };
        }
      });
      res.send(newRoomList);
    }).select({
      createDate: 0,
      _id: 0,
      isPublic: 0,
      isActive: 0,
      blockedUsers: 0,
      words: 0,
      __v: 0,
      ownerId: 0,
      winner: 0,
    });
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.joinRoom_post = async (req, res) => {
  try {
    const { roomId, userToken } = req.body;
    RoomModel.findOne({ roomId: roomId }, (err, room) => {
      if (room) {
        const user = {
          id: userToken.id,
          name: userToken.name,
          isEliminated: false,
          language: userToken.language,
          userAvatarId: userToken.avatarId,
        };
        const searchFindUser = (element) => element.id == user.id;

        if (room.blockedUsers.findIndex(searchFindUser) != -1) {
          res.send("User blocked.");
          return;
        }

        if (room.users.length < room.roomSize) {
          room.users.push(user);
          room.save(() => {
            res.statusCode = 200;
            res.statusMessage = "Success";
            res.send({ status: res.statusCode, message: res.statusMessage, data: { room } });
          });
        } else {
          res.statusCode = 400;
          res.statusMessage = "Room is Full";
          res.send({ status: res.statusCode, message: res.statusMessage });
        }
      }
      else {
        res.statusCode = 400;
        res.statusMessage = "Room is Full";
        res.send({ status: res.statusCode, message: res.statusMessage });
      }
    });
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.leaveRoom_post = async (req, res) => {
  try {
    const { roomId, userToken } = req.body;
    RoomModel.findOne({ roomId: roomId }, (err, room) => {
      const searchFindUser = (element) => element.id == userToken.id;
      if (room.users.findIndex(searchFindUser) != -1) {
        room.users = room.users.filter((item) => item.id !== userToken.id);
        if (room.users.length == 0) {
          room.isActive = false;
        }
        room.save(() => {
          res.statusCode = 200;
          res.statusMessage = "Success";
          res.send({ status: res.statusCode, message: res.statusMessage });
        });
      }
    });
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.quickjoin_post = async (req, res) => {
  try {
    const userToken = req.body.userToken;
    const room = await RoomModel.findOneAndUpdate({
      isActive: true,
      isPublic: true,
      isStarted: false,
    })
      .where({ $where: "this.users.length < this.roomSize" })
      .exec();
    if (room) {
      const user = {
        id: userToken.id,
        name: userToken.name,
        isEliminated: false,
        language: userToken.language,
        userAvatarId: userToken.avatarId,
      };
      await room.users.push(user);
      await room.save(() => {
        res.statusCode = 200;
        res.statusMessage = "Success";
        res.send({
          status: res.statusCode,
          message: res.statusMessage,
          data: { room, type: "joined" },
        });
      });
    } else {
      try {
        const roomId = uuidv4();
        const newRoom = {
          roomId,
          createDate: Date.now(),
          roomAvatarId: "1",
          ownerId: userToken.id,
          users: [
            {
              name: userToken.name,
              id: userToken.id,
              isEliminated: false,
              language: userToken.language,
              userAvatarId: userToken.avatarId,
            },
          ],
          roomSize: 4,
          roomName: `${userToken.name}'s Room`,
          isPublic: true,
        };

        RoomModel.create(newRoom, function (err) {
          if (err) return handleError(err);
          res.statusCode = 200;
          res.statusMessage = "Success";
          res.send({ status: res.statusCode, message: res.statusMessage, data: { room: newRoom, type: "created" } });
        });


      } catch (err) {
        res.statusCode = 400;
        res.send({ status: 400, message: err });
      }
    }
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.startGame_post = async (req, res) => {
  try {
    const { userToken, roomId } = req.body;
    await RoomModel.findOneAndUpdate(
      { roomId: roomId, ownerId: userToken.id },
      { isStarted: true }
    ).exec();
    res.statusCode = 200;
    res.statusMessage = "Success";
    res.send({ status: res.statusCode, message: res.statusMessage });
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.timeUp_post = async (req, res) => {
  try {
    const { userToken, roomId } = req.body;
    const crrRoom = await RoomModel.findOne({ roomId: roomId }).exec();
    const idxOfUser = crrRoom.users.findIndex(
      (user) => user.id == userToken.id
    );
    crrRoom.users[idxOfUser].isEliminated = true;
    const userNotEliminated = crrRoom.users.filter(
      (user) => !user.isEliminated
    );

    if (userNotEliminated.length === 1) {
      const winner = userNotEliminated.find((user) => user.id !== userToken.id);
      const newRoomIdForSave = uuidv4();
      const currentRoomId = crrRoom.roomId;

      crrRoom.roomId = newRoomIdForSave;
      crrRoom.isActive = false;
      await crrRoom.save();

      const newUser = crrRoom.users.map((user) => {
        return { ...user, isEliminated: false };
      });

      const room = {
        roomId: currentRoomId,
        createDate: Date.now(),
        roomAvatarId: crrRoom.roomAvatarId,
        ownerId: crrRoom.ownerId,
        users: newUser,
        roomSize: crrRoom.roomSize,
        roomName: crrRoom.roomName,
        isPublic: crrRoom.isPublic,
      };
      RoomModel.create(room, () => {
        res.statusCode = 200;
        res.statusMessage = "Game Finish";
        res.send({
          status: res.statusCode,
          message: res.statusMessage,
          data: { winner, gameStatus: "finish" },
        });
      });
    } else {
      await crrRoom.save();
      res.statusCode = 200;
      res.statusMessage = "eliminated";
      res.send({
        status: res.statusCode,
        message: res.statusMessage,
        data: { eliminatedUserId: userToken.id, gameStatus: "eliminated" },
      });
    }
  } catch (err) {
    console.log(err);
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.restartGame_post = async (req, res) => {
  try {
    const { userToken, roomId } = req.body;
    const crrRoom = await RoomModel.findOne({ roomId: roomId }).exec();
    const isOwner = crrRoom.ownerId == userToken.id;
    if (isOwner) {
      crrRoom.isStarted = true;
      crrRoom.save(() => {
        res.statusCode = 200;
        res.send({
          data: { message: "restarted" },
          status: 200,
          message: "Success",
        });
      });
    } else {
      res.statusCode = 400;
      res.send({ status: 400, message: "Go to your village!" });
    }
  } catch (err) {
    console.log(err);
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

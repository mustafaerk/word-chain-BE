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
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

module.exports.joinRoom_post = async (req, res) => {
  try {
    const { roomId, userToken } = req.body;
    console.log(roomId, userToken, userToken);
    RoomModel.findOne({ roomId: roomId }, (err, room) => {
      console.log(room);
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
          res.send({ status: res.statusCode, message: res.statusMessage });
        });
      } else {
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
    console.log(userToken);
    console.log(roomId);
    RoomModel.findOne({ roomId: roomId }, (err, room) => {
      console.log(room);
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
    const room = await RoomModel.findOneAndUpdate({ isActive: true, isPublic: true, isStarted: false }).where({ $where: "this.users.length < this.roomSize" }).exec();
  
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
        res.send({ status: res.statusCode, message: res.statusMessage, roomId: room.roomId, type: "joined" });
      });
    } else {
      const roomId = uuidv4();
      const room = {
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
      RoomModel.create(room, () => {
        res.statusCode = 200;
        res.statusMessage = "Success";
        res.send({ status: res.statusCode, message: res.statusMessage });
      });
    }

  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};  
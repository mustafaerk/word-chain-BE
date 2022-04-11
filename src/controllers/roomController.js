const { v4: uuidv4 } = require("uuid");

const RoomModel = require("../../db/roomSchema");

module.exports.createRoom_post = async (req, res) => {
  try {
    const { roomAvatarId, userInfo, roomSize, roomName, isPublic } = req.body;
    const roomId = uuidv4()
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
    const { roomId, userInfo, userToken } = req.body;
    RoomModel.findOne({ roomId: roomId }, (room) => {
      var user = {
        id: userInfo.id,
        name: userInfo.name,
        isEliminated: false,
        language: userInfo.language,
        userAvatarId: userInfo.avatarId,
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
        res.statusMessage = "Failed";
        res.send({ status: res.statusCode, message: res.statusMessage });
      }
    });
  } catch (err) {
    res.statusCode = 400;
    res.send({ status: 400, message: err });
  }
};

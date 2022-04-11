const { v4: uuidv4 } = require("uuid");

const RoomModel = require("../../db/roomSchema");


module.exports.createRoom_post = async (req, res) => {
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
}

module.exports.listRoom_get = async (req, res) => {
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
}

module.exports.joinRoom_post = async (req, res) => {
    const { roomId, userInfo, userToken } = req.body;
    RoomModel.findOne({ roomId: roomId }, (err, room) => {
        if (err) {
            console.log(err);
            res.send(err);
        }

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
}
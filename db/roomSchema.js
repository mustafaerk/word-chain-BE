const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const roomSchema = new Schema({
    createDate: String,
    roomId: String,
    roomAvatarId: Number,
    blockedUsers: [{ name: String, ip: String }],
    users: [{
        name: String, ip: String, isEliminated: Boolean, language: String, userAvatarId: Number
    }],
    words: [{ englishWords: String, userIp: String }],
    winner: { name: String, ip: String },
    point: Number,
    size: Number,
    roomName: String,
    isPublic: Boolean,
    isActive: Boolean,
    isStarted: Boolean
})



const roomModel = mongoose.model("rooms", roomSchema);
module.exports = roomModel;
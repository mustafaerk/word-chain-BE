const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const roomSchema = new Schema({
    createDate: String,
    roomId: String,
    roomAvatarId: Number,
    ownerId: Schema.Types.Mixed,
    currentUserTurn: Schema.Types.Mixed,
    blockedUsers: { type: [{ name: String, id: String }], default: [] },
    users: [{
        name: String, id: String, isEliminated: Boolean, language: String, userAvatarId: Number
    }],
    words: { type: [{ word: String, ownerId: String }], default: [] },
    winner: { type: { name: String, userId: String }, default: {} },
    point: { type: Number, default: 0 },
    roomSize: Number,
    roomName: String,
    isPublic: Boolean,
    isActive: { type: Boolean, default: true },
    isStarted: { type: Boolean, default: false }
})



const roomModel = mongoose.model("rooms", roomSchema);
module.exports = roomModel;
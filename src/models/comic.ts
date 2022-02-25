import mongoose from "mongoose";

const comicSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Comic = mongoose.model("User", comicSchema);

module.exports = { Comic };

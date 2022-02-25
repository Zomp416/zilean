import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Image = mongoose.model("User", imageSchema);

module.exports = Image;

import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Story = mongoose.model("User", storySchema);

module.exports = Story;

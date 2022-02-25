import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    comics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comic" }],
    stories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Story" }],
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    subscriberCount: {
        type: Number,
        default: 0,
    },
    profilePicture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
    },
    comicRatings: [
        {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comic",
            },
            rating: {
                type: Number,
            },
        },
    ],
    storyRatings: [
        {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Story",
            },
            rating: {
                type: Number,
            },
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const User = mongoose.model("User", userSchema);

module.exports = User;

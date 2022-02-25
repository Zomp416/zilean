import { Document, Types, Schema, model } from "mongoose";

export interface IUser extends Document {
    email: string,
    username: string,
    password: string,
    verified: boolean,
    comics: [Types.ObjectId],
    stories: [Types.ObjectId],
    subscriptions: [Types.ObjectId],
    subscriberCount: number,
    profilePicture?: Types.ObjectId,
    comicRatings: [{
        id: Types.ObjectId,
        rating: number
    }],
    storyRatings: [{
        id: Types.ObjectId,
        rating: number
    }],
    createdAt: Date
}

const userSchema = new Schema<IUser>({
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
    comics: [{ type: Schema.Types.ObjectId, ref: "Comic" }],
    stories: [{ type: Schema.Types.ObjectId, ref: "Story" }],
    subscriptions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    subscriberCount: {
        type: Number,
        default: 0,
    },
    profilePicture: {
        type: Schema.Types.ObjectId,
        ref: "Image",
    },
    comicRatings: [
        {
            id: {
                type: Schema.Types.ObjectId,
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
                type: Schema.Types.ObjectId,
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

const User = model<IUser>("User", userSchema);
export default User;

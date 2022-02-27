import { Document, Types, Schema, model } from "mongoose";

export interface IUser extends Document {
    email: string;
    username: string;
    password: string;
    verified: boolean;
    comics: Types.ObjectId[];
    stories: Types.ObjectId[];
    subscriptions: Types.ObjectId[];
    subscriberCount: number;
    profilePicture?: Types.ObjectId;
    comicRatings: {
        id: Types.ObjectId;
        rating: number;
    }[];
    storyRatings: {
        id: Types.ObjectId;
        rating: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
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
            required: true,
        },
        comics: {
            type: [{ type: Schema.Types.ObjectId, ref: "Comic" }],
            required: true,
        },
        stories: {
            type: [{ type: Schema.Types.ObjectId, ref: "Story" }],
            required: true,
        },
        subscriptions: {
            type: [{ type: Schema.Types.ObjectId, ref: "User" }],
            required: true,
        },
        subscriberCount: {
            type: Number,
            default: 0,
        },
        profilePicture: {
            type: Schema.Types.ObjectId,
            ref: "Image",
        },
        comicRatings: {
            type: [
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
            required: true,
        },
        storyRatings: {
            type: [
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
            required: true,
        },
    },
    { timestamps: true }
);

const User = model<IUser>("User", userSchema);
export default User;

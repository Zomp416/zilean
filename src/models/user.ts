import { PaginateModel, Document, Types, Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

export interface IUser extends Document {
    email: string;
    username: string;
    password: string;
    about: string;
    verified: boolean;
    comics: Types.ObjectId[];
    stories: Types.ObjectId[];
    subscriptions: Types.ObjectId[];
    subscriberCount: number;
    profilePicture?: string;
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
        about: {
            type: String, 
            default: "",
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
            type: String,
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

userSchema.plugin(mongoosePaginate);
const User: PaginateModel<IUser> = model<IUser>("User", userSchema) as PaginateModel<IUser>;
export default User;

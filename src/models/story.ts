import { Document, Types, Schema, model } from "mongoose";

export interface IImageProperties {
    image: Types.ObjectId;
}

export interface ITextProperties {
    text: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    fontStyle: string;
    textDecoration: string;
    justifyContent: string;
    alignItems: string;
}

export interface IStory extends Document {
    title: string;
    description?: string;
    tags: string[];
    story: string;
    author: Types.ObjectId;
    views: number;
    ratingTotal: number;
    ratingCount: number;
    comments: {
        text: string;
        author: Types.ObjectId;
    }[];
    coverart?: Types.ObjectId;
    updatedAt: Date;
    createdAt: Date;
    publishedAt?: Date;
}

const storySchema = new Schema<IStory>(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        tags: {
            type: [String],
            default: [],
        },
        story: {
            type: String,
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        ratingTotal: {
            type: Number,
            default: 0,
        },
        ratingCount: {
            type: Number,
            default: 0,
        },
        comments: {
            type: [
                {
                    text: {
                        type: String,
                        required: true,
                    },
                    author: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                    },
                },
            ],
            required: true,
        },
        coverart: {
            type: Schema.Types.ObjectId,
            ref: "Image",
        },
        publishedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

const Story = model<IStory>("Story", storySchema);
export default Story;

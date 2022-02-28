import { Document, Types, Schema, model } from "mongoose";

export interface IStory extends Document {
    uuid: string;
    createdAt: Date;
    title: string, 
    description: string,
    author: Types.ObjectId;
    views: number;
    ratingTotal: number;
    ratingCount: number;
    comments: {
        text: string;
        author: Types.ObjectId;
    }[];
    publishedAt?: Date;
    story: string;
}

const storySchema = new Schema<IStory>({
    uuid:{
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    views: {
        type: Number,
        default: 0,
        required: true,
    },
    ratingTotal:{ 
        type: Number,
        default: 0,
        required: true,
    },
    ratingCount: {
        type: Number,
        default: 0,
        required: true,
    },
    coments: {
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
    publishedAt:{
        type: Date,
    },
    story: {
        type: String,
        required: true,
    },
});

const Story = model<IStory>("Story", storySchema);
export default Story;
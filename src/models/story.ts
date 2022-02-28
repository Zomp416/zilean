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
    publishedAt?: Date; //? = Optional
    story: string;
    tag: string;
}

const storySchema = new Schema<IStory>({
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
    tag: {
        type: [String],
        default: [],
    }
});

const Story = model<IStory>("Story", storySchema);
//const myStory : IStory = new Story();
// myStory.create
export default Story;
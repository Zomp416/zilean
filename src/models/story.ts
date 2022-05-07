import { PaginateModel, Document, Types, Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

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

export interface IChapters {
    chapterName: string;
    text: string;
}

export interface IStory extends Document {
    title: string;
    description?: string;
    tags: string[];
    story: IChapters[];
    author: Types.ObjectId;
    views: number;
    ratingTotal: number;
    ratingCount: number;
    rating: number;
    comments: {
        text: string;
        author: Types.ObjectId;
    }[];
    coverart?: string;
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
            type: [Object],
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
            type: String,
        },
        publishedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

storySchema.plugin(mongoosePaginate);
const Story: PaginateModel<IStory> = model<IStory>("Story", storySchema) as PaginateModel<IStory>;
export default Story;

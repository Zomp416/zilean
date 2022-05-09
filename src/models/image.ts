import { Model, Document, Types, Schema, model } from "mongoose";

export interface IImage extends Document {
    name: string;
    imageURL: string;
    tags: string[];
    searchable: boolean;
    author?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const imageSchema = new Schema<IImage>(
    {
        name: {
            type: String,
            required: true,
        },
        imageURL: {
            type: String,
            required: true,
        },
        tags: {
            type: [String],
            default: [],
            required: true,
        },
        searchable: {
            type: Boolean,
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

const Image: Model<IImage> = model<IImage>("Image", imageSchema);
export default Image;

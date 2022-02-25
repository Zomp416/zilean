import { Document, Types, Schema, model } from "mongoose";

export interface IImage extends Document {
    name: string;
    imageURL: string;
    tags: string[];
    uploadedBy: Types.ObjectId;
    createdAt: Date;
}

const imageSchema = new Schema<IImage>({
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
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Image = model<IImage>("Image", imageSchema);
export default Image;

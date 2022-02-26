import { Document, Types, Schema, model } from "mongoose";

export interface IImage extends Document {
    name: string;
    imageURL: string;
    tags: string[];
    uploadedBy?: Types.ObjectId;
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
        required: true,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
});

const Image = model<IImage>("Image", imageSchema);
export default Image;

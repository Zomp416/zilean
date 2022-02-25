import { Document, Types, Schema, model } from "mongoose";

export interface IImage extends Document {
    createdAt: Date;
}

const imageSchema = new Schema<IImage>({
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Image = model<IImage>("Image", imageSchema);
export default Image;

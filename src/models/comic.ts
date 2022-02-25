import { Document, Types, Schema, model } from "mongoose";

export interface IComic extends Document {
    createdAt: Date
}

const comicSchema = new Schema<IComic>({
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Comic = model<IComic>("Comic", comicSchema);
export default Comic;

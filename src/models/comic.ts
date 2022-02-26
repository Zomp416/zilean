import { Document, Types, Schema, model } from "mongoose";

interface ILayer {
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    xFlip: boolean,
    yFlip: boolean,
}

export interface IImageLayer extends ILayer {
    image: Types.ObjectId,
}

export interface ITextLayer extends ILayer {
    text: string,
    color: string,
    fontSize: string,
    fontWeight: string,
    fontStyle: string,
    textDecoration: string,
    justifyContent: string,
    alignItems: string,
}

export interface IPanelLayer extends ILayer {
    backgroundColor: string,
    borderStyle: string,
    borderWidth: string,
    borderColor: string,
    borderRadius: string
}

export interface IComic extends Document {
    title: string,
    tags: string[],
    published: boolean,
    comicImageURL: string,
    author: Types.ObjectId,
    // Mongoose currently does not support union types :( 
    // Originally planned to do (IImageLayer | ITextLayer | IPanelLayer)[]
    layers: Types.Array<Object>, 
    createdAt: Date;
}

const comicSchema = new Schema<IComic>({
    title: {
        type: String,
        required: true
    },
    tags: {
        type: [String],
        default: [],
        required: true
    },
    published: {
        type: Boolean,
        default: false,
        required: true
    },
    comicImageURL: {
        type: String,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    layers: {
        type: [Object],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Comic = model<IComic>("Comic", comicSchema);
export default Comic;

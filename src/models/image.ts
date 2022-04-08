import { PaginateModel, Document, Types, Schema, model } from "mongoose";
import mongoosePaginate from "mongoose-paginate";

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

imageSchema.plugin(mongoosePaginate);
const Image: PaginateModel<IImage> = model<IImage>("Image", imageSchema) as PaginateModel<IImage>;
export default Image;

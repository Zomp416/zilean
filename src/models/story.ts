import { Document, Types, Schema, model } from "mongoose";

export interface IStory extends Document {
    createdAt: Date
}

const storySchema = new Schema<IStory>({
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Story = model<IStory>("Story", storySchema);
export default Story;

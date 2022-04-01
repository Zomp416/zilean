import crypto from "crypto";
import bcrypt from "bcrypt";
import { Types } from "mongoose";

import User, { IUser } from "../src/models/user";
import Comic from "../src/models/comic";
import Story from "../src/models/story";
import Image from "../src/models/image";

interface IDummyUser extends IUser {
    password_?: string;
}

export const dummyUser = async ({
    session = null,
    verified = true,
}: {
    session?: any;
    verified?: boolean;
} = {}) => {
    const username = crypto.randomBytes(20).toString("hex");
    const email = crypto.randomBytes(20).toString("hex");
    const password = crypto.randomBytes(20).toString("hex");
    const hash = await bcrypt.hash(password, 10);
    const db: IDummyUser = await new User({ username, email, password: hash, verified }).save();
    db.password_ = password;
    if (session) await session.post("/account/login").send({ email, password });
    return db;
};

export const dummyComic = async ({
    userid = new Types.ObjectId(crypto.randomBytes(12)),
    publishedAt = undefined,
}: {
    userid?: Types.ObjectId;
    publishedAt?: Date;
} = {}) => {
    const comic = new Comic({
        title: crypto.randomBytes(20).toString("hex"),
        author: userid,
        publishedAt,
    });
    await comic.save();

    await User.findByIdAndUpdate(userid, { $push: { comics: comic._id } });

    return comic;
};

export const dummyStory = async ({
    userid = new Types.ObjectId(crypto.randomBytes(12)),
    publishedAt = undefined,
}: {
    userid?: Types.ObjectId;
    publishedAt?: Date;
} = {}) => {
    const story = new Story({
        title: crypto.randomBytes(20).toString("hex"),
        author: userid,
        publishedAt,
    });
    await story.save();

    await User.findByIdAndUpdate(userid, { $push: { stories: story._id } });

    return story;
};

export const dummyImage = async ({
    userid = new Types.ObjectId(crypto.randomBytes(12)),
    searchable = true,
}: {
    userid?: Types.ObjectId;
    searchable?: boolean;
} = {}) => {
    const image = new Image({
        name: crypto.randomBytes(20).toString("hex"),
        imageURL: crypto.randomBytes(20).toString("hex"),
        uploadedBy: userid,
        searchable,
    });
    await image.save();

    return image;
};

import assert from "assert";
import { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";

import Comic, { IComic } from "../src/models/comic";
import User, { IUser } from "../src/models/user";
import Image, { IImage } from "../src/models/image";
import Story, { IStory } from "../src/models/story";

describe("basic document operations", function () {
    var mongod: MongoMemoryServer;

    this.beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connect(uri);
    });

    this.beforeEach(async () => {
        await User.deleteMany({});
        await Comic.deleteMany({});
        await Story.deleteMany({});
        await Image.deleteMany({});
    });

    this.afterAll(async () => {
        await mongod.stop();
        disconnect();
    });

    // comic tests
    describe("comic document creation", function () {
        // basic instantiation
        it("should succeed with author and title", async () => {
            let comic: IComic = new Comic({
                title: "Example Title",
                author: new Types.ObjectId(),
            });
            await comic.save();
            assert.notEqual(await Comic.findOne({}), null);
        });
        // required title
        it("should fail without title", async () => {
            await assert.rejects(async () => {
                let comic: IComic = new Comic({
                    author: new Types.ObjectId(),
                });
                await comic.save();
            });
        });
        // required author
        it("should fail without author", async () => {
            await assert.rejects(async () => {
                let comic: IComic = new Comic({
                    title: "Example Title",
                });
                await comic.save();
            });
        });
    });

    // user tests
    describe("user document creation", function () {
        // basic instantiation
        it("should succeed with username password and email", async () => {
            let user: IUser = new User({
                username: "me",
                email: "me@mymail.com",
                password: "12345678",
            });
            await user.save();
            assert.notEqual(await User.findOne({}), null);
        });
        // required username
        it("should fail without username", async () => {
            await assert.rejects(async () => {
                let user: IUser = new User({
                    email: "me@mymail.com",
                    password: "12345678",
                });
                await user.save();
            });
        });
        // required password
        it("should fail without password", async () => {
            await assert.rejects(async () => {
                let user: IUser = new User({
                    username: "me",
                    email: "me@mymail.com",
                });
                await user.save();
            });
        });
        // required email
        it("should fail without email", async () => {
            await assert.rejects(async () => {
                let user: IUser = new User({
                    username: "me",
                    password: "12345678",
                });
                await user.save();
            });
        });
        // unique username
        it("should fail with non-unique username", async () => {
            let user: IUser = new User({
                username: "me",
                email: "me@mymail.com",
                password: "12345678",
            });
            await user.save();
            await assert.rejects(() => {
                user = new User({
                    username: "me",
                    email: "notme@mymail.com",
                    password: "12345678",
                });
                return user.save();
            });
        });
        // unique email
        it("should fail with non-unique email", async () => {
            let user: IUser = new User({
                username: "me",
                email: "me@mymail.com",
                password: "12345678",
            });
            await user.save();
            await assert.rejects(() => {
                user = new User({
                    username: "notme",
                    email: "me@mymail.com",
                    password: "12345678",
                });
                return user.save();
            });
        });
    });

    // image tests
    describe("image document creation", function () {
        // basic instantiation
        it("should succeed with name imageURL and searchable", async () => {
            let image: IImage = new Image({
                name: "myimage",
                imageURL: "pathtoimage.png",
                searchable: true,
            });
            await image.save();
            assert.notEqual(await Image.findOne({}), null);
        });
        // required name
        it("should fail without name", async () => {
            await assert.rejects(async () => {
                let image: IImage = new Image({
                    imageURL: "pathtoimage.png",
                    searchable: true,
                });
                await image.save();
            });
        });
        // required imageURL
        it("should fail without title", async () => {
            await assert.rejects(async () => {
                let image: IImage = new Image({
                    name: "myimage",
                    searchable: true,
                });
                await image.save();
            });
        });
        // required searchable
        it("should fail without searchable", async () => {
            await assert.rejects(async () => {
                let image: IImage = new Image({
                    name: "myimage",
                    imageURL: "pathtoimage.png",
                });
                await image.save();
            });
        });
    });

    // story tests
    describe("story document creation", function () {
        // basic instantiation
        it("should succeed with title author and story", async () => {
            let story: IStory = new Story({
                title: "Example Title",
                author: new Types.ObjectId(),
                story: "<p>Once upon a time</p>",
            });
            await story.save();
            assert.notEqual(await Story.findOne({}), null);
        });
        // required title
        it("should fail without title", async () => {
            await assert.rejects(async () => {
                let story: IStory = new Story({
                    author: new Types.ObjectId(),
                    story: "<p>Once upon a time</p>",
                });
                await story.save();
            });
        });
        // required author
        it("should fail without author", async () => {
            await assert.rejects(async () => {
                let story: IStory = new Story({
                    title: "Example Title",
                    story: "<p>Once upon a time</p>",
                });
                await story.save();
            });
        });
    });
});

import assert from "assert";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Express } from "express";

const request = require("supertest-session");

import { dummyStory, dummyUser } from "../dummy";
import User from "../../src/models/user";
import Story from "../../src/models/story";
import createApp from "../../src/app";

describe("story routes", function () {
    var mongod: MongoMemoryServer;
    var app: Express;

    this.beforeEach(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connect(uri);
        app = createApp(uri, "_");
    });

    this.afterEach(async () => {
        await disconnect();
        await mongod.stop();
    });

    describe("GET /story/:id", function () {
        it("should retrieve a story", async () => {
            const story = await dummyStory();
            const res = await request(app).get(`/story/${story._id}`).expect(200);
            assert.equal(res.body.data._id, story._id);
        });
        it("should error if id is invalid", async () => {
            const story = await dummyStory();
            await Story.deleteMany({});
            const res = await request(app).get(`/story/${story._id}`).expect(400);
            assert.equal(res.body.error, "no story found with given id");
        });
    });

    describe("POST /story", function () {
        it("should create a blank story", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session.post("/story").expect(200);
            assert.equal(res.body.data.author, user._id);
            assert.equal(await Story.countDocuments(), 1);
            assert.equal((await User.findById(user._id).exec())!.stories.length, 1);
            assert.equal((await User.findById(user._id).exec())!.stories[0], res.body.data._id);
        });
        it("should fail if user is not verified", async () => {
            const session = request(app);
            await dummyUser({ session, verified: false });
            const res = await session.post("/story").expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
            assert.equal(await Story.countDocuments(), 0);
        });
        it("should fail if user is not logged in", async () => {
            const res = await request(app).post("/story").expect(401);
            assert.equal(res.body.error, "not logged in");
            assert.equal(await Story.countDocuments(), 0);
        });
    });

    describe("PUT /story/:id", function () {
        it("should update a story", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const story = await dummyStory({ userid: user._id });
            const res = await session
                .put(`/story/${story._id}`)
                .send({ story: { title: "_" } })
                .expect(200);
            assert.equal(res.body.data.title, "_");
            assert.equal(res.body.data._id, story._id);
            assert.equal((await Story.findOne({}).exec())!.title, "_");
        });
        it("should fail if story does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            await Story.deleteMany({});
            const res = await session.put(`/story/${story._id}`).expect(400);
            assert.equal(res.body.error, "no story found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const story = await dummyStory({ userid: user._id });
            const res = await session.put(`/story/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            const res = await session.put(`/story/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
        });
        it("should fail if user is not logged in", async () => {
            const story = await dummyStory();
            const res = await request(app).put(`/story/${story._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
        });
    });

    describe("DEL /story/:id", function () {
        it("should delete a story", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const story = await dummyStory({ userid: user._id });
            const res = await session.delete(`/story/${story._id}`).expect(200);
            assert.equal(res.body.message, "Successfully deleted story.");
            assert.equal(await Story.countDocuments(), 0);
            assert.equal((await User.findById(user._id).exec())!.stories.length, 0);
        });
        it("should fail if story does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            await Story.deleteMany({});
            const res = await session.delete(`/story/${story._id}`).expect(400);
            assert.equal(res.body.error, "no story found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const story = await dummyStory({ userid: user._id });
            const res = await session.delete(`/story/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
            assert.equal(await Story.countDocuments(), 1);
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            const res = await session.delete(`/story/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
            assert.equal(await Story.countDocuments(), 1);
        });
        it("should fail if user is not logged in", async () => {
            const story = await dummyStory();
            const res = await request(app).put(`/story/${story._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
            assert.equal(await Story.countDocuments(), 1);
        });
    });

    describe("GET /story/search", function () {
        it("should find all stories (empty search)", async () => {
            for (let i = 0; i < 5; i++) await dummyStory({ publishedAt: new Date() });
            const res = await request(app).get("/story/search").expect(200);
            assert.equal(res.body.data.length, 5);
        });
        it("should filter by subscriptions", async () => {
            const user = await dummyUser();
            const story = await dummyStory({ userid: user._id, publishedAt: new Date() });
            await dummyStory({ publishedAt: new Date() });
            const session = request(app);
            await dummyUser({ session });
            await session.post("/account/subscribe").send({ subscription: user._id });
            const res1 = await session.get("/story/search?subscriptions=true").expect(200);
            const res2 = await session.get("/story/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 2);
            assert.equal(res1.body.data[0]._id, story._id);
        });
        it("should fail subscription filter when unauthenticated", async () => {
            const res = await request(app).get("/story/search?subscriptions=true").expect(400);
            assert.equal(res.body.error, "Must be logged in to show subscriptions");
        });
        it("should filter by author", async () => {
            const user = await dummyUser();
            const story = await dummyStory({ userid: user._id, publishedAt: new Date() });
            await dummyStory({ publishedAt: new Date() });
            const res1 = await request(app).get(`/story/search?author=${user._id}`).expect(200);
            const res2 = await request(app).get("/story/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 2);
            assert.equal(res1.body.data[0]._id, story._id);
        });
        it("should filter by title regex", async () => {
            const story = await dummyStory({ publishedAt: new Date() });
            await dummyStory({ publishedAt: new Date() });
            const res1 = await request(app).get(`/story/search?value=${story.title}`).expect(200);
            const res2 = await request(app)
                .get(`/story/search?value=${story.title.slice(5, 10)}`)
                .expect(200);
            const res3 = await request(app).get("/story/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 1);
            assert.equal(res3.body.data.length, 2);
            assert.equal(res1.body.data[0]._id, story._id);
            assert.equal(res2.body.data[0]._id, story._id);
        });
        it("should filter by time regex", async () => {
            const now = new Date().getTime();
            await dummyStory({ publishedAt: new Date(now - 366 * 24 * 60 * 60 * 1000) });
            await dummyStory({ publishedAt: new Date(now - 32 * 24 * 60 * 60 * 1000) });
            await dummyStory({ publishedAt: new Date(now - 8 * 24 * 60 * 60 * 1000) });
            await dummyStory({ publishedAt: new Date(now - 25 * 60 * 60 * 1000) });
            await dummyStory({ publishedAt: new Date() });
            const res1 = await request(app).get("/story/search").expect(200);
            const res2 = await request(app).get("/story/search?time=all").expect(200);
            const res3 = await request(app).get("/story/search?time=year").expect(200);
            const res4 = await request(app).get("/story/search?time=month").expect(200);
            const res5 = await request(app).get("/story/search?time=week").expect(200);
            const res6 = await request(app).get("/story/search?time=day").expect(200);
            assert.equal(res1.body.data.length, 5);
            assert.equal(res2.body.data.length, 5);
            assert.equal(res3.body.data.length, 4);
            assert.equal(res4.body.data.length, 3);
            assert.equal(res5.body.data.length, 2);
            assert.equal(res6.body.data.length, 1);
        });
        it("should sort results correctly", async () => {
            for (let i = 0; i < 5; i++) await dummyStory({ publishedAt: new Date() });
            const res = await request(app).get("/story/search?sort=title").expect(200);
            const data = res.body.data;
            assert.equal(data[0].title < data[1].title, true);
            assert.equal(data[1].title < data[2].title, true);
            assert.equal(data[2].title < data[3].title, true);
            assert.equal(data[3].title < data[4].title, true);
        });
        it("should paginate correctly", async () => {
            for (let i = 0; i < 3; i++) await dummyStory({ publishedAt: new Date() });
            const res1 = await request(app).get("/story/search?page=1&limit=2").expect(200);
            const res2 = await request(app).get("/story/search?page=2&limit=2").expect(200);
            const res3 = await request(app).get("/story/search?page=3&limit=2").expect(200);
            assert.equal(res1.body.data.length, 2);
            assert.equal(res2.body.data.length, 1);
            assert.equal(res3.body.data.length, 0);
        });
    });
    describe("PUT /story/publish/:id", function () {
        it("should publish a story", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const story = await dummyStory({ userid: user._id });
            const res = await session.put(`/story/publish/${story._id}`).expect(200);
            assert.equal(res.body.message, "successfully published");
            assert.notEqual((await Story.findOne({}).exec())!.publishedAt, null);
        });
        it("should be idempotent", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const story = await dummyStory({ userid: user._id });
            await session.put(`/story/publish/${story._id}`).expect(200);
            await session.put(`/story/publish/${story._id}`).expect(200);
            assert.notEqual((await Story.findOne({}).exec())!.publishedAt, null);
        });
        it("should fail if story does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            await Story.deleteMany({});
            const res = await session.put(`/story/publish/${story._id}`).expect(400);
            assert.equal(res.body.error, "no story found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const story = await dummyStory({ userid: user._id });
            const res = await session.put(`/story/publish/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            const res = await session.put(`/story/publish/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
        });
        it("should fail if user is not logged in", async () => {
            const story = await dummyStory();
            const res = await request(app).put(`/story/publish/${story._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
        });
    });
    describe("PUT /story/unpublish/:id", function () {
        it("should unpublish a story", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const story = await dummyStory({ userid: user._id, publishedAt: new Date() });
            const res = await session.put(`/story/unpublish/${story._id}`).expect(200);
            assert.equal(res.body.message, "successfully unpublished");
            assert.equal((await Story.findOne({}).exec())!.publishedAt, null);
        });
        it("should be idempotent", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const story = await dummyStory({ userid: user._id });
            await session.put(`/story/unpublish/${story._id}`).expect(200);
            await session.put(`/story/unpublish/${story._id}`).expect(200);
            assert.equal((await Story.findOne({}).exec())!.publishedAt, null);
        });
        it("should fail if story does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            await Story.deleteMany({});
            const res = await session.put(`/story/unpublish/${story._id}`).expect(400);
            assert.equal(res.body.error, "no story found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const story = await dummyStory({ userid: user._id });
            const res = await session.put(`/story/unpublish/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const story = await dummyStory();
            const res = await session.put(`/story/unpublish/${story._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
        });
        it("should fail if user is not logged in", async () => {
            const story = await dummyStory();
            const res = await request(app).put(`/story/unpublish/${story._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
        });
    });
});

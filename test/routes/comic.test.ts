import assert from "assert";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Express } from "express";

const request = require("supertest-session");

import { dummyComic, dummyUser } from "../dummy";
import User from "../../src/models/user";
import Comic from "../../src/models/comic";
import createApp from "../../src/app";

describe("comic routes", function () {
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

    describe("GET /comic/:id", function () {
        it("should retrieve a comic", async () => {
            const comic = await dummyComic();
            const res = await request(app).get(`/comic/${comic._id}`).expect(200);
            assert.equal(res.body.data._id, comic._id);
        });
        it("should error if id is invalid", async () => {
            const comic = await dummyComic();
            await Comic.deleteMany({});
            const res = await request(app).get(`/comic/${comic._id}`).expect(400);
            assert.equal(res.body.error, "no comic found with given id");
        });
    });

    describe("POST /comic", function () {
        it("should create a blank comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session.post("/comic").expect(200);
            assert.equal(res.body.data.author, user._id);
            assert.equal(await Comic.countDocuments(), 1);
            assert.equal((await User.findById(user._id).exec())!.comics.length, 1);
            assert.equal((await User.findById(user._id).exec())!.comics[0], res.body.data._id);
        });
        it("should fail if user is not verified", async () => {
            const session = request(app);
            await dummyUser({ session, verified: false });
            const res = await session.post("/comic").expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
            assert.equal(await Comic.countDocuments(), 0);
        });
        it("should fail if user is not logged in", async () => {
            const res = await request(app).post("/comic").expect(401);
            assert.equal(res.body.error, "not logged in");
            assert.equal(await Comic.countDocuments(), 0);
        });
    });

    describe("PUT /comic/:id", function () {
        it("should update a comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic({ userid: user._id });
            const res = await session
                .put(`/comic/${comic._id}`)
                .send({ comic: { title: "_" } })
                .expect(200);
            assert.equal(res.body.data.title, "_");
            assert.equal(res.body.data._id, comic._id);
            assert.equal((await Comic.findOne({}).exec())!.title, "_");
        });
        it("should fail if comic does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            await Comic.deleteMany({});
            const res = await session.put(`/comic/${comic._id}`).expect(400);
            assert.equal(res.body.error, "no comic found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const comic = await dummyComic({ userid: user._id });
            const res = await session.put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            const res = await session.put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
        });
        it("should fail if user is not logged in", async () => {
            const comic = await dummyComic();
            const res = await request(app).put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
        });
    });

    describe("DEL /comic/:id", function () {
        it("should delete a comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic({ userid: user._id });
            const res = await session.delete(`/comic/${comic._id}`).expect(200);
            assert.equal(res.body.message, "Successfully deleted comic.");
            assert.equal(await Comic.countDocuments(), 0);
            assert.equal((await User.findById(user._id).exec())!.comics.length, 0);
        });
        it("should fail if comic does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            await Comic.deleteMany({});
            const res = await session.delete(`/comic/${comic._id}`).expect(400);
            assert.equal(res.body.error, "no comic found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const comic = await dummyComic({ userid: user._id });
            const res = await session.delete(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
            assert.equal(await Comic.countDocuments(), 1);
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            const res = await session.delete(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
            assert.equal(await Comic.countDocuments(), 1);
        });
        it("should fail if user is not logged in", async () => {
            const comic = await dummyComic();
            const res = await request(app).put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
            assert.equal(await Comic.countDocuments(), 1);
        });
    });

    describe("GET /comic/search", function () {
        it("should find all comics (empty search)", async () => {
            for (let i = 0; i < 5; i++) await dummyComic({ publishedAt: new Date() });
            const res = await request(app).get("/comic/search").expect(200);
            assert.equal(res.body.data.length, 5);
        });
        it("should filter by subscriptions", async () => {
            const user = await dummyUser();
            const comic = await dummyComic({ userid: user._id, publishedAt: new Date() });
            await dummyComic({ publishedAt: new Date() });
            const session = request(app);
            await dummyUser({ session });
            await session.post("/account/subscribe").send({ subscription: user._id });
            const res1 = await session.get("/comic/search?subscriptions=true").expect(200);
            const res2 = await session.get("/comic/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 2);
            assert.equal(res1.body.data[0]._id, comic._id);
        });
        it("should fail subscription filter when unauthenticated", async () => {
            const res = await request(app).get("/comic/search?subscriptions=true").expect(400);
            assert.equal(res.body.error, "Must be logged in to show subscriptions");
        });
        it("should filter by author", async () => {
            const user = await dummyUser();
            const comic = await dummyComic({ userid: user._id, publishedAt: new Date() });
            await dummyComic({ publishedAt: new Date() });
            const res1 = await request(app).get(`/comic/search?author=${user._id}`).expect(200);
            const res2 = await request(app).get("/comic/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 2);
            assert.equal(res1.body.data[0]._id, comic._id);
        });
        it("should filter by title regex", async () => {
            const comic = await dummyComic({ publishedAt: new Date() });
            await dummyComic({ publishedAt: new Date() });
            const res1 = await request(app).get(`/comic/search?value=${comic.title}`).expect(200);
            const res2 = await request(app)
                .get(`/comic/search?value=${comic.title.slice(5, 10)}`)
                .expect(200);
            const res3 = await request(app).get("/comic/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 1);
            assert.equal(res3.body.data.length, 2);
            assert.equal(res1.body.data[0]._id, comic._id);
            assert.equal(res2.body.data[0]._id, comic._id);
        });
        it("should filter by time regex", async () => {
            const now = new Date().getTime();
            await dummyComic({ publishedAt: new Date(now - 366 * 24 * 60 * 60 * 1000) });
            await dummyComic({ publishedAt: new Date(now - 32 * 24 * 60 * 60 * 1000) });
            await dummyComic({ publishedAt: new Date(now - 8 * 24 * 60 * 60 * 1000) });
            await dummyComic({ publishedAt: new Date(now - 25 * 60 * 60 * 1000) });
            await dummyComic({ publishedAt: new Date() });
            const res1 = await request(app).get("/comic/search").expect(200);
            const res2 = await request(app).get("/comic/search?time=all").expect(200);
            const res3 = await request(app).get("/comic/search?time=year").expect(200);
            const res4 = await request(app).get("/comic/search?time=month").expect(200);
            const res5 = await request(app).get("/comic/search?time=week").expect(200);
            const res6 = await request(app).get("/comic/search?time=day").expect(200);
            assert.equal(res1.body.data.length, 5);
            assert.equal(res2.body.data.length, 5);
            assert.equal(res3.body.data.length, 4);
            assert.equal(res4.body.data.length, 3);
            assert.equal(res5.body.data.length, 2);
            assert.equal(res6.body.data.length, 1);
        });
        it("should sort results correctly", async () => {
            for (let i = 0; i < 5; i++) await dummyComic({ publishedAt: new Date() });
            const res = await request(app).get("/comic/search?sort=title").expect(200);
            const data = res.body.data;
            assert.equal(data[0].title < data[1].title, true);
            assert.equal(data[1].title < data[2].title, true);
            assert.equal(data[2].title < data[3].title, true);
            assert.equal(data[3].title < data[4].title, true);
        });
    });
    describe("PUT /comic/publish/:id", function () {
        it("should publish a comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic({ userid: user._id });
            const res = await session.put(`/comic/publish/${comic._id}`).expect(200);
            assert.equal(res.body.message, "successfully published");
            assert.notEqual((await Comic.findOne({}).exec())!.publishedAt, null);
        });
        it("should be idempotent", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic({ userid: user._id });
            await session.put(`/comic/publish/${comic._id}`).expect(200);
            await session.put(`/comic/publish/${comic._id}`).expect(200);
            assert.notEqual((await Comic.findOne({}).exec())!.publishedAt, null);
        });
        it("should fail if comic does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            await Comic.deleteMany({});
            const res = await session.put(`/comic/publish/${comic._id}`).expect(400);
            assert.equal(res.body.error, "no comic found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const comic = await dummyComic({ userid: user._id });
            const res = await session.put(`/comic/publish/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            const res = await session.put(`/comic/publish/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
        });
        it("should fail if user is not logged in", async () => {
            const comic = await dummyComic();
            const res = await request(app).put(`/comic/publish/${comic._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
        });
    });
    describe("PUT /comic/unpublish/:id", function () {
        it("should unpublish a comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic({ userid: user._id, publishedAt: new Date() });
            const res = await session.put(`/comic/unpublish/${comic._id}`).expect(200);
            assert.equal(res.body.message, "successfully unpublished");
            assert.equal((await Comic.findOne({}).exec())!.publishedAt, null);
        });
        it("should be idempotent", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic({ userid: user._id });
            await session.put(`/comic/unpublish/${comic._id}`).expect(200);
            await session.put(`/comic/unpublish/${comic._id}`).expect(200);
            assert.equal((await Comic.findOne({}).exec())!.publishedAt, null);
        });
        it("should fail if comic does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            await Comic.deleteMany({});
            const res = await session.put(`/comic/unpublish/${comic._id}`).expect(400);
            assert.equal(res.body.error, "no comic found with given id");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const comic = await dummyComic({ userid: user._id });
            const res = await session.put(`/comic/unpublish/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be verified to perform requested action");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            const res = await session.put(`/comic/unpublish/${comic._id}`).expect(401);
            assert.equal(res.body.error, "must be the author to modify the selected resource");
        });
        it("should fail if user is not logged in", async () => {
            const comic = await dummyComic();
            const res = await request(app).put(`/comic/unpublish/${comic._id}`).expect(401);
            assert.equal(res.body.error, "not logged in");
        });
    });
});

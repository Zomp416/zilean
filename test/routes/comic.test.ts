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
            assert.equal(res.body.error, "No comic found");
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
            assert.equal(res.body.error, "Must be verified to create a comic.");
            assert.equal(await Comic.countDocuments(), 0);
        });
        it("should fail if user is not logged in", async () => {
            const res = await request(app).post("/comic").expect(401);
            assert.equal(res.body.error, "NOT LOGGED IN");
            assert.equal(await Comic.countDocuments(), 0);
        });
    });

    describe("PUT /comic/:id", function () {
        it("should update a comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic(user._id);
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
            assert.equal(res.body.error, "No comic found");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const comic = await dummyComic(user._id);
            const res = await session.put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "Must be verified to update a comic.");
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            const res = await session.put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "Must be the author to update comic.");
        });
        it("should fail if user is not logged in", async () => {
            const comic = await dummyComic();
            const res = await request(app).put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "NOT LOGGED IN");
        });
    });

    describe("DEL /comic/:id", function () {
        it("should delete a comic", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const comic = await dummyComic(user._id);
            const res = await session.delete(`/comic/${comic._id}`).expect(200);
            assert.equal(res.body.message, "Successfully deleted comic.");
            assert.equal(await Comic.countDocuments(), 0);
        });
        it("should fail if comic does not exist", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            await Comic.deleteMany({});
            const res = await session.delete(`/comic/${comic._id}`).expect(400);
            assert.equal(res.body.error, "No comic found");
        });
        it("should fail if user is unverified", async () => {
            const session = request(app);
            const user = await dummyUser({ session, verified: false });
            const comic = await dummyComic(user._id);
            const res = await session.delete(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "Must be verified to delete a comic.");
            assert.equal(await Comic.countDocuments(), 1);
        });
        it("should fail if user is not the author", async () => {
            const session = request(app);
            await dummyUser({ session });
            const comic = await dummyComic();
            const res = await session.delete(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "Must be the author to delete comic.");
            assert.equal(await Comic.countDocuments(), 1);
        });
        it("should fail if user is not logged in", async () => {
            const comic = await dummyComic();
            const res = await request(app).put(`/comic/${comic._id}`).expect(401);
            assert.equal(res.body.error, "NOT LOGGED IN");
            assert.equal(await Comic.countDocuments(), 1);
        });
    });
});

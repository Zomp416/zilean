import assert from "assert";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Server } from "http";

const request = require("supertest-session");

import { dummyUser } from "../dummy";
import Comic from "../../src/models/comic";
import User from "../../src/models/user";
import Image from "../../src/models/image";
import Story from "../../src/models/story";
import createApp from "../../src/app";

describe("account routes", function () {
    var mongod: MongoMemoryServer;
    var app: Server;

    this.beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connect(uri);
        app = createApp(uri, "secret").listen(5000);
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
        app.close();
    });

    describe("POST /account/login", function () {
        it("should succeed with correct user/password", async () => {
            const user = await dummyUser();
            const res = await request(app)
                .post("/account/login")
                .send(user.login)
                .set("Content-Type", "application/json")
                .expect(200);
            assert.equal(res.body.msg, `logged in ${user.db!._id}`);
        });
        it("should fail with incorrect password", async () => {
            const user = await dummyUser();
            user.login.password += "_";
            const res = await request(app)
                .post("/account/login")
                .send(user.login)
                .set("Content-Type", "application/json")
                .expect(401);
            assert.equal(res.body.msg, "Invalid username or password.");
        });
        it("should fail if user does not exist", async () => {
            const user = await dummyUser(false);
            const res = await request(app)
                .post("/account/login")
                .send(user.login)
                .set("Content-Type", "application/json")
                .expect(401);
            assert.equal(res.body.msg, "User not found.");
        });
    });

    describe("GET /account", function () {
        it("should retrieve information of logged in user", async () => {
            const user = await dummyUser();
            const session = request(app);
            await session.post("/account/login").send(user.login);
            const res = await session.get("/account").expect(200);
            assert.equal(res.body.data.email, user.email);
            assert.equal(res.body.data.username, user.username);
        });
        it("should fail if unauthenticated", async () => {
            const res = await request(app).get("/account").expect(401);
            assert.equal(res.body.msg, "NOT LOGGED IN");
            assert.equal(res.body.data, undefined);
        });
    });

    describe("POST /account/logout", function () {
        it("should log out a logged in user", async () => {
            const user = await dummyUser();
            const session = request(app);
            await session
                .post("/account/login")
                .send(user.login)
                .set("Content-Type", "application/json");
            const res1 = await session.post("/account/logout").expect(200);
            const res2 = await request(app).get("/account").expect(401);
            assert.equal(res1.body.msg, "Logged Out!");
            assert.equal(res2.body.msg, "NOT LOGGED IN");
        });
        it("should not error on logout even when not logged in", async () => {
            await request(app).post("/account/logout").expect(200);
        });
    });

    describe("POST /account/register", function () {
        it("should successfully register an unverified user", async () => {
            const user = await dummyUser(false);
            const session = request(app);
            await session
                .post("/account/register")
                .send(user.register)
                .set("Content-Type", "application/json")
                .expect(200);
            const res = await session.get("/account").expect(200);
            assert.equal(res.body.data.email, user.email);
            assert.equal(res.body.data.username, user.username);
            assert.equal(res.body.data.verified, false);
            assert.equal(
                await User.countDocuments({
                    email: user.email,
                    username: user.username,
                }),
                1
            );
        });
    });
});

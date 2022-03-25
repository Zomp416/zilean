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

    describe("/login route", function () {
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

    describe("/ route", function () {
        it("should retrieve information of logged in user", async () => {
            const user = await dummyUser();
            const session = request(app);
            await session.post("/account/login").send(user.login);
            const res = await session.get("/account").expect(200);
            assert.equal(res.body.data.email, user.login.email);
            assert.equal(res.body.data.username, user.db!.username);
        });
        it("should fail if unauthenticated", async () => {
            const res = await request(app).get("/account").expect(401);
            assert.equal(res.body.msg, "NOT LOGGED IN");
        });
    });
});

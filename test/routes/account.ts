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
            assert.equal(res.body.success, `logged in ${user.db!._id}`);
        });
        it("should fail with incorrect password", async () => {
            const user = await dummyUser();
            user.login.password += "_";
            const res = await request(app)
                .post("/account/login")
                .send(user.login)
                .set("Content-Type", "application/json")
                .expect(401);
            assert.equal(res.body.error, "Invalid username or password.");
        });
    });
});

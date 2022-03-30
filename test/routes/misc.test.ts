import assert from "assert";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Express } from "express";

const request = require("supertest-session");

import createApp from "../../src/app";

describe("misc routes", function () {
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

    describe("GET /", function () {
        it("should respond with hello world", async () => {
            const res = await request(app).get("/").expect(200);
            assert.equal(res.text, "Hello world!");
        });
    });
});

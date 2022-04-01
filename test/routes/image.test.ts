import assert from "assert";
import sinon from "sinon";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Express } from "express";

const request = require("supertest-session");

import { dummyUser } from "../dummy";
import Image from "../../src/models/image";
import createApp from "../../src/app";
import * as s3 from "../../src/util/s3-config";

const uploadObjectStub = sinon.stub(s3, "uploadObject");
const deleteObjectStub = sinon.stub(s3, "deleteObject");

describe("account routes", function () {
    var mongod: MongoMemoryServer;
    var app: Express;

    this.beforeEach(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connect(uri);
        app = createApp(uri, "_");
        uploadObjectStub.reset();
        deleteObjectStub.reset();
    });

    this.afterEach(async () => {
        await disconnect();
        await mongod.stop();
    });

    describe("POST /image", function () {
        it("should upload an image (asset)", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("directory", "assets")
                .field("name", "cabbage")
                .attach("image", "./test/assets/test.jpg")
                .expect(200);
            assert.equal(res.body.data.uploadedBy, user._id);
            assert.equal(res.body.data.name, "cabbage");
            assert.equal(res.body.data.searchable, true);
            assert.equal(res.body.data.imageURL.startsWith("assets"), true);
            assert.equal(uploadObjectStub.callCount, 1);
            assert.equal((await Image.findOne({}).exec())!.imageURL, res.body.data.imageURL);
        });
        it("should upload an image (avatar)", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("directory", "avatars")
                .field("name", "cabbage")
                .attach("image", "./test/assets/test.jpg")
                .expect(200);
            assert.equal(res.body.data.uploadedBy, user._id);
            assert.equal(res.body.data.name, "cabbage");
            assert.equal(res.body.data.searchable, false);
            assert.equal(res.body.data.imageURL.startsWith("avatars"), true);
            assert.equal(uploadObjectStub.callCount, 1);
            assert.equal((await Image.findOne({}).exec())!.imageURL, res.body.data.imageURL);
        });
        it("should upload an image (thumbnail)", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("directory", "thumbnails")
                .field("name", "cabbage")
                .attach("image", "./test/assets/test.jpg")
                .expect(200);
            assert.equal(res.body.data.uploadedBy, user._id);
            assert.equal(res.body.data.name, "cabbage");
            assert.equal(res.body.data.searchable, false);
            assert.equal(res.body.data.imageURL.startsWith("thumbnails"), true);
            assert.equal(uploadObjectStub.callCount, 1);
            assert.equal((await Image.findOne({}).exec())!.imageURL, res.body.data.imageURL);
        });
        it("should upload an image (svg format)", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("directory", "assets")
                .field("name", "cabbage")
                .attach("image", "./test/assets/test.jpg")
                .expect(200);
            assert.equal(uploadObjectStub.callCount, 1);
            assert.equal((await Image.findOne({}).exec())!.imageURL, res.body.data.imageURL);
        });
        it("should fail if missing directory", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("name", "cabbage")
                .attach("image", "./test/assets/test.jpg")
                .expect(400);
            assert.equal(res.body.error, "Invalid request arguments.");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail with invalid directory", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("directory", "bad_directory_name")
                .field("name", "cabbage")
                .attach("image", "./test/assets/test.jpg")
                .expect(400);
            assert.equal(res.body.error, "Invalid request arguments.");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail if missing name", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session
                .post("/image")
                .set("Content-Type", "multipart/form-data")
                .field("directory", "assets")
                .attach("image", "./test/assets/test.jpg")
                .expect(400);
            assert.equal(res.body.error, "Invalid request arguments.");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail if missing image", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session.post("/image").expect(400);

            assert.equal(res.body.error, "Must include an image.");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail if image upload is named incorrectly", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session.post("/image").attach("bad_name", "./test/assets/test.jpg");
            assert.equal(res.body.error, "multer upload error");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail if image upload is named incorrectly", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session.post("/image").attach("image", "./test/assets/test.txt");
            assert.equal(res.body.error, "Invalid file type.");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail if user is not verified", async () => {
            const session = request(app);
            await dummyUser({ session, verified: false });
            const res = await session.post("/image").expect(401);
            assert.equal(res.body.error, "Must be verified to upload an image.");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
        it("should fail if user is not logged in", async () => {
            const res = await request(app).post("/image").expect(401);
            assert.equal(res.body.error, "NOT LOGGED IN");
            assert.equal(uploadObjectStub.callCount, 0);
            assert.equal(await Image.countDocuments(), 0);
        });
    });
});

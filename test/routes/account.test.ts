import assert from "assert";
import sinon from "sinon";
import crypto from "crypto";
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
import * as email from "../../src/util/email-config";

const sendVerifyEmailStub = sinon.stub(email, "sendVerifyEmail");
const sendForgotPasswordEmailStub = sinon.stub(email, "sendForgotPasswordEmail");

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
        sendVerifyEmailStub.reset();
        sendForgotPasswordEmailStub.reset();
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
            assert.equal(res.body.message, `logged in ${user.db!._id}`);
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
        it("should fail if user does not exist", async () => {
            const user = await dummyUser(false);
            const res = await request(app)
                .post("/account/login")
                .send(user.login)
                .set("Content-Type", "application/json")
                .expect(401);
            assert.equal(res.body.error, "User not found.");
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
            assert.equal(res.body.error, "NOT LOGGED IN");
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
            assert.equal(res1.body.message, "Logged Out!");
            assert.equal(res2.body.error, "NOT LOGGED IN");
        });
        it("should not error on logout even when not logged in", async () => {
            await request(app).post("/account/logout").expect(200);
        });
    });

    describe("POST /account/register", function () {
        it("should successfully register an unverified user", async () => {
            const user = await dummyUser(false);
            const session = request(app);
            const res1 = await session
                .post("/account/register")
                .send(user.register)
                .set("Content-Type", "application/json")
                .expect(200);
            assert.equal(res1.body.message, "Registered Successfully!");
            const res2 = await session.get("/account").expect(200);
            assert.equal(res2.body.data.email, user.email);
            assert.equal(res2.body.data.username, user.username);
            assert.equal(res2.body.data.verified, false);
            assert.equal(
                await User.countDocuments({
                    email: user.email,
                    username: user.username,
                }),
                1
            );
            assert.equal(sendVerifyEmailStub.callCount, 1);
        });
        it("should fail if message body is missing information", async () => {
            const session = request(app);
            const user1 = await dummyUser(false);
            user1.register.email = "";
            const res1 = await session
                .post("/account/register")
                .send(user1.register)
                .set("Content-Type", "application/json")
                .expect(400);
            const user2 = await dummyUser(false);
            user2.register.username = "";
            const res2 = await session
                .post("/account/register")
                .send(user2.register)
                .set("Content-Type", "application/json")
                .expect(400);
            const user3 = await dummyUser(false);
            user3.register.password = "";
            const res3 = await session
                .post("/account/register")
                .send(user3.register)
                .set("Content-Type", "application/json")
                .expect(400);
            assert.equal(res1.body.error, "Missing arguments in request");
            assert.equal(res2.body.error, "Missing arguments in request");
            assert.equal(res3.body.error, "Missing arguments in request");
            assert.equal(sendVerifyEmailStub.callCount, 0);
        });
        it("should fail if username or email are already taken", async () => {
            const user = await dummyUser();
            user.register.email = user.register.email.toLowerCase();
            const res1 = await request(app)
                .post("/account/register")
                .send(user.register)
                .set("Content-Type", "application/json")
                .expect(400);
            user.register.email = user.register.email.toLowerCase();
            const res2 = await request(app)
                .post("/account/register")
                .send(user.register)
                .set("Content-Type", "application/json")
                .expect(400);
            assert.equal(
                res1.body.error,
                "Account with that email address and/or username already exists."
            );
            assert.equal(
                res2.body.error,
                "Account with that email address and/or username already exists."
            );
            assert.equal(sendVerifyEmailStub.callCount, 0);
        });
    });
    describe("POST /account/subscribe", function () {
        it("should successfully make a subscription", async () => {
            const user1 = await dummyUser();
            const user2 = await dummyUser();
            const session = request(app);
            await session
                .post("/account/login")
                .send(user1.login)
                .set("Content-Type", "application/json");
            const res = await session
                .post("/account/subscribe")
                .send({ subscription: user2.db!._id })
                .set("Content-Type", "application/json")
                .expect(200);
            assert.equal(res.body.message, "subscribed successfully");
            assert.equal((await User.findById(user2.db!._id).exec())!.subscriberCount, 1);
            assert.deepEqual((await User.findById(user1.db!._id).exec())!.subscriptions, [
                user2.db!._id,
            ]);
        });
        it("should fail to subscribe to the same user twice", async () => {
            const user1 = await dummyUser();
            const user2 = await dummyUser();
            const session = request(app);
            await session
                .post("/account/login")
                .send(user1.login)
                .set("Content-Type", "application/json");
            await session
                .post("/account/subscribe")
                .send({ subscription: user2.db!._id })
                .set("Content-Type", "application/json");
            const res = await session
                .post("/account/subscribe")
                .send({ subscription: user2.db!._id })
                .set("Content-Type", "application/json")
                .expect(400);
            assert.equal(res.body.error, "already subscribed");
            assert.equal((await User.findById(user2.db!._id).exec())!.subscriberCount, 1);
            assert.deepEqual((await User.findById(user1.db!._id).exec())!.subscriptions, [
                user2.db!._id,
            ]);
        });
    });
    describe("POST /account/unsubscribe", function () {
        it("should successfully remove a subscription", async () => {
            const user1 = await dummyUser();
            const user2 = await dummyUser();
            const session = request(app);
            await session
                .post("/account/login")
                .send(user1.login)
                .set("Content-Type", "application/json");
            await session
                .post("/account/subscribe")
                .send({ subscription: user2.db!._id })
                .set("Content-Type", "application/json");
            const res = await session
                .post("/account/unsubscribe")
                .send({ subscription: user2.db!._id })
                .set("Content-Type", "application/json")
                .expect(200);
            assert.equal(res.body.message, "unsubscribed successfully");
            assert.equal((await User.findById(user2.db!._id).exec())!.subscriberCount, 0);
            assert.deepEqual((await User.findById(user1.db!._id).exec())!.subscriptions, []);
        });
        it("should fail to remove a subscription that doesn't exist", async () => {
            const user1 = await dummyUser();
            const user2 = await dummyUser();
            const session = request(app);
            await session
                .post("/account/login")
                .send(user1.login)
                .set("Content-Type", "application/json");
            const res = await session
                .post("/account/unsubscribe")
                .send({ subscription: user2.db!._id })
                .set("Content-Type", "application/json")
                .expect(400);
            assert.equal(res.body.error, "not subscribed");
            assert.equal((await User.findById(user2.db!._id).exec())!.subscriberCount, 0);
            assert.deepEqual((await User.findById(user1.db!._id).exec())!.subscriptions, []);
        });
    });
    describe("POST /account/forgot-password", function () {
        it("should trigger a password reset email", async () => {
            const user = await dummyUser();
            await request(app)
                .post("/account/forgot-password")
                .send({ email: user.email })
                .set("Content-Type", "application/json")
                .expect(200);
            assert.equal(sendForgotPasswordEmailStub.callCount, 1);
        });
        it("should error if no email is provided", async () => {
            const res = await request(app)
                .post("/account/forgot-password")
                .set("Content-Type", "application/json")
                .expect(400);
            assert.equal(res.body.error, "Missing email");
            assert.equal(sendForgotPasswordEmailStub.callCount, 0);
        });
        it("should error if no user exists with given email", async () => {
            const res = await request(app)
                .post("/account/forgot-password")
                .send({ email: crypto.randomBytes(20).toString("hex") })
                .set("Content-Type", "application/json")
                .expect(400);
            assert.equal(res.body.error, "No user with specified email");
            assert.equal(sendForgotPasswordEmailStub.callCount, 0);
        });
    });
});

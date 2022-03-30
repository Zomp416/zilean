import assert from "assert";
import sinon from "sinon";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Express } from "express";

const request = require("supertest-session");

import { dummyUser } from "../dummy";
import User from "../../src/models/user";
import createApp from "../../src/app";
import * as email from "../../src/util/email-config";
import { generateToken } from "../../src/util/token-config";

const sendVerifyEmailStub = sinon.stub(email, "sendVerifyEmail");
const sendForgotPasswordEmailStub = sinon.stub(email, "sendForgotPasswordEmail");

describe("account routes", function () {
    var mongod: MongoMemoryServer;
    var app: Express;

    this.beforeEach(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connect(uri);
        app = createApp(uri, "_");
        sendVerifyEmailStub.reset();
        sendForgotPasswordEmailStub.reset();
    });

    this.afterEach(async () => {
        await disconnect();
        await mongod.stop();
    });

    describe("POST /account/login", function () {
        it("should succeed with correct user/password", async () => {
            const user = await dummyUser();
            const res = await request(app).post("/account/login").send(user.login).expect(200);
            assert.equal(res.body.message, `logged in ${user.db!._id}`);
        });
        it("should fail with incorrect password", async () => {
            const user = await dummyUser();
            user.login.password += "_";
            const res = await request(app).post("/account/login").send(user.login).expect(401);
            assert.equal(res.body.error, "Invalid username or password.");
        });
        it("should fail if user does not exist", async () => {
            const user = await dummyUser({ save: false });
            const res = await request(app).post("/account/login").send(user.login).expect(401);
            assert.equal(res.body.error, "User not found.");
        });
        it("should fail if mongodb connection is lost", async () => {
            const user = await dummyUser();
            await disconnect();
            const res = await request(app).post("/account/login").send(user.login).expect(401);
            await connect(mongod.getUri());
            assert.equal(res.body.error, "mongodb server connection issue");
        });
    });

    describe("GET /account", function () {
        it("should retrieve information of logged in user", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
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

    describe("GET /account/:id", function () {
        it("should retrieve information of a given user", async () => {
            const user = await dummyUser();
            const res = await request(app).get(`/account/${user.db!._id}`).expect(200);
            assert.equal(user.email, res.body.data.email);
            assert.equal(user.username, res.body.data.username);
        });
        it("should error if user cannot be found", async () => {
            const user = await dummyUser();
            await User.deleteMany({});
            const res = await request(app).get(`/account/${user.db!._id}`).expect(400);
            assert.equal(res.body.error, "No user found");
        });
    });

    describe("POST /account/logout", function () {
        it("should log out a logged in user", async () => {
            const session = request(app);
            await dummyUser({ session });
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
            const user = await dummyUser({ save: false });
            const session = request(app);
            const res1 = await session.post("/account/register").send(user.register).expect(200);
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
            const user1 = await dummyUser({ save: false });
            user1.register.email = "";
            const res1 = await session.post("/account/register").send(user1.register).expect(400);
            const user2 = await dummyUser({ save: false });
            user2.register.username = "";
            const res2 = await session.post("/account/register").send(user2.register).expect(400);
            const user3 = await dummyUser({ save: false });
            user3.register.password = "";
            const res3 = await session.post("/account/register").send(user3.register).expect(400);
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
                .expect(400);
            user.register.email = user.register.email.toLowerCase();
            const res2 = await request(app)
                .post("/account/register")
                .send(user.register)
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

    describe("PUT /account", function () {
        it("should update username", async () => {
            const session = request(app);
            const user = await dummyUser({ session });
            const res = await session
                .put("/account")
                .send({ user: { username: "_" } })
                .expect(200);
            assert.equal(res.body.data.username, "_");
            assert.equal(res.body.data._id, user.db!._id);
            assert.equal((await User.findOne({}).exec())!.username, "_");
        });
        it("should fail if request body is missing information", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session.put("/account").expect(400);
            assert.equal(res.body.error, "Missing arguments");
        });
        it("should fail if trying to change _id", async () => {
            const session = request(app);
            await dummyUser({ session });
            const res = await session
                .put("/account")
                .send({ user: { _id: "_" } })
                .expect(401);
            assert.equal(res.body.error, "User ID's do not match.");
        });
    });

    describe("POST /account/subscribe", function () {
        it("should successfully make a subscription", async () => {
            const session = request(app);
            const user1 = await dummyUser({ session });
            const user2 = await dummyUser();
            const res = await session
                .post("/account/subscribe")
                .send({ subscription: user2.db!._id })
                .expect(200);
            assert.equal(res.body.message, "subscribed successfully");
            assert.equal((await User.findById(user2.db!._id).exec())!.subscriberCount, 1);
            assert.deepEqual((await User.findById(user1.db!._id).exec())!.subscriptions, [
                user2.db!._id,
            ]);
        });
        it("should fail to subscribe to the same user twice", async () => {
            const session = request(app);
            const user1 = await dummyUser({ session });
            const user2 = await dummyUser();
            await session.post("/account/subscribe").send({ subscription: user2.db!._id });
            const res = await session
                .post("/account/subscribe")
                .send({ subscription: user2.db!._id })
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
            const session = request(app);
            const user1 = await dummyUser({ session });
            const user2 = await dummyUser();
            await session.post("/account/subscribe").send({ subscription: user2.db!._id });
            const res = await session
                .post("/account/unsubscribe")
                .send({ subscription: user2.db!._id })
                .expect(200);
            assert.equal(res.body.message, "unsubscribed successfully");
            assert.equal((await User.findById(user2.db!._id).exec())!.subscriberCount, 0);
            assert.deepEqual((await User.findById(user1.db!._id).exec())!.subscriptions, []);
        });
        it("should fail to remove a subscription that doesn't exist", async () => {
            const session = request(app);
            const user1 = await dummyUser({ session });
            const user2 = await dummyUser();
            const res = await session
                .post("/account/unsubscribe")
                .send({ subscription: user2.db!._id })
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
                .expect(200);
            assert.equal(sendForgotPasswordEmailStub.callCount, 1);
        });
        it("should error if no email is provided", async () => {
            const res = await request(app).post("/account/forgot-password").expect(400);
            assert.equal(res.body.error, "Missing email");
            assert.equal(sendForgotPasswordEmailStub.callCount, 0);
        });
        it("should error if no user exists with given email", async () => {
            const res = await request(app)
                .post("/account/forgot-password")
                .send({ email: "_" })
                .expect(400);
            assert.equal(res.body.error, "No user with specified email");
            assert.equal(sendForgotPasswordEmailStub.callCount, 0);
        });
    });
    describe("POST /account/reset-password", function () {
        it("should correctly reset a password", async () => {
            const user = await dummyUser();
            const token = generateToken(user.db!);
            const password = "_";
            const res = await request(app)
                .post("/account/reset-password")
                .send({ id: user.db!._id, token, password })
                .expect(200);
            user.login.password = password;
            await request(app).post("/account/login").send(user.login).expect(200);
            assert.equal(res.body.message, "OK");
        });
        it("should fail if message body is missing information", async () => {
            const user = await dummyUser();
            const token = generateToken(user.db!);
            const password = "_";
            const res1 = await request(app)
                .post("/account/reset-password")
                .send({ id: user.db!._id, token })
                .expect(400);
            const res2 = await request(app)
                .post("/account/reset-password")
                .send({ id: user.db!._id, password })
                .expect(400);
            const res3 = await request(app)
                .post("/account/reset-password")
                .send({ token, password })
                .expect(400);
            assert.equal(res1.body.error, "Must provide all required arguments to reset password");
            assert.equal(res2.body.error, "Must provide all required arguments to reset password");
            assert.equal(res3.body.error, "Must provide all required arguments to reset password");
        });
        it("should fail if user does not exist", async () => {
            const user = await dummyUser();
            const token = generateToken(user.db!);
            const password = "_";
            await User.deleteMany({});
            const res = await request(app)
                .post("/account/reset-password")
                .send({ id: user.db!._id, token, password })
                .expect(400);
            assert.equal(res.body.error, "User not found");
        });
        it("should fail if token is invalid", async () => {
            const user = await dummyUser();
            const token = "_";
            const password = "_";
            const res = await request(app)
                .post("/account/reset-password")
                .send({ id: user.db!._id, token, password })
                .expect(400);
            assert.equal(res.body.error, "Token is invalid or expired");
        });
    });
    describe("POST /account/send-verify", function () {
        it("should trigger a verification email", async () => {
            const user = await dummyUser();
            await request(app).post("/account/send-verify").send({ email: user.email }).expect(200);
            assert.equal(sendVerifyEmailStub.callCount, 1);
        });
        it("should error if no email is provided", async () => {
            const res = await request(app).post("/account/send-verify").expect(400);
            assert.equal(res.body.error, "Missing email");
            assert.equal(sendForgotPasswordEmailStub.callCount, 0);
        });
        it("should error if no user exists with given email", async () => {
            const res = await request(app)
                .post("/account/send-verify")
                .send({ email: "_" })
                .expect(400);
            assert.equal(res.body.error, "No user with specified email");
            assert.equal(sendForgotPasswordEmailStub.callCount, 0);
        });
    });
    describe("POST /account/verify", function () {
        it("should correctly verify a user", async () => {
            const user = await dummyUser({ verified: false });
            const token = generateToken(user.db!);
            const res = await request(app)
                .post("/account/verify")
                .send({ id: user.db!._id, token })
                .expect(200);
            assert.equal(await User.countDocuments({ verified: true }), 1);
            assert.equal(res.body.message, "OK");
        });
        it("should fail if message body is missing information", async () => {
            const user = await dummyUser();
            const token = generateToken(user.db!);
            const res1 = await request(app)
                .post("/account/verify")
                .send({ id: user.db!._id })
                .expect(400);
            const res2 = await request(app).post("/account/verify").send({ token }).expect(400);
            assert.equal(res1.body.error, "Must provide all required arguments to verify user");
            assert.equal(res2.body.error, "Must provide all required arguments to verify user");
        });
        it("should fail if user does not exist", async () => {
            const user = await dummyUser();
            const token = generateToken(user.db!);
            await User.deleteMany({});
            const res = await request(app)
                .post("/account/verify")
                .send({ id: user.db!._id, token })
                .expect(400);
            assert.equal(res.body.error, "User not found");
        });
        it("should fail if token is invalid", async () => {
            const user = await dummyUser();
            const token = "_";
            const res = await request(app)
                .post("/account/verify")
                .send({ id: user.db!._id, token })
                .expect(400);
            assert.equal(res.body.error, "Token is invalid or expired");
        });
    });
    describe("GET /account/search", function () {
        it("should find all users (empty search)", async () => {
            for (let i = 0; i < 5; i++) await dummyUser();
            const res = await request(app).get("/account/search").expect(200);
            assert.equal(res.body.data.length, 5);
        });
        it("should find users that match a regex", async () => {
            const user = await dummyUser();
            const res1 = await request(app)
                .get(`/account/search?value=${user.username}`)
                .expect(200);
            const res2 = await request(app)
                .get(`/account/search?value=${user.username.slice(5, 10)}`)
                .expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 1);
            assert.equal(res1.body.data[0].username, user.username);
            assert.equal(res2.body.data[0].username, user.username);
        });
        it("should filter by subscriptions", async () => {
            const session = request(app);
            await dummyUser({ session });
            const user = await dummyUser();
            await session.post("/account/subscribe").send({ subscription: user.db!._id });
            const res1 = await session.get("/account/search?subscriptions=true").expect(200);
            const res2 = await session.get("/account/search").expect(200);
            assert.equal(res1.body.data.length, 1);
            assert.equal(res2.body.data.length, 2);
            assert.equal(res1.body.data[0].username, user.username);
        });
        it("should fail subscription filter when unauthenticated", async () => {
            const res = await request(app).get("/account/search?subscriptions=true").expect(400);
            assert.equal(res.body.error, "Must be logged in to show subscriptions");
        });
        it("should sort results correctly", async () => {
            for (let i = 0; i < 5; i++) await dummyUser();
            const res = await request(app).get("/account/search?sort=username").expect(200);
            const data = res.body.data;
            assert.equal(data[0].username < data[1].username, true);
            assert.equal(data[1].username < data[2].username, true);
            assert.equal(data[2].username < data[3].username, true);
            assert.equal(data[3].username < data[4].username, true);
        });
    });
});

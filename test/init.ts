import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, disconnect } from "mongoose";
import { Server } from "http";

import User from "../src/models/user";
import Comic from "../src/models/comic";
import Story from "../src/models/story";
import Image from "../src/models/image";
import createApp from "../src/app";

var mongod: MongoMemoryServer;
var server: Server;

const beforeAll = async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connect(uri);
    server = createApp(uri, "secret").listen(5000);
};

const beforeEach = async () => {
    await User.deleteMany({});
    await Comic.deleteMany({});
    await Story.deleteMany({});
    await Image.deleteMany({});
};

const afterAll = async () => {
    await mongod.stop();
    disconnect();
    server.close();
};

export const mochaHooks = { beforeAll, beforeEach, afterAll };

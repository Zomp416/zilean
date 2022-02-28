import assert from "assert";
import { connect, Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Comic, { IComic } from "../src/models/comic";

// basic comic document creation with mongoose
describe("comic document creation", function () {
    // start and connect to ephemeral mongo server
    let mongod: MongoMemoryServer;
    this.beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connect(uri);
    });

    // stop mongo server
    this.afterAll(async () => {
        await mongod.stop();
    });

    // reset database between test cases
    this.beforeEach(async () => {
        await Comic.deleteMany({});
    });

    // basic comic creation with title and author specified
    it("should succeed with author and title", async () => {
        let comic: IComic = new Comic({
            title: "Example Title",
            author: new Types.ObjectId(),
        });
        await comic.save();
        assert.notEqual(await Comic.findOne({}), null);
    });

    // title is a required field
    it("should fail without title", async () => {
        await assert.rejects(async () => {
            let comic: IComic = new Comic({
                author: new Types.ObjectId(),
            });
            await comic.save();
        });
    });

    // author is a required field
    it("should fail without author", async () => {
        await assert.rejects(async () => {
            let comic: IComic = new Comic({
                title: "Example Title",
            });
            await comic.save();
        });
    });
});

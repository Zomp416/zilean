declare namespace Express {
    export interface Request {
        payload?:
            | import("../../src/models/comic").IComic
            | import("../../src/models/story").IStory
            | import("../../src/models/image").IImage;
    }
}

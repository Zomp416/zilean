import express from "express";
import { isAuthenticated, isVerified, findStory, isAuthor, isPublished } from "../util/middlewares";
import Story, { IStory } from "../models/story";
import User, { IUser } from "../models/user";
import mongoose from "mongoose";

const router = express.Router();

// SEARCH STORIES
router.get("/search", async (req, res, next) => {
    const storyQuery = Story.find();

    // ONLY SHOW PUBLISHED STORIES
    const queryFilters: any[] = [
        {
            publishedAt: {
                $exists: true,
            },
        },
    ];

    // SUBSCRIPTIONS FILTER
    if (req.query.subscriptions === "true") {
        if (!req.isAuthenticated()) {
            res.status(400).json({ error: "Must be logged in to show subscriptions" });
            return next();
        }
        const user = req.user as IUser;
        queryFilters.push({
            author: {
                $in: user.subscriptions,
            },
        });
    }

    // USER FILTER
    if (req.query.author) {
        const userFilter = req.query.author as string;
        queryFilters.push({
            author: userFilter,
        });
    }

    // TITLE FILTER
    if (req.query.value) {
        const titleFilter = req.query.value as string;
        queryFilters.push({
            title: {
                $regex: new RegExp(titleFilter, "i"),
            },
        });
    }

    // TIME FILTER
    if (req.query.time && req.query.time !== "all") {
        const timeFilter = req.query.time as string;
        let timeBoundary = new Date();
        if (timeFilter === "year") {
            timeBoundary.setFullYear(timeBoundary.getFullYear() - 1);
        } else if (timeFilter === "month") {
            timeBoundary.setMonth(timeBoundary.getMonth() - 1);
        } else if (timeFilter === "week") {
            timeBoundary = new Date(timeBoundary.getTime() - 7 * 60 * 60 * 24 * 1000);
        } else if (timeFilter === "day") {
            timeBoundary = new Date(timeBoundary.getTime() - 60 * 60 * 24 * 1000);
        }
        queryFilters.push({
            publishedAt: {
                $gte: timeBoundary,
            },
        });
    }

    // TAGS FILTER
    if (req.query.tags) {
        if (Array.isArray(req.query.tags)) {
            const tags = req.query.tags as string[];
            queryFilters.push({
                tags: {
                    $all: tags,
                },
            });
        } else {
            const tag = req.query.tags;
            queryFilters.push({
                tags: tag,
            });
        }
    }

    // ADD FILTERS TO QUERY
    if (queryFilters.length !== 0) {
        storyQuery.and(queryFilters);
    }

    // SORT RESULTS (ex: views, rating)
    if (req.query.sort) {
        if (req.query.sort === "alpha") storyQuery.sort({ title: 1 });
        else if (req.query.sort === "rating") storyQuery.sort({ rating: -1 });
        else if (req.query.sort === "views") storyQuery.sort({ views: -1 });
        else if (req.query.sort === "time") storyQuery.sort({ publishedAt: -1 });
    }

    // EXECUTE QUERY (with pagination)
    if (req.query.page && req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        const page = parseInt(req.query.page as string);
        const stories = await Story.find(storyQuery, {}, { skip: page * limit, limit })
            .populate("author")
            .exec();
        const count = await Story.countDocuments(storyQuery);
        res.status(200).json({ data: { results: stories, count } });
    }
    // EXECUTE QUERY (normally)
    else {
        const stories = await storyQuery.populate("author").exec();
        res.status(200).json({ data: stories });
    }
});

// GET STORY
router.get("/:id", findStory, async (req, res, next) => {
    res.status(200).json({ data: req.payload });
    return next();
});

// VIEW STORY
router.get("/view/:id", async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ error: "Unable to view comic with specified id" });
        return next();
    }
    const story = await Story.findById(req.params.id)
        .populate("author")
        .populate("comments.author");
    if (!story || !story.publishedAt) {
        res.status(400).json({ error: "Unable to view comic with specified id" });
        return next();
    }
    story.views++;
    story.save();
    res.status(200).json({ data: story });
    return next();
});

// CREATE STORY - AUTH
router.post("/", isAuthenticated, isVerified, async (req, res, next) => {
    const user = req.user as IUser;

    const chapterOne = { chapterName: "Untitled Chapter", text: "" };
    const newStory = new Story({
        title: "Unnamed Story",
        author: user._id,
    });
    newStory.story.push(chapterOne);

    await newStory.save();

    user.stories.push(newStory._id);
    await user.save();

    res.status(200).json({ data: newStory });
    return next();
});

// UPDATE STORY - AUTH
router.put("/:id", isAuthenticated, isVerified, findStory, isAuthor, async (req, res, next) => {
    const user = req.user as IUser;
    let story: IStory | null = req.payload as IStory;

    // TODO assert that req.body.story is actually a story
    const updatedStory = req.body.story as IStory;
    story = await Story.findByIdAndUpdate(story._id, updatedStory, { returnDocument: "after" });

    res.status(200).json({ data: story });
    return next();
});

// DELETE STORY - AUTH
router.delete("/:id", isAuthenticated, isVerified, findStory, isAuthor, async (req, res, next) => {
    const user = req.user as IUser;
    const story = req.payload as IStory;

    await story.delete();
    await User.findByIdAndUpdate(user._id, { $pull: { stories: story._id } });

    res.status(200).json({ message: "Successfully deleted story." });
    return next();
});

// PUBLISH STORY
router.put(
    "/publish/:id",
    isAuthenticated,
    isVerified,
    findStory,
    isAuthor,
    async (req, res, next) => {
        let story = req.payload as IStory;

        await Story.findByIdAndUpdate(story._id, { publishedAt: new Date() });

        res.status(200).json({ message: "successfully published" });
        return next();
    }
);

// UNPUBLISH STORY
router.put(
    "/unpublish/:id",
    isAuthenticated,
    isVerified,
    findStory,
    isAuthor,
    async (req, res, next) => {
        let story = req.payload as IStory;

        await Story.findByIdAndUpdate(story._id, { publishedAt: null });

        res.status(200).json({ message: "successfully unpublished" });
        return next();
    }
);

// RATE STORY
router.put(
    "/rate/:id",
    isAuthenticated,
    isVerified,
    findStory,
    isPublished,
    async (req, res, next) => {
        let story: IStory | null = req.payload as IStory;
        const user = req.user as IUser;

        const rating = parseFloat(req.body.rating);
        if (!story || !rating || rating > 5 || rating < 0) {
            res.status(400).json({ error: "invalid rating or story" });
            return next();
        }

        let total = story.ratingTotal;
        let count = story.ratingCount;

        const prev = user.storyRatings.find(x => x.id.toString() === req.params.id);
        if (prev) {
            total += rating - prev.rating;
            await User.findByIdAndUpdate(user._id, {
                $pull: { storyRatings: { id: req.params.id } },
            });
        } else {
            count += 1;
            total += rating;
        }

        await User.findByIdAndUpdate(user._id, {
            $push: { storyRatings: { rating: rating, id: req.params.id } },
        });

        story.ratingTotal = total;
        story.ratingCount = count;
        story.rating = total / count;
        await story.save();

        res.status(200).json({
            data: {
                ratingTotal: story.ratingTotal,
                ratingCount: story.ratingCount,
                rating: story.rating,
            },
        });
        return next();
    }
);

// COMMENT ON STORY
router.post(
    "/comment/:id",
    isAuthenticated,
    isVerified,
    findStory,
    isPublished,
    async (req, res, next) => {
        let story: IStory | null = req.payload as IStory;
        const user = req.user as IUser;

        if (!req.body.text) {
            res.status(400).json({ error: "message body is missing information" });
            return next();
        }

        story = await Story.findByIdAndUpdate(
            story?._id,
            {
                $push: {
                    comments: { text: req.body.text, author: user._id, createdAt: new Date() },
                },
            },
            { returnDocument: "after" }
        ).populate("comments.author");

        res.status(200).json({
            data: { comments: story?.comments },
        });
        return next();
    }
);

// DELETE COMMENT
router.delete(
    "/comment/:id",
    isAuthenticated,
    isVerified,
    findStory,
    isPublished,
    async (req, res, next) => {
        let story: IStory | null = req.payload as IStory;
        const user = req.user as IUser;

        if (!req.body.createdAt) {
            res.status(400).json({ error: "message body is missing information" });
            return next();
        }

        const filterDate = new Date(req.body.createdAt);

        await story.populate("comments.author");

        story.comments = story.comments.filter(val => {
            if (!val.createdAt) return true;
            return val.createdAt.getTime() !== filterDate.getTime();
        });

        await story.save();

        res.status(200).json({
            data: { comments: story?.comments },
        });
        return next();
    }
);

export default router;

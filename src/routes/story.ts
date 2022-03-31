import express from "express";
import { isAuthenticated } from "../util/passport-config";
import Story, { IStory } from "../models/story";
import User, { IUser } from "../models/user";

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
            timeBoundary = new Date(timeBoundary.getMilliseconds() - 7 * 60 * 60 * 24 * 1000);
        } else if (timeFilter === "day") {
            timeBoundary = new Date(timeBoundary.getMilliseconds() - 60 * 60 * 24 * 1000);
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
        storyQuery.sort(req.query.sort);
    }

    // TODO PAGINATION AND LIMITS

    // EXECUTE QUERY
    const stories = await storyQuery.exec();

    res.status(200).json({ data: stories });
    return;
});

// GET STORY
router.get("/:id", async (req, res, next) => {
    const story = await Story.findById(req.params.id);
    if (!story) {
        res.status(400).json({ error: "No story found" });
        return next();
    }
    res.status(200).json({ data: story });
    return next();
});

// CREATE STORY - AUTH
router.post("/", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to create a story." });
        return next();
    }

    const newStory = new Story({
        title: "Unnamed Story",
        author: user._id,
    });

    await newStory.save();

    user.stories.push(newStory._id);
    await user.save();

    res.status(200).json({ data: newStory });
    return next();
});

// UPDATE STORY - AUTH
router.put("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    let story = await Story.findById(req.params.id);

    if (!story) {
        res.status(400).json({ error: "No story found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to update a story." });
        return next();
    }

    if (story.author.toString() !== user._id.toString()) {
        res.status(401).json({ error: "Must be the author to update story." });
        return next();
    }

    // TODO assert that req.body.story is actually a story
    const updatedStory = req.body.story as IStory;
    story = await Story.findByIdAndUpdate(story._id, updatedStory, { returnDocument: "after" });

    res.status(200).json({ data: story });
    return next();
});

// DELETE STORY - AUTH
router.delete("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const story = await Story.findById(req.params.id);

    if (!story) {
        res.status(400).json({ error: "No story found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to delete a story." });
        return next();
    }

    if (story.author.toString() !== user._id.toString()) {
        res.status(401).json({ error: "Must be the author to delete story." });
        return next();
    }

    await story.delete();
    await User.findByIdAndUpdate(user._id, { $pull: { stories: story._id } });

    res.status(200).json({ message: "Successfully deleted story." });
    return next();
});

export default router;

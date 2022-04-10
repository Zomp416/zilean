import express from "express";
import { isAuthenticated, isVerified, findStory, isAuthor, isPublished } from "../util/middlewares";
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
        storyQuery.sort(req.query.sort);
    }

    // EXECUTE QUERY (with pagination)
    if (req.query.page && req.query.limit) {
        const stories = await Story.paginate(storyQuery, {
            page: parseInt(req.query.page as string),
            limit: parseInt(req.query.limit as string),
        });
        res.status(200).json({ data: stories.docs });
    }
    // EXECUTE QUERY (normally)
    else {
        const stories = await storyQuery.exec();
        res.status(200).json({ data: stories });
    }
});

// GET STORY
router.get("/:id", findStory, async (req, res, next) => {
    res.status(200).json({ data: req.payload });
    return next();
});

// CREATE STORY - AUTH
router.post("/", isAuthenticated, isVerified, async (req, res, next) => {
    const user = req.user as IUser;

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
        if (!rating || rating > 5 || rating < 0) {
            res.status(400).json({ error: "invalid rating" });
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

        story = await Story.findByIdAndUpdate(
            story?._id,
            { ratingTotal: total, ratingCount: count },
            { returnDocument: "after" }
        );

        res.status(200).json({
            data: { ratingTotal: story?.ratingTotal, ratingCount: story?.ratingCount },
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
            { $push: { comments: { text: req.body.text, author: user._id } } },
            { returnDocument: "after" }
        );

        res.status(200).json({
            data: { comments: story?.comments },
        });
        return next();
    }
);

export default router;

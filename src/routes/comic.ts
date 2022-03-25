import express from "express";
import { isAuthenticated } from "../util/passport-config";
import Comic, { IComic } from "../models/comic";
import User, { IUser } from "../models/user";

const router = express.Router();

// SEARCH COMICS
router.get("/search", async (req, res, next) => {
    const comicQuery = Comic.find();

    // ONLY SHOW PUBLISHED COMICS
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
        comicQuery.and(queryFilters);
    }

    // SORT RESULTS (ex: views, rating)
    if (req.query.sort) {
        comicQuery.sort(req.query.sort);
    }

    // TODO PAGINATION AND LIMITS

    // EXECUTE QUERY
    const comics = await comicQuery.exec();

    res.status(200).json(comics);
    return;
});

// GET COMIC
router.get("/:id", async (req, res, next) => {
    const comic = await Comic.findById(req.params.id);
    if (!comic) {
        res.status(400).json({ error: "No comic found" });
        return next();
    }
    res.status(200).json(comic);
    return next();
});

// CREATE COMIC - AUTH
router.post("/", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to create a comic." });
        return next();
    }

    const newComic = new Comic({
        title: "Unnamed Comic",
        author: user._id,
    });

    await newComic.save();

    user.comics.push(newComic._id);
    await user.save();

    res.status(200).json(newComic);
    return next();
});

// UPDATE COMIC - AUTH
router.put("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const comic = await Comic.findById(req.params.id);

    if (!comic) {
        res.status(400).json({ error: "No comic found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to update a comic." });
        return next();
    }

    if (comic.author !== user._id) {
        res.status(401).json({ error: "Must be the author to update comic." });
        return next();
    }

    // TODO assert that req.body.comic is actually a comic
    const updatedComic = req.body.comic as IComic;
    await comic.update(updatedComic);

    res.status(200).json(comic);
    return next();
});

// DELETE COMIC - AUTH
router.delete("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const comic = await Comic.findById(req.params.id);

    if (!comic) {
        res.status(400).json({ error: "No comic found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to delete a comic." });
        return next();
    }

    if (comic.author !== user._id) {
        res.status(401).json({ error: "Must be the author to delete comic." });
        return next();
    }

    await comic.delete();
    res.status(200).json({ msg: "Successfully deleted comic." });
    return next();
});

export default router;

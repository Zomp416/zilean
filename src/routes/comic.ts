import express from "express";
import { isAuthenticated, isVerified, findComic, isAuthor, isPublished } from "../util/middlewares";
import Comic, { IComic } from "../models/comic";
import User, { IUser } from "../models/user";
import { IImage } from "../models/image";
import mongoose from "mongoose";
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
        comicQuery.and(queryFilters);
    }

    // SORT RESULTS (ex: views, rating)
    if (req.query.sort) {
        if (req.query.sort === "alpha") comicQuery.sort({ title: 1 });
        else if (req.query.sort === "rating") comicQuery.sort({ rating: -1 });
        else if (req.query.sort === "views") comicQuery.sort({ views: -1 });
        else if (req.query.sort === "time") comicQuery.sort({ publishedAt: -1 });
    }

    // EXECUTE QUERY (with pagination)
    if (req.query.page && req.query.limit) {
        const limit = parseInt(req.query.limit as string);
        const page = parseInt(req.query.page as string);
        const comics = await Comic.find(comicQuery, {}, { skip: page * limit, limit })
            .populate("author")
            .exec();
        const count = await Comic.countDocuments(comicQuery);
        res.status(200).json({ data: { results: comics, count } });
    }
    // EXECUTE QUERY (normally)
    else {
        const comics = await comicQuery.populate("author").exec();
        res.status(200).json({ data: comics });
    }
});

// GET COMIC
router.get("/:id", findComic, async (req, res, next) => {
    res.status(200).json({ data: req.payload });
    return next();
});

// VIEW COMIC
router.get("/view/:id", async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ error: "Unable to view comic with specified id" });
        return next();
    }
    const comic = await Comic.findById(req.params.id)
        .populate("author")
        .populate("comments.author");
    if (!comic || !comic.publishedAt) {
        res.status(400).json({ error: "Unable to view comic with specified id" });
        return next();
    }
    comic.views++;
    comic.save();
    res.status(200).json({ data: comic });
    return next();
});

//FIND COMIC AUTHOR
router.get("/comicAuthor/:id", async (req, res, next) => {
    const comic = await Comic.findById(req.params.id).populate("author").populate("renderedImage");
    if (!comic) {
        res.status(400).json({ error: "No user found" });
        return next();
    }
    res.status(200).json({ data: comic });
    return next();
});

// CREATE COMIC - AUTH
router.post("/", isAuthenticated, isVerified, async (req, res, next) => {
    const user = req.user as IUser;

    const newComic = new Comic({
        title: "Unnamed Comic",
        author: user._id,
    });

    await newComic.save();

    user.comics.push(newComic._id);
    await user.save();

    res.status(200).json({ data: newComic });
    return next();
});

// UPDATE COMIC - AUTH
router.put("/:id", isAuthenticated, isVerified, findComic, isAuthor, async (req, res, next) => {
    let comic: IComic | null = req.payload as IComic;

    // TODO assert that req.body.comic is actually a comic
    const updatedComic = req.body.comic as IComic;
    comic = await Comic.findByIdAndUpdate(comic?._id, updatedComic, {
        returnDocument: "after",
    });

    res.status(200).json({ data: comic });
    return next();
});

// DELETE COMIC - AUTH
router.delete("/:id", isAuthenticated, isVerified, findComic, isAuthor, async (req, res, next) => {
    const user = req.user as IUser;
    const comic = req.payload as IComic;

    await comic.delete();
    await User.findByIdAndUpdate(user._id, { $pull: { comics: comic._id } });
    res.status(200).json({ message: "Successfully deleted comic." });
    return next();
});

// PUBLISH COMIC
router.put(
    "/publish/:id",
    isAuthenticated,
    isVerified,
    findComic,
    isAuthor,
    async (req, res, next) => {
        let comic = req.payload as IComic;
        const { renderedImage } = req.body;
        const updateObj: { publishedAt: Date; renderedImage?: IImage } = {
            publishedAt: new Date(),
        };
        if (renderedImage) {
            updateObj.renderedImage = renderedImage;
        }
        await Comic.findByIdAndUpdate(comic._id, updateObj);

        res.status(200).json({ message: "successfully published" });
        return next();
    }
);

// UNPUBLISH COMIC
router.put(
    "/unpublish/:id",
    isAuthenticated,
    isVerified,
    findComic,
    isAuthor,
    async (req, res, next) => {
        let comic = req.payload as IComic;

        await Comic.findByIdAndUpdate(comic._id, { publishedAt: null });

        res.status(200).json({ message: "successfully unpublished" });
        return next();
    }
);

// RATE COMIC
router.put(
    "/rate/:id",
    isAuthenticated,
    isVerified,
    findComic,
    isPublished,
    async (req, res, next) => {
        let comic: IComic | null = req.payload as IComic;
        const user = req.user as IUser;

        const rating = parseFloat(req.body.rating);
        if (!comic || !rating || rating > 5 || rating < 0) {
            res.status(400).json({ error: "invalid rating or comic" });
            return next();
        }

        let total = comic.ratingTotal;
        let count = comic.ratingCount;

        const prev = user.comicRatings.find(x => x.id.toString() === req.params.id);
        if (prev) {
            total += rating - prev.rating;
            await User.findByIdAndUpdate(user._id, {
                $pull: { comicRatings: { id: req.params.id } },
            });
        } else {
            count += 1;
            total += rating;
        }

        await User.findByIdAndUpdate(user._id, {
            $push: { comicRatings: { rating: rating, id: req.params.id } },
        });

        comic.ratingTotal = total;
        comic.ratingCount = count;
        comic.rating = total / count;
        await comic.save();

        res.status(200).json({
            data: {
                ratingTotal: comic.ratingTotal,
                ratingCount: comic.ratingCount,
                rating: comic.rating,
            },
        });
        return next();
    }
);

// COMMENT ON COMIC
router.post(
    "/comment/:id",
    isAuthenticated,
    isVerified,
    findComic,
    isPublished,
    async (req, res, next) => {
        let comic: IComic | null = req.payload as IComic;
        const user = req.user as IUser;

        if (!req.body.text) {
            res.status(400).json({ error: "message body is missing information" });
            return next();
        }

        comic = await Comic.findByIdAndUpdate(
            comic?._id,
            {
                $push: {
                    comments: { text: req.body.text, author: user._id, createdAt: new Date() },
                },
            },
            { returnDocument: "after" }
        ).populate("comments.author");

        res.status(200).json({
            data: { comments: comic?.comments },
        });
        return next();
    }
);

// DELETE COMMENT
router.delete(
    "/comment/:id",
    isAuthenticated,
    isVerified,
    findComic,
    isPublished,
    async (req, res, next) => {
        let comic: IComic | null = req.payload as IComic;
        const user = req.user as IUser;

        if (!req.body.createdAt) {
            res.status(400).json({ error: "message body is missing information" });
            return next();
        }

        const filterDate = new Date(req.body.createdAt);

        await comic.populate("comments.author");

        comic.comments = comic.comments.filter(val => {
            if (!val.createdAt) return true;
            return val.createdAt.getTime() !== filterDate.getTime();
        });

        await comic.save();

        res.status(200).json({
            data: { comments: comic?.comments },
        });
        return next();
    }
);

export default router;

import express from "express";
import { isAuthenticated } from "../util/passport-config";
import Comic, { IComic } from "../models/comic";
import User, { IUser } from "../models/user";

const router = express.Router();

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

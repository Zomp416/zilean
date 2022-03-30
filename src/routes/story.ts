import express from "express";
import { isAuthenticated } from "../util/passport-config";
import Story, { IStory } from "../models/story";
import User, { IUser } from "../models/user";

const router = express.Router();

// GET STORY
router.get("/:id", async (req, res, next) => {
    const story = await Story.findById(req.params.id);
    if (!story) {
        res.status(400).json({ error: "No story found" });
        return next();
    }
    res.status(200).json(story);
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
    res.status(200).json(newStory);
    return next();
});

// UPDATE STORY - AUTH
router.put("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const story = await Story.findById(req.params.id);

    if (!story) {
        res.status(400).json({ error: "No story found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to update a story." });
        return next();
    }

    if (story.author !== user._id) {
        res.status(401).json({ error: "Must be the author to update story." });
        return next();
    }

    // TODO assert that req.body.story is actually a story
    const updatedStory = req.body.story as IStory;
    await story.update(updatedStory);

    res.status(200).json(story);
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

    if (story.author !== user._id) {
        res.status(401).json({ error: "Must be the author to delete story." });
        return next();
    }

    await story.delete();
    res.status(200).json({ msg: "Successfully deleted story." });
    return next();
});

export default router;

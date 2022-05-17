import { Request, Response, NextFunction } from "express";
import Comic, { IComic } from "../models/comic";
import { IUser } from "../models/user";
import Image from "../models/image";
import Story, { IStory } from "../models/story";
import mongoose from "mongoose";

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "not logged in" });
};

export const isVerified = (req: Request, res: Response, next: NextFunction) => {
    return next();
    // const user = req.user as IUser;
    // if (!user.verified)
    //     res.status(401).json({ error: "must be verified to perform requested action" });
    // else return next();
};

export const findComic = (req: Request, res: Response, next: NextFunction) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ error: "no comic found with given id" }).end();
        return;
    }
    Comic.findById(req.params.id)
        .exec()
        .then(comic => {
            if (!comic) res.status(400).json({ error: "no comic found with given id" });
            else {
                req.payload = comic;
                return next();
            }
        });
};

export const findStory = (req: Request, res: Response, next: NextFunction) => {
    Story.findById(req.params.id)
        .exec()
        .then(story => {
            if (!story) res.status(400).json({ error: "no story found with given id" });
            else {
                req.payload = story;
                return next();
            }
        });
};

export const findImage = (req: Request, res: Response, next: NextFunction) => {
    Image.findById(req.params.id)
        .exec()
        .then(image => {
            if (!image) res.status(400).json({ error: "no image found with given id" });
            else {
                req.payload = image;
                return next();
            }
        });
};

export const isAuthor = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as IUser;
    if (req.payload?.author?.toString() !== user._id.toString())
        res.status(401).json({ error: "must be the author to modify the selected resource" });
    else return next();
};

export const isPublished = (req: Request, res: Response, next: NextFunction) => {
    const payload = req.payload as IComic | IStory;
    if (!payload.publishedAt)
        res.status(400).json({ error: "resource must be published to perform requested action" });
    else return next();
};

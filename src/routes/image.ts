import express from "express";
import { isAuthenticated } from "../util/passport-config";
import { uploadObject, deleteObject } from "../util/s3-config";
import Image, { IImage } from "../models/image";
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user";
import multer from "multer";
import { v4 } from "uuid";
import { default as isSvg } from "is-svg";
import fileType from "file-type";

const router = express.Router();

const ALLOWED_FILE_TYPES = ["jpg", "jpeg", "png", "svg"];
const DIRECTORY_NAMES = ["assets", "thumbnails", "avatars"];

const upload = (req: Request, res: Response, next: NextFunction) => {
    multer().single("image")(req, res, err => {
        if (err) res.status(400).json({ error: "multer upload error" });
        else return next();
    });
};

// SEARCH IMAGES
router.get("/search", async (req, res, next) => {
    const imageQuery = Image.find();

    // ONLY SHOW SEARCHABLE IMAGES
    const queryFilters: any[] = [
        {
            searchable: true,
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
            uploadedBy: {
                $in: user.subscriptions,
            },
        });
    }

    // USER FILTER
    if (req.query.author) {
        const userFilter = req.query.author as string;
        queryFilters.push({
            uploadedBy: userFilter,
        });
    }

    // NAME FILTER
    if (req.query.value) {
        const nameFilter = req.query.value as string;
        queryFilters.push({
            name: {
                $regex: new RegExp(nameFilter, "i"),
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
            updatedAt: {
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
        imageQuery.and(queryFilters);
    }

    // SORT RESULTS (ex: views, rating)
    if (req.query.sort) {
        imageQuery.sort(req.query.sort);
    }

    // TODO PAGINATION AND LIMITS

    // EXECUTE QUERY
    const images = await imageQuery.exec();

    res.status(200).json({ data: images });
    return;
});

// GET IMAGE
router.get("/:id", async (req, res, next) => {
    const image = await Image.findById(req.params.id);
    if (!image) {
        res.status(400).json({ error: "No image found" });
        return next();
    }
    res.status(200).json({ data: image });
    return next();
});

// UPLOAD IMAGE - AUTH
router.post("/", isAuthenticated, upload, async (req, res, next) => {
    const user = req.user as IUser;
    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to upload an image." });
        return next();
    }

    const file = req.file;
    if (!file) {
        res.status(400).json({ error: "Must include an image." });
        return next();
    }

    // Check file type and get correct file extension
    let fileExt = "";
    let mimeType = "";
    if (isSvg(file.buffer)) {
        fileExt = "svg";
        mimeType = "image/svg+xml";
    } else {
        const fType = await fileType.fromBuffer(file.buffer);
        if (!fType || !ALLOWED_FILE_TYPES.includes(fType.ext)) {
            res.status(400).json({ error: "Invalid file type." });
            return next();
        }
        fileExt = fType.ext;
        mimeType = fType.mime;
    }

    const { directory, name } = req.body;
    if (!directory || !DIRECTORY_NAMES.includes(directory) || !name) {
        res.status(400).json({ error: "Invalid request arguments." });
        return next();
    }

    const searchable = directory === "assets";

    const filePath = `${directory}/${v4()}.${fileExt}`;

    const newImage = new Image({
        name,
        searchable,
        imageURL: filePath,
        uploadedBy: user._id,
    });

    // TODO handle error case
    await newImage.save();
    await uploadObject(filePath, mimeType, file.buffer);

    res.status(200).json({ data: newImage });
    return next();
});

// UPDATE COMIC - AUTH
router.put("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const image = await Image.findById(req.params.id);

    if (!image) {
        res.status(400).json({ error: "No image found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to update an image." });
        return next();
    }

    if (image.uploadedBy !== user._id) {
        res.status(401).json({ error: "Must be the author to update image." });
        return next();
    }

    // TODO assert that req.body.image is actually an image document
    // TODO check if imageURL is being changed, we prob shouldn't let that happen
    const updatedImage = req.body.image as IImage;
    await image.update(updatedImage);

    res.status(200).json({ data: image });
    return next();
});

// DELETE IMAGE - AUTH
router.delete("/:id", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const image = await Image.findById(req.params.id);

    if (!image) {
        res.status(400).json({ error: "No image found" });
        return next();
    }

    if (!user.verified) {
        res.status(401).json({ error: "Must be verified to delete an image." });
        return next();
    }

    if (image.uploadedBy !== user._id) {
        res.status(401).json({ error: "Must be the author to delete image." });
        return next();
    }

    await image.delete();
    await deleteObject(image.imageURL);

    // TODO handle error case
    res.status(200).json({ message: "Successfully deleted image." });
    return next();
});

export default router;

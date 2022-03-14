import express from "express";
import { isAuthenticated } from "../util/passport-config";
import { uploadObject, deleteObject } from "../util/s3-config";
import Image, { IImage } from "../models/image";
import User, { IUser } from "../models/user";
import multer from "multer";
import { v4 } from "uuid";
import { default as isSvg } from 'is-svg';
import fileType from 'file-type';
 
const router = express.Router();
const upload = multer();

const ALLOWED_FILE_TYPES = ["jpg", "jpeg", "png", "svg"];
const DIRECTORY_NAMES = ["assets", "thumbnails", "avatars"];

// GET IMAGE
router.get("/:id", async (req, res, next) => {
    const image = await Image.findById(req.params.id);
    if (!image) {
        res.status(400).json({ error: "No image found" });
        return next();
    }
    res.status(200).json(image);
    return next();
});

// UPLOAD IMAGE - AUTH
router.post("/", isAuthenticated, upload.single('image'), async (req, res, next) => {
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
        author: user._id,
    });

    // TODO handle error case
    await newImage.save();
    await uploadObject(filePath, mimeType, file.buffer);

    res.status(200).json(newImage);
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

    res.status(200).json(image);
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
    res.status(200).json({ msg: "Successfully deleted image." });
    return next();
});

export default router;

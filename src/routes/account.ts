import express from "express";
import bcrypt from "bcrypt";
import passport from "../util/passport-config";
import { isAuthenticated } from "../util/middlewares";
import { sendForgotPasswordEmail, sendVerifyEmail } from "../util/email-config";
import { verifyToken } from "../util/token-config";
import User, { IUser } from "../models/user";
import mongoosePaginate from "mongoose-paginate";

var mongoose = require('mongoose');

const router = express.Router();

// ROUTE TO CHECK IF LOGGED IN
router.get("/", isAuthenticated, (req, res, next) => {
    const user = req.user as IUser;
    res.status(200).json({ data: user });
    return next();
});

// SEARCH USERS
router.get("/search", async (req, res, next) => {
    const userQuery = User.find();

    // NO PRELIMINARY FILTERS
    const queryFilters: any[] = [];

    // SUBSCRIPTIONS FILTER
    if (req.query.subscriptions === "true") {
        if (!req.isAuthenticated()) {
            res.status(400).json({ error: "Must be logged in to show subscriptions" });
            return next();
        }
        const user = req.user as IUser;
        queryFilters.push({
            _id: {
                $in: user.subscriptions,
            },
        });
    }

    // NAME FILTER
    if (req.query.value) {
        const nameFilter = req.query.value as string;
        queryFilters.push({
            username: {
                $regex: new RegExp(nameFilter, "i"),
            },
        });
    }

    // TAGS FILTER - CURRENTLY NOT SUPPORTED FOR USERS...
    // if (req.query.tags) {
    //     if (Array.isArray(req.query.tags)) {
    //         const tags = req.query.tags as string[];
    //         queryFilters.push({
    //             tags: {
    //                 $all: tags,
    //             },
    //         });
    //     } else {
    //         const tag = req.query.tags;
    //         queryFilters.push({
    //             tags: tag,
    //         });
    //     }
    // }

    // ADD FILTERS TO QUERY
    if (queryFilters.length !== 0) {
        userQuery.and(queryFilters);
    }

    // SORT RESULTS (ex: subscriberCount)
    if (req.query.sort) {
        userQuery.sort(req.query.sort);
    }

    // EXECUTE QUERY (with pagination)
    if (req.query.page && req.query.limit) {
        const users = await User.paginate(userQuery, {
            page: parseInt(req.query.page as string),
            limit: parseInt(req.query.limit as string),
        });
        res.status(200).json({ data: users.docs });
    }
    // EXECUTE QUERY (normally)
    else {
        const users = await userQuery.exec();
        res.status(200).json({ data: users });
    }
});

// GET USER
router.get("/:id", async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(400).json({ error: "No user found" });
        return next();
    }
    res.status(200).json({ data: user });
    return next();
});

// LOGIN
router.post("/login", (req, res, next) => {
    // Pass request information to passport
    passport.authenticate("local", function (err, user, info) {
        if (err) {
            return res.status(401).json({ error: err });
        }
        if (!user) {
            return res.status(401).json({ error: info.message });
        }
        req.login(user, function (err) {
            if (err) {
                return res.status(401).json({ error: err });
            }
            return res.status(200).json({ message: `logged in ${user.id}` });
        });
    })(req, res, next);
});

// LOGOUT
router.post("/logout", (req, res, next) => {
    req.logout();
    res.json({ message: "Logged Out!" });
    return next();
});

// REGISTER
router.post("/register", async (req, res, next) => {
    let { email, username, password } = req.body;

    if (!email || !username || !password) {
        res.status(400).json({ error: "Missing arguments in request" });
        return next();
    }

    email = (email as string).toLowerCase();

    const existingUser = await User.findOne({
        $or: [
            {
                email: email,
            },
            {
                username: username,
            },
        ],
    });

    if (existingUser) {
        res.status(400).json({
            error: "Account with that email address and/or username already exists.",
        });
        return next();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        email,
        username,
        password: hashedPassword,
    });

    await user.save();
    await sendVerifyEmail(user);

    // Automatically Login User
    req.login(user, err => {
        if (err) {
            res.status(200).json({ message: "Registered Successfully, Unable to Login." });
        } else {
            res.status(200).json({ message: "Registered Successfully!" });
        }
    });
    return next();
});

// UPDATE USER - AUTH
router.put("/", isAuthenticated, async (req, res, next) => {
    const oldUser = req.user as IUser;
    const newUser = req.body.user as IUser;
    const oldPassword = req.body.user.oldpassword;
    const newPassword = req.body.user.newpassword;
    const confirmPassword = req.body.user.confirmpassword;
    
    if (!newUser) {
        res.status(400).json({ error: "Missing arguments" });
        return next();
    }

    if (newUser._id && newUser._id.toString() !== oldUser._id.toString()) {
        res.status(401).json({ error: "User ID's do not match." });
        return next();
    }

    if(oldPassword === "" && newPassword === "" && confirmPassword === ""){
        const user = await User.findByIdAndUpdate(oldUser._id, newUser, { returnDocument: "after" });
        res.status(200).json({ data: user });
        return next();
    }

    bcrypt.compare(oldPassword, oldUser.password, async function (err, result) {
        if (err) {
            res.status(402).json({ message: "Error in changing password" });
            return;
        } else if (result) {
            if (newPassword !== confirmPassword) {
                res.status(403).json({ message: "Passwords do not match " });
                return next();
            } else {
                 if(oldPassword === newPassword){
                    res.status(403).json({ message: "Choose a different password " });
                    return next();
                 }
                  const hashedPassword = await bcrypt.hash(newPassword, 10);
                  newUser.password = hashedPassword
                  const user = await User.findByIdAndUpdate(oldUser._id, newUser, { returnDocument: "after" });
                  res.status(200).json({ data: user });
                  return next();
            }
        } else {
            res.status(404).json({ message: "Passwords do not match " });
            return next();
        }
    });
});

// SUBSCRIBE TO ANOTHER USER
router.post("/subscribe", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const { subscription, ..._ } = req.body;

    if (user.subscriptions.includes(subscription))
        return res.status(400).json({ error: "already subscribed" });

    await User.findByIdAndUpdate(user._id, {
        $push: { subscriptions: subscription },
    });
    await User.findByIdAndUpdate(subscription, { $inc: { subscriberCount: 1 } });

    res.status(200).json({ message: "subscribed successfully" });
    return next();
});

// UNSUBSCRIBE FROM ANOTHER USER
router.post("/unsubscribe", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    const { subscription, ..._ } = req.body;

    if (!user.subscriptions.includes(subscription))
        return res.status(400).json({ error: "not subscribed" });

    await User.findByIdAndUpdate(user._id, {
        $pull: { subscriptions: subscription },
    });
    await User.findByIdAndUpdate(subscription, { $inc: { subscriberCount: -1 } });

    res.status(200).json({ message: "unsubscribed successfully" });
    return next();
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: "Missing email" });
        return next();
    }

    const user = await User.findOne({ email: email });
    if (!user) {
        res.status(400).json({ error: "No user with specified email" });
        return next();
    }

    const result = await sendForgotPasswordEmail(user);

    res.status(200).json({ message: result });
    return next();
});

// RESET PASSWORD
router.post("/reset-password", async (req, res, next) => {
    const { id, token, password } = req.body;

    if (!id || !token || !password) {
        res.status(400).json({ error: "Must provide all required arguments to reset password" });
        return next();
    }

    const user = await User.findOne({ _id: id });
    if (!user) {
        res.status(400).json({ error: "User not found" });
        return next();
    }

    const payload = verifyToken(user, token);

    if (!payload) {
        res.status(400).json({ error: "Token is invalid or expired" });
        return next();
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: "OK" });
    return next();
});

// SEND VERIFICATION EMAIL
router.post("/send-verify", async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ error: "Missing email" });
        return next();
    }

    const user = await User.findOne({ email: email });
    if (!user) {
        res.status(400).json({ error: "No user with specified email" });
        return next();
    }

    const result = await sendVerifyEmail(user);

    res.status(200).json({ message: result });
    return next();
});

// VERIFY EMAIL
router.post("/verify", async (req, res, next) => {
    const { id, token } = req.body;

    if (!id || !token) {
        res.status(400).json({ error: "Must provide all required arguments to verify user" });
        return next();
    }

    const user = await User.findOne({ _id: id });
    if (!user) {
        res.status(400).json({ error: "User not found" });
        return next();
    }

    const payload = verifyToken(user, token);

    if (!payload) {
        res.status(400).json({ error: "Token is invalid or expired" });
        return next();
    }

    user.verified = true;
    await user.save();

    res.status(200).json({ message: "OK" });
    return next();
});

// DELETE ACCOUNT
router.delete("/", isAuthenticated, async (req, res, next) => {
    const user = req.user as IUser;
    if (!user) {
        res.status(400).json({ error: "No user found" });
        return next();
    }
    const result = await User.findByIdAndRemove(user._id);
    if (!result) {
        res.status(401).json({ error: "Error deleting account" });
        return next();
    }
    res.json({ message: "Deleted Account" });
    return next();
});

export default router;

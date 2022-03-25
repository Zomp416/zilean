import express from "express";
import bcrypt from "bcrypt";
import passport, { isAuthenticated } from "../util/passport-config";
import { sendForgotPasswordEmail, sendVerifyEmail } from "../util/email-config";
import { verifyToken } from "../util/token-config";
import User, { IUser } from "../models/user";

const router = express.Router();

// ROUTE TO CHECK IF LOGGED IN
router.get("/", isAuthenticated, (req, res, next) => {
    const user = req.user as IUser;
    res.status(200).json({ user });
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
            uploadedBy: {
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

    // TODO PAGINATION AND LIMITS

    // EXECUTE QUERY
    const users = await userQuery.exec();

    res.status(200).json(users);
    return;
});

// GET USER
router.get("/:id", async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(400).json({ error: "No user found" });
        return next();
    }
    res.status(200).json(user);
    return next();
});

// LOGIN
router.post("/login", (req, res, next) => {
    // TODO DECIDE ON LOWERCASE/UPPERCASE HANDLING
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
            return res.status(200).json({ success: `logged in ${user.id}` });
        });
    })(req, res, next);
});

// LOGOUT
router.post("/logout", (req, res, next) => {
    req.logout();
    res.json({ msg: "Logged Out!" });
    return next();
});

// REGISTER
router.post("/register", async (req, res, next) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        res.status(400).json({ msg: "Missing arguments in request" });
        return next();
    }

    // TODO DECIDE ON LOWERCASE/UPPERCASE HANDLING

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
            msg: "Account with that email address and/or username already exists.",
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
            res.status(200).json({ msg: "Registered Successfully, Unable to Login." });
        } else {
            res.status(200).json({ msg: "Registered Successfully!" });
        }
    });
    return next();
});

// UPDATE USER - AUTH
router.put("/", isAuthenticated, async (req, res, next) => {
    const oldUser = req.user as IUser;
    const newUser = req.body.user as IUser;

    if (!newUser) {
        res.status(400).json({ error: "Missing arguments" });
        return next();
    }

    if (newUser._id !== oldUser._id) {
        res.status(401).json({ error: "User ID's do not match." });
        return next();
    }

    const user = await oldUser.update(newUser);

    res.status(200).json(user);
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

    res.status(200).json(result);
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

    res.status(200).json({ msg: "OK" });
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

    res.status(200).json(result);
    return next();
});

// VERIFY EMAIL
router.post("/verify", async (req, res, next) => {
    const { id, token } = req.body;

    if (!id || !token) {
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

    user.verified = true;
    await user.save();

    res.status(200).json({ msg: "OK" });
    return next();
});

export default router;

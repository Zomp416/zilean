import express from "express";
import bcrypt from "bcrypt";
import passport, { isAuthenticated } from "../util/passport-config";
import { IVerifyOptions } from "passport-local";
import User, { IUser } from "../models/user";

const router = express.Router();

// LOGIN
router.post("/login", (req, res, next) => {
    // Pass request information to passport
    passport.authenticate("local", function (err, user, info) {
        if (err) {
            return res.status(400).json({ errors: err });
        }
        if (!user) {
            return res.status(400).json({ errors: "No user found" });
        }
        req.logIn(user, function (err) {
            if (err) {
                return res.status(400).json({ errors: err });
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
        res.json({ msg: "Missing arguments in request" });
        return next();
    }

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
        res.json({ msg: "Account with that email address and/or username already exists." });
        return next();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        email,
        username,
        password: hashedPassword,
    });

    await user.save();
    res.json({ msg: "Registered Successfully" });
    return next();
});

// TEST ROUTE TO CHECK IF LOGGED IN
router.get("/test-check", isAuthenticated, (req, res, next) => {
    const user = req.user as IUser;
    res.json({ user });
    return next();
});

export default router;

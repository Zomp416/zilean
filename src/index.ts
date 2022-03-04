import "dotenv/config";
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import passport from "./util/passport-config";
import userRouter from "./routes/user";

async function main() {
    const mongo_uri = process.env.MONGO_URI;
    if (!mongo_uri) throw new Error("No MongoDB URI");

    await mongoose.connect(mongo_uri);
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
        session({
            resave: true,
            saveUninitialized: true,
            secret: "adsfadsfadsfadsf",
            store: new MongoStore({
                mongoUrl: mongo_uri,
                ttl: 14 * 24 * 60 * 60, // 14 Days
            }),
        })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    app.use((req, res, next) => {
        res.locals.user = req.user;
        next();
    });

    app.use("/", userRouter);

    app.get("/", (req, res) => {
        res.send("Hello world!");
    });

    app.listen(process.env.PORT, () => {
        console.log(`🚀 Zilean backend service now listening on port ${process.env.PORT}`);
    });
}

main().catch(err => console.log(err));

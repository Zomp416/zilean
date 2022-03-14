import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import passport from "./util/passport-config";
import userRouter from "./routes/user";
import comicRouter from "./routes/comic";
import imageRouter from "./routes/image";

async function main() {
    const mongo_uri = process.env.MONGO_URI;
    if (!mongo_uri) throw new Error("No MongoDB URI");

    await mongoose.connect(mongo_uri);
    const app = express();

    // TODO add other origins
    const allowedOrigins = ["http://localhost:3000"];
    allowedOrigins.forEach(origin => {
        app.use(cors({ origin: origin, credentials: true }));
    })
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
        session({
            resave: true,
            saveUninitialized: true,
            secret: process.env.SESSION_SECRET!,
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
    app.use("/comic", comicRouter);
    app.use("/image", imageRouter);

    app.get("/", (req, res) => {
        res.send("Hello world!");
    });

    app.listen(process.env.PORT, () => {
        console.log(`🚀 Zilean backend service now listening on port ${process.env.PORT}`);
    });
}

main().catch(err => console.log(err));

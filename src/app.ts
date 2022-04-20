import express from "express";
import session from "express-session";
import cors from "cors";
import MongoStore from "connect-mongo";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import passport from "./util/passport-config";
import accountRouter from "./routes/account";
import comicRouter from "./routes/comic";
import imageRouter from "./routes/image";
import storyRouter from "./routes/story";

const createApp = (mongo_uri: string, session_secret: string) => {
    const app = express();

    app.use(cors({ origin: true, credentials: true }));
    app.use(helmet());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(mongoSanitize());
    app.use(
        session({
            cookie: {
                domain: process.env.ENV === "production" ? ".zomp.works" : "localhost"
            },
            resave: true,
            saveUninitialized: true,
            secret: session_secret,
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

    app.use("/account", accountRouter);
    app.use("/comic", comicRouter);
    app.use("/image", imageRouter);
    app.use("/story", storyRouter);

    app.get("/", (req, res) => {
        res.send("Hello world!");
    });
    return app;
};

export default createApp;

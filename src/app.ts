import express from "express";
import session from "express-session";
import cors from "cors";
import MongoStore from "connect-mongo";
import passport from "./util/passport-config";
import userRouter from "./routes/user";
import comicRouter from "./routes/comic";
import imageRouter from "./routes/image";

const createApp = (mongo_uri: string, secret: string) => {
    const app = express();

    // TODO add other origins
    const allowedOrigins = ["http://localhost:3000"];
    allowedOrigins.forEach(origin => {
        app.use(cors({ origin: origin, credentials: true }));
    });
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(
        session({
            resave: true,
            saveUninitialized: true,
            secret,
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

    app.use("/account", userRouter);
    app.use("/comic", comicRouter);
    app.use("/image", imageRouter);

    app.get("/", (req, res) => {
        res.send("Hello world!");
    });
    return app;
};

export default createApp;

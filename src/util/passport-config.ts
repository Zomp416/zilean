import bcrypt from "bcrypt";
import { NativeError } from "mongoose";
import passport from "passport";
import passportLocal from "passport-local";
import User, { IUser } from "../models/user";

const LocalStrategy = passportLocal.Strategy;

passport.serializeUser<any, any>((_, user, done) => {
    done(undefined, user);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err: NativeError, user: IUser) => done(err, user));
});

// Local Strategy
passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
        // Find user with given email
        let err;
        const user = await User.findOne({ email: email.toLowerCase() }).catch(e => {
            err = "mongodb server connection issue";
        });
        if (err) return done(err);

        if (!user) {
            return done(undefined, false, { message: "User not found." });
        }
        const result = await bcrypt.compare(password, user.password);
        if (result) {
            return done(undefined, user);
        } else {
            return done(undefined, false, {
                message: "Invalid username or password.",
            });
        }
    })
);
export default passport;

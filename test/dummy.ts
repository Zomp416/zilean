import crypto from "crypto";
import bcrypt from "bcrypt";

import User, { IUser } from "../src/models/user";

export const dummyUser = async ({
    save = true,
    session = null,
    verified = true,
}: {
    save?: boolean;
    session?: any;
    verified?: boolean;
} = {}) => {
    const username = crypto.randomBytes(20).toString("hex");
    const email = crypto.randomBytes(20).toString("hex");
    const password = crypto.randomBytes(20).toString("hex");
    const hash = await bcrypt.hash(password, 10);
    const login = { email, password };
    const register = { email, password, username };
    const db: IUser | null = save
        ? await new User({ username, email, password: hash, verified }).save()
        : null;
    if (session) await session.post("/account/login").send(login);

    return { login, db, register, username, email, password, hash };
};

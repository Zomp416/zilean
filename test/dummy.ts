import crypto from "crypto";
import bcrypt from "bcrypt";

import User, { IUser } from "../src/models/user";

export const dummyUser = async (save = true) => {
    const username = crypto.randomBytes(20).toString("hex");
    const email = crypto.randomBytes(20).toString("hex");
    const password = crypto.randomBytes(20).toString("hex");
    const hash = await bcrypt.hash(password, 10);
    let db: IUser | null = null;
    if (save) db = await new User({ username, email, password: hash }).save();
    const login = { email, password };
    return { login, db };
};

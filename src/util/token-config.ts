import jwt from "jsonwebtoken";
import { IUser } from "../models/user";

export const generateToken = (user: IUser) => {
    const secret = process.env.JWT_SECRET + user.password;
    return jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: "1hr" });
};

export const verifyToken = (user: IUser, token: string) => {
    const secret = process.env.JWT_SECRET + user.password;
    try {
        return jwt.verify(token, secret);
    } catch (e) {
        return null;
    }
};

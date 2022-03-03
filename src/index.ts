import "dotenv/config";
import express from "express";
import mongoose from "mongoose";

async function main() {
    const mongo_uri = process.env.MONGO_URI;
    if (!mongo_uri) throw new Error("No MongoDB URI");

    await mongoose.connect(mongo_uri);
    const app = express();

    app.get("/", (req, res) => {
        res.send("Hello world!");
    });

    app.listen(process.env.PORT, () => {
        console.log(
            `🚀 Zilean backend service now listening on port ${process.env.PORT}`
        );
    });
}

main().catch(err => console.log(err));

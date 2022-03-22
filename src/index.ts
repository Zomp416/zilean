import "dotenv/config";
import mongoose from "mongoose";
import createApp from "./app";

async function main() {
    const mongo_uri = process.env.MONGO_URI;
    const secret = process.env.SESSION_SECRET;

    if (!mongo_uri) throw new Error("No MongoDB URI");
    if (!secret) throw new Error("No secret");

    await mongoose.connect(mongo_uri);

    const app = createApp(mongo_uri, secret);

    app.listen(process.env.PORT, () => {
        console.log(`🚀 Zilean backend service now listening on port ${process.env.PORT}`);
    });
}

main().catch(err => console.log(err));

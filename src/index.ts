import express from "express";

const app = express();
const port = 8080;

app.get("/", (req, res) => {
    res.send("Hello world!");
});

app.listen(port, () => {
    console.log(`🚀 Zilean backend service now listening on port ${port}`);
});
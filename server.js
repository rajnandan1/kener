import { handler } from "./build/handler.js";
import express from "express";
import { Startup } from "./scripts/startup.js";
process.env.TZ = "UTC";
const PORT = process.env.PORT || 3000;
Startup();

const app = express();

app.get("/healthcheck", (req, res) => {
    res.end("ok");
});

app.use(handler);

app.listen(PORT, () => {
    console.log("Kener is running on port " + PORT + "!");
});

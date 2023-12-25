import { handler } from "./build/handler.js";
import express from "express";
import { STATUS_OK } from "./scripts/check.js";
import { Startup } from "./scripts/startup.js";
const PORT = process.env.PORT || 3000;
console.log("STATUS_OK", STATUS_OK);
Startup();

const app = express();

app.get("/healthcheck", (req, res) => {
    res.end("ok");
});

app.use(handler);

app.listen(PORT, () => {
    console.log("Kener is running on port " + PORT + "!");
});

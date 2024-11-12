import { handler } from "./build/handler.js";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
const PORT = process.env.PORT || 3000;

const app = express();
app.use(handler);

app.listen(PORT, () => {
	console.log("Kener is running on port " + PORT + "!");
});

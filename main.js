import { handler } from "./build/handler.js";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import sitemap from "./sitemap.js";
const PORT = process.env.PORT || 3000;

const app = express();
app.use((req, res, next) => {
	if (req.path.startsWith("/embed")) {
		res.setHeader("Content-Security-Policy", "frame-ancestors *");
	}
	res.setHeader("X-Powered-By", "Kener");
	next();
});
app.get("/healthcheck", (req, res) => {
	res.end("ok");
});
app.get("/sitemap.xml", (req, res) => {
	res.setHeader("Content-Type", "application/xml");
	res.end(sitemap);
});
app.use(handler);

app.listen(PORT, () => {
	console.log("Kener is running on port " + PORT + "!");
});

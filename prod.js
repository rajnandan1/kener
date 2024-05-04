import { handler } from "./build/handler.js";
import express from "express";
import { STATUS_OK } from "./scripts/check.js";
import { Startup } from "./scripts/startup.js";
import sitemap from "./scripts/sitemap.js";
const PORT = process.env.PORT || 3000;
console.log("STATUS_OK", STATUS_OK);
Startup();

const app = express();
app.use((req, res, next) => {
	if (req.path.startsWith("/embed")) {
		res.setHeader("X-Frame-Options", "None");
	}
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

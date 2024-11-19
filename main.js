import { handler } from "./build/handler.js";
import { apiReference } from "@scalar/express-api-reference";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import sitemap from "./sitemap.js";
import fs from "fs-extra";
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

try {
	const openapiJSON = fs.readFileSync("./openapi.json", "utf-8");
	app.use(
		"/api-reference",
		apiReference({
			spec: {
				content: openapiJSON
			},
			theme: "alternate",
			hideModels: true,
			hideTestRequestButton: true,
			darkMode: true,
			metaData: {
				title: "Kener API Reference",
				description: "Kener free open source status page API Reference",
				ogDescription: "Kener free open source status page API Reference",
				ogTitle: "Kener API Reference",
				ogImage: "https://kener.ing/newbg.png",
				twitterCard: "summary_large_image",
				twitterTitle: "Kener API Reference",
				twitterDescription: "Kener free open source status page API Reference",
				twitterImage: "https://kener.ing/newbg.png"
			},
			favicon: "https://kener.ing/logo96.png"
		})
	);
} catch (e) {
	console.warn("Error loading openapi.json, but that is okay.");
}
app.get("/sitemap.xml", (req, res) => {
	res.setHeader("Content-Type", "application/xml");
	res.end(sitemap);
});

app.use(handler);

app.listen(PORT, () => {
	console.log("Kener is running on port " + PORT + "!");
});

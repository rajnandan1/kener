import { handler } from "./build/handler.js";
import { apiReference } from "@scalar/express-api-reference";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import sitemap from "./sitemap.js";
import Startup from "./src/lib/server/startup.js";
import fs from "fs-extra";
import knex from "knex";
import knexOb from "./knexfile.js";

const PORT = process.env.PORT || 3000;

const app = express();
const db = knex(knexOb);

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

//migrations
async function runMigrations() {
	try {
		console.log("Running migrations...");
		await db.migrate.latest(); // Runs migrations to the latest state
		console.log("Migrations completed successfully!");
	} catch (err) {
		console.error("Error running migrations:", err);
	}
}

//seed
async function runSeed() {
	try {
		console.log("Running seed...");
		await db.seed.run(); // Runs seed to the latest state
		console.log("Seed completed successfully!");
	} catch (err) {
		console.error("Error running seed:", err);
	}
}

app.listen(PORT, async () => {
	await runMigrations();
	await runSeed();
	await db.destroy();

	console.log("Kener is running on port " + PORT + "!");
});

Startup();

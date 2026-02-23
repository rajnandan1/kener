import { handler } from "../build/handler.js";
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import Startup from "../src/lib/server/startup.ts";
import shutdownSchedulers from "../src/lib/server/schedulers/shutdown.ts";
import shutdownQueues from "../src/lib/server/queues/shutdown.ts";
import dbInstance from "../src/lib/server/db/db.ts";
import knex from "knex";
import knexOb from "../knexfile.js";

const PORT = process.env.PORT || 3000;
const base = process.env.KENER_BASE_PATH || "";

const app: any = express();
const db = knex(knexOb);

app.get(base + "/healthcheck", (req: any, res: any) => {
  res.end("ok");
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
  Startup();
  console.log("Kener is running on port " + PORT + "!");
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  try {
    console.log("Shutting down schedulers...");
    await shutdownSchedulers();
    console.log("Schedulers shut down successfully.");

    console.log("Shutting down queues...");
    await shutdownQueues();
    console.log("Queues shut down successfully.");

    console.log("Closing database connection...");
    await dbInstance.close();
    console.log("Database connection closed successfully.");

    console.log("Graceful shutdown completed.");
    process.exit(0);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
}

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

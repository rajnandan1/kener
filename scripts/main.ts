import dotenv from "dotenv";
dotenv.config();

import express from "express";
import Startup from "../src/lib/server/startup.ts";
import shutdownSchedulers from "../src/lib/server/schedulers/shutdown.ts";
import shutdownQueues from "../src/lib/server/queues/shutdown.ts";
import dbInstance from "../src/lib/server/db/db.ts";
import { redisConnection } from "../src/lib/server/redisConnector.ts";
import knex from "knex";
import knexOb from "../knexfile.js";

const PORT = process.env.PORT || 3000;
const base = process.env.KENER_BASE_PATH || "";

async function start() {
  // Dynamic import so BODY_SIZE_LIMIT from .env is available
  // before the handler reads it at module top-level
  const { handler } = await import("../build/handler.js");

  const app: any = express();
  const db = knex(knexOb);

  // Caps a health probe at 2s so a wedged dependency can not hang the
  // endpoint. A probe is healthy unless it throws, times out, or resolves false.
  const probe = async (check: () => Promise<unknown>): Promise<boolean> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        check(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("health probe timeout")), 2000);
        }),
      ]);
      return result !== false;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };

  // Reports component health. Always 200 so healthcheck-driven restarters do
  // not bounce the app while a dependency is down (a restart can not fix a
  // dead database); pass ?strict=1 to get 503 when any component is down.
  app.get(base + "/healthcheck", async (req: any, res: any) => {
    const [dbOk, redisOk] = await Promise.all([
      probe(() => dbInstance.ping()),
      // Guard on status before PING: the shared ioredis client has
      // maxRetriesPerRequest null, so commands sent while disconnected would
      // queue forever and accumulate across healthcheck polls
      probe(async () => {
        const redis = redisConnection();
        if (redis.status !== "ready") return false;
        return await redis.ping();
      }),
    ]);
    const healthy = dbOk && redisOk;
    const strict = req.query.strict === "1";
    res.status(strict && !healthy ? 503 : 200).json({
      status: healthy ? "ok" : "degraded",
      db: dbOk,
      redis: redisOk,
    });
  });

  app.use(handler);

  //migrations
  async function runMigrations() {
    try {
      // Rename old .js migration entries to .ts in the knex_migrations table
      // so Knex can find the renamed files on disk
      const hasTable = await db.schema.hasTable("knex_migrations");
      if (hasTable) {
        const oldJsMigrations = await db("knex_migrations").where("name", "like", "%.js");
        for (const row of oldJsMigrations) {
          const newName = row.name.replace(/\.js$/, ".ts");
          await db("knex_migrations").where("id", row.id).update({ name: newName });
          console.log(`Renamed migration record: ${row.name} -> ${newName}`);
        }
      }

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
}

start();

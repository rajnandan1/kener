// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();

const databaseURL = process.env.DATABASE_URL || "sqlite://./database/kener.sqlite.db";

const databaseURLParts = databaseURL.split("://");
const databaseType = databaseURLParts[0];
const databasePath = databaseURLParts[1];

const knexOb = {
  migrations: {
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
  databaseType,
};
if (databaseType === "sqlite") {
  knexOb.client = "better-sqlite3";
  knexOb.connection = {
    filename: databasePath,
  };
  knexOb.useNullAsDefault = true;
} else if (databaseType === "postgresql") {
  knexOb.client = "pg";
  knexOb.connection = databaseURL;
} else if (databaseType === "mysql") {
  knexOb.client = "mysql2";
  knexOb.connection = databaseURL;
} else {
  console.error("Invalid database type");
  process.exit(1);
}

export default knexOb;

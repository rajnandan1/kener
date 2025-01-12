// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();

const databaseURL = process.env.DATABASE_URL || "sqlite://./database/kener.sqlite.db";

const databaseURLParts = databaseURL.split("://");
const databaseType = databaseURLParts[0];
const databasePath = databaseURLParts[1];

const knexOb = {
	client: "better-sqlite3",
	connection: {
		filename: databasePath
	},
	useNullAsDefault: true,
	migrations: {
		directory: "./migrations"
	},
	seeds: {
		directory: "./seeds"
	}
};

if (databaseType === "postgresql") {
	knexOb.client = "pg";
	knexOb.connection = process.env.DATABASE_URL;
}

export default knexOb;

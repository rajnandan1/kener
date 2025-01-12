// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();

const dbType = process.env.DATABASE_TYPE || "sqlite";

const knexOb = {
	client: "better-sqlite3",
	connection: {
		filename: process.env.SQLITE_FILEPATH || "./database/kener.local7.db"
	},
	useNullAsDefault: true,
	migrations: {
		directory: "./migrations"
	},
	seeds: {
		directory: "./seeds"
	}
};

if (dbType === "postgres") {
	knexOb.client = "pg";
	knexOb.connection = process.env.POSTGRES_DATABASE_URL;
}

export default knexOb;

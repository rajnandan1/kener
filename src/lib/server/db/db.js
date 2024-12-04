// @ts-nocheck
import Sqlite from "./sqlite.js";
import Postgres from "./postgres.js";
import migration2 from "./migration2.js";
import { serverStore } from "../stores/server.js";
import { get } from "svelte/store";

let instance = null;

const server = get(serverStore);
let database = server.database;
if (database === undefined) {
	database = {
		sqlite: {
			dbName: "kener.db"
		}
	};
}
const supportedDatabases = ["sqlite", "postgres"];
const dbType = Object.keys(database)[0] || "sqlite";
const dbConfig = database[dbType];

if (!supportedDatabases.includes(dbType)) {
	console.error(`Database type ${dbType} is not supported`);
	process.exit(1);
}

if (dbType === "sqlite") {
	if (dbConfig.dbName === undefined) {
		console.error("dbName name is required for sqlite database");
		process.exit(1);
	}
	instance = new Sqlite({
		dbName: `./database/${dbConfig.dbName}`
	});
} else if (dbType == "postgres") {
	if (dbConfig.user === undefined) {
		console.error("user is required for postgres database");
		process.exit(1);
	}
	if (dbConfig.host === undefined) {
		console.error("host is required for postgres database");
		process.exit(1);
	}
	if (dbConfig.port === undefined) {
		console.error("port is required for postgres database");
		process.exit(1);
	}
	if (dbConfig.database === undefined) {
		console.error("database is required for postgres database");
		process.exit(1);
	}
	if (dbConfig.password === undefined) {
		console.error("password is required for postgres database");
		process.exit(1);
	}
	instance = new Postgres(dbConfig);
}

migration2(instance, "./database");

//create anonymous function to call the init function

export default instance;

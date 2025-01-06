// @ts-nocheck
import Sqlite from "./sqlite.js";
import Postgres from "./postgres.js";

let instance = null;

let database = {
	sqlite: {
		dbName: "kener.local5.db"
	}
};
const supportedDatabases = ["sqlite"];
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
}

//migration2(instance, "./database");

//create anonymous function to call the init function

export default instance;

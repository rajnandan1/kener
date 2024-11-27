import Sqlite from "./sqlite.js";

const dbType = "sqlite";

let instance = null;

if (dbType === "sqlite") {
	instance = new Sqlite({
		dbName: "database/test.db"
	});
}

export default instance;

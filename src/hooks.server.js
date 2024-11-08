// src/routes/+server.js
import { Startup } from "$lib/server/startup.js";
import { STATUS_OK } from "$lib/server/check.js";
(async () => {
	console.log("Starting server...");
	console.log("Server started with status: " + STATUS_OK);
	await Startup();
})();

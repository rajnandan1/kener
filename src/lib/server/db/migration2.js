// @ts-nocheck
import fs from "fs-extra";

/**
 * @param {string} _path
 */
export default async function migration2(db, _path) {
	//read any file that ends with 0day.utc.json
	const files = await fs.readdir(_path);
	const data = {};
	for (const file of files) {
		if (file.endsWith(".0day.utc.json")) {
			const content = await fs.readJson(`${_path}/${file}`);
			//get the first part
			const parts = file.split(".");
			const key = parts[0];
			data[key] = content;
		}
	}

	if (Object.keys(data).length === 0) {
		return;
	}

	console.log("Migrating data to the database");

	for (const tag in data) {
		if (Object.prototype.hasOwnProperty.call(data, tag)) {
			const content = data[tag];

			for (const ts in content) {
				if (Object.prototype.hasOwnProperty.call(content, ts)) {
					const element = content[ts];
					const insertData = {
						monitorTag: tag,
						timestamp: ts,
						status: element.status,
						latency: element.latency,
						type: element.type
					};
					await db.insertData(insertData);
				}
			}

			//remove the file
			await fs.remove(`${_path}/${tag}.0day.utc.json`);
		}
	}
}

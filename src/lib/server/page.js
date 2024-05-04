// @ts-nocheck
// @ts-ignore
import fs from "fs-extra";

const FetchData = async function (monitor) {
	return fs.readJsonSync(monitor.path90Day);
};
export { FetchData };

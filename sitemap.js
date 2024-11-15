//read from process.env.PUBLIC_KENER_FOLDER / site.json
//read from process.env.PUBLIC_KENER_FOLDER / monitors.json
// create sitemap.xml
import fs from "fs-extra";
let siteMap = "";
import dotenv from "dotenv";
dotenv.config();
const site = fs.readJSONSync("./database/site.json", "utf8");
const monitors = fs.readJSONSync("./database/monitors.json", "utf8");
if (site.siteURL !== undefined && site.siteURL !== null && site.siteURL !== "") {
	if (monitors.length > 0) {
		siteMap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
	xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
	xmlns:xsi="https://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="https://www.sitemaps.org/schemas/sitemap/0.9
	https://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
	${monitors
		.map((monitor) => {
			return `
	<url>
		<loc>${site.siteURL}/incident/${monitor.folderName}</loc>
		<lastmod>${new Date().toISOString()}</lastmod>
		<changefreq>daily</changefreq>
		<priority>0.8</priority>
	</url>`;
		})
		.join("\n")}
	${monitors
		.map((monitor) => {
			return `
	<url>
		<loc>${site.siteURL}/monitor-${encodeURIComponent(monitor.tag)}</loc>
		<lastmod>${new Date().toISOString()}</lastmod>
		<changefreq>daily</changefreq>
		<priority>0.8</priority>
	</url>`;
		})
		.join("\n")}
</urlset>`;
	}
}

//export default siteMap
export default siteMap;

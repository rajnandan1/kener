// @ts-nocheck
import path from "path";

export async function load({ params, route, url, cookies, request }) {
	const docFile = params.doc;

	const docFolderPath = path.resolve("docs");
	let docFilePath = docFolderPath + "/home.md";
	if (docFile) {
		docFilePath = docFolderPath + `/${docFile}.md`;
	}

	return {
		docFilePath: docFilePath.replace(docFolderPath, "")
	};
}

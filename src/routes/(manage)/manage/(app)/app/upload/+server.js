// @ts-nocheck
import { writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { json } from "@sveltejs/kit";
import { VerifyToken } from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
	let tokenData = cookies.get("kener-user");

	if (!!!tokenData) {
		return json(
			{
				error: "Unauthorized"
			},
			{ status: 401 }
		);
	}

	let tokenUser = await VerifyToken(tokenData);
	if (!!!tokenUser) {
		//redirect to signin page if user is not authenticated
		return json(
			{
				error: "Unauthorized"
			},
			{ status: 401 }
		);
	}
	// Parse the form data from the request
	const formData = await request.formData();

	// Get the image file from the form data
	const imageFile = formData.get("image");

	// Generate a unique filename
	const filename = `${randomUUID()}-${imageFile.name}`;

	// Read the file as a buffer
	const fileBuffer = await imageFile.arrayBuffer();

	let uploadPath = process.env.UPLOAD_PATH || "./static/uploads";
	// Save the file to the static directory
	writeFileSync(`${uploadPath}/${filename}`, Buffer.from(fileBuffer));

	// Return a response
	return json({ filename });
}

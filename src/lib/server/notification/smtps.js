// @ts-nocheck
import nodemailer from "nodemailer";
import { HashString } from "../controllers/controller.js";
const transports = {};
export default function getSMTPTransport(meta) {
	//convert meta to string and generate has id

	let transportId = "smtp_" + HashString(JSON.stringify(meta));

	if (!!transports[transportId]) {
		return transports[transportId];
	}

	const transporter = nodemailer.createTransport({
		host: meta.smtp_host,
		port: Number(meta.smtp_port) || 587,
		secure: meta.smtp_secure, // true for 465, false for other ports
		auth: {
			user: meta.smtp_user,
			pass: meta.smtp_pass
		}
	});
	transports[transportId] = transporter;

	return transporter;
}

// @ts-nocheck

import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";

class Webhook {
	url;
	headers;
	method;
	siteData;
	monitorData;

	constructor(url, headers, method, siteData, monitorData) {
		const kenerHeader = {
			"Content-Type": "application/json",
			"User-Agent": "Kener/2.0.0"
		};

		this.url = url;
		this.headers = Object.assign(kenerHeader, headers);
		this.method = method || "POST";
		this.siteData = siteData;
		this.monitorData = monitorData;

		let envSecrets = GetRequiredSecrets(`${this.url} ${JSON.stringify(this.headers)}`);

		for (let i = 0; i < envSecrets.length; i++) {
			const secret = envSecrets[i];
			this.url = ReplaceAllOccurrences(this.url, secret.key, secret.value);
			this.headers = JSON.parse(
				ReplaceAllOccurrences(JSON.stringify(this.headers), secret.find, secret.replace)
			);
		}
	}

	transformData(data) {
		return data;
	}

	type() {
		return "webhook";
	}

	async send(data) {
		try {
			const response = await fetch(this.url, {
				method: this.method,
				headers: this.headers,
				body: JSON.stringify(this.transformData(data))
			});
			return response;
		} catch (error) {
			console.error("Error sending webhook", error);
			return error;
		}
	}
}

export default Webhook;

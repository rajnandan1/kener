// @ts-nocheck
import dns2 from "dns2";
import dgram from "dgram";
import { AllRecordTypes } from "./constants.js";

class DNSResolver {
	constructor(nameserver = "8.8.8.8") {
		this.nameserver = nameserver;
		this.socket = dgram.createSocket("udp4");
	}

	createQuery(domain, type) {
		const packet = new dns2.Packet();
		packet.header.id = 1;
		packet.header.rd = 1;
		packet.questions.push({
			name: domain,
			type: AllRecordTypes[type],
			class: 1
		});
		return packet;
	}

	async query(domain, recordType) {
		return new Promise((resolve, reject) => {
			const query = this.createQuery(domain, recordType);
			const buffer = query.toBuffer();

			this.socket.on("message", (message) => {
				const response = dns2.Packet.parse(message);
				resolve(response);
			});

			this.socket.send(buffer, 0, buffer.length, 53, this.nameserver, (err) => {
				if (err) reject(err);
			});
		});
	}

	extractData(answer, recordType) {
		switch (recordType) {
			case "A":
			case "AAAA":
				return answer.address;
			case "NS":
				return answer.ns;
			case "CNAME":
				return answer.domain;
			case "MX":
				return {
					exchange: answer.exchange,
					priority: answer.priority
				};
			default:
				return answer.data;
		}
	}

	async getRecord(domain, recordType) {
		const results = {};

		try {
			const response = await this.query(domain, recordType);
			results[recordType] = response.answers.map((answer) => ({
				name: answer.name,
				type: recordType,
				ttl: answer.ttl,
				data: this.extractData(answer, recordType)
			}));
			return results;
		} catch (error) {
			console.error("Error querying DNS records:", error);
			throw error;
		} finally {
			this.socket.close();
		}
	}
}

export default DNSResolver;
// const resolver = new DNSResolver();
// const domain = process.argv[2] || "google.com";
// const recordType = process.argv[3] || "A";
// resolver.getRecord(domain, recordType).then(
// 	function (records) {
// 		Object.entries(records).forEach(([type, records]) => {
// 			if (records.length === 0) return []; // Skip empty records
// 			return records;
// 			console.log(">>>>>>----  dns:167 ", records);
// 			console.log(`\n${type} Records:`);
// 			records.forEach((record) => {
// 				console.log("----------------------------------------");
// 				console.log(`Type: ${type}`);
// 				console.log(`Name: ${record.name}`);
// 				console.log(`TTL: ${record.ttl}`);

// 				// Format the output based on record type
// 				if (type === "MX") {
// 					console.log(`Priority: ${record.data.priority}`);
// 					console.log(`Exchange: ${record.data.exchange}`);
// 				} else {
// 					console.log(`Data: ${record.data}`);
// 					// console.log(">>>>>>----  dns-resolver:120 ", record);
// 				}
// 			});
// 		});
// 	},
// 	function (err) {
// 		console.error(err);
// 	}
// );

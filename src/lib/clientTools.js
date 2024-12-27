// @ts-nocheck
import { base } from "$app/paths";
function siteDataExtractFromDb(data, obj) {
	let requestedObject = { ...obj };
	for (const key in requestedObject) {
		if (Object.prototype.hasOwnProperty.call(requestedObject, key)) {
			const element = data[key];
			if (data[key]) {
				requestedObject[key] = data[key];
			}
		}
	}
	//remove any keys that are still null or empty
	for (const key in requestedObject) {
		if (Object.prototype.hasOwnProperty.call(requestedObject, key)) {
			const element = requestedObject[key];
			if (element === null || element === "") {
				delete requestedObject[key];
			}
		}
	}
	return requestedObject;
}

//a function to make an api call to /manage/api/ to store site data
function storeSiteData(data) {
	return fetch(base + "/manage/api/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ action: "storeSiteData", data })
	});
}
const allRecordTypes = {
	A: 1,
	NS: 2,
	MD: 3,
	MF: 4,
	CNAME: 5,
	SOA: 6,
	MB: 7,
	MG: 8,
	MR: 9,
	NULL: 10,
	WKS: 11,
	PTR: 12,
	HINFO: 13,
	MINFO: 14,
	MX: 15,
	TXT: 16,
	RP: 17,
	AFSDB: 18,
	X25: 19,
	ISDN: 20,
	RT: 21,
	NSAP: 22,
	NSAP_PTR: 23,
	SIG: 24,
	KEY: 25,
	PX: 26,
	GPOS: 27,
	AAAA: 28,
	LOC: 29,
	NXT: 30,
	EID: 31,
	NIMLOC: 32,
	SRV: 33,
	ATMA: 34,
	NAPTR: 35,
	KX: 36,
	CERT: 37,
	A6: 38,
	DNAME: 39,
	SINK: 40,
	OPT: 41,
	APL: 42,
	DS: 43,
	SSHFP: 44,
	IPSECKEY: 45,
	RRSIG: 46,
	NSEC: 47,
	DNSKEY: 48,
	DHCID: 49,
	NSEC3: 50,
	NSEC3PARAM: 51,
	TLSA: 52,
	SMIMEA: 53,
	HIP: 55,
	NINFO: 56,
	RKEY: 57,
	TALINK: 58,
	CDS: 59,
	CDNSKEY: 60,
	OPENPGPKEY: 61,
	CSYNC: 62,
	SPF: 99,
	UINFO: 100,
	UID: 101,
	GID: 102,
	UNSPEC: 103,
	NID: 104,
	L32: 105,
	L64: 106,
	LP: 107,
	EUI48: 108,
	EUI64: 109,
	TKEY: 249,
	TSIG: 250,
	IXFR: 251,
	AXFR: 252,
	MAILB: 253,
	MAILA: 254,
	ANY: 255
};
const ValidateIpAddress = function (input) {
	// Check if input is a valid IPv4 address
	const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
	if (ipv4Regex.test(input)) {
		return "IPv4";
	}

	// Check if input is a valid IPv6 address
	const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
	if (ipv6Regex.test(input)) {
		return "IPv6";
	}

	// Check if input is a valid domain name
	const domainRegex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
	if (domainRegex.test(input)) {
		return "Domain Name";
	}

	// If none of the above conditions match, the input is invalid
	return "Invalid";
};
function IsValidHost(domain) {
	const regex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
	return regex.test(domain);
}
function IsValidNameServer(nameServer) {
	//8.8.8.8 example
	const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
	return regex.test(nameServer);
}
const IsValidURL = function (url) {
	return /^(http|https):\/\/[^ "]+$/.test(url);
};
export {
	siteDataExtractFromDb,
	storeSiteData,
	allRecordTypes,
	ValidateIpAddress,
	IsValidHost,
	IsValidNameServer,
	IsValidURL
};

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
  return fetch(base + "/manage/app/api/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "storeSiteData", data }),
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
  ANY: 255,
};
const ValidateIpAddress = function (input) {
  // Check if input is a valid IPv4 address with an optional port
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(input)) {
    return "IP4";
  }

  // Improved IPv6 regex that better handles compressed notation
  const ipv6Regex =
    /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){0,7}:|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){6}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|(?:[0-9a-fA-F]{1,4}:){1,7}(?::|:[0-9a-fA-F]{1,4})|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:))$/;
  if (ipv6Regex.test(input)) {
    return "IP6";
  }

  // Check if input is a valid domain name with an optional port
  const domainRegex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  if (domainRegex.test(input)) {
    return "DOMAIN";
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
function ValidateCronExpression(cronExp) {
  // Check if expression is provided and is a string
  if (!cronExp || typeof cronExp !== "string") {
    return { isValid: false, message: "Cron expression must be a non-empty string" };
  }

  // Split the expression into its components
  const fields = cronExp.trim().split(/\s+/);

  // Standard cron should have 5 or 6 fields
  // minute hour day-of-month month day-of-week [year]
  if (fields.length < 5 || fields.length > 6) {
    return {
      isValid: false,
      message: "Cron expression must have 5 or 6 fields",
    };
  }

  // Define field constraints
  const fieldConstraints = [
    { name: "minute", min: 0, max: 59 },
    { name: "hour", min: 0, max: 23 },
    { name: "day", min: 1, max: 31 },
    { name: "month", min: 1, max: 12 },
    { name: "weekday", min: 0, max: 6 },
    { name: "year", min: 1970, max: 2099 }, // Optional field
  ];

  // Valid characters in cron expressions
  const validChars = /^[\d/*,\-]+$/;

  // Validate each field
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const constraint = fieldConstraints[i];

    // Check for valid characters
    if (!validChars.test(field)) {
      return {
        isValid: false,
        message: `Invalid characters in ${constraint.name} field`,
      };
    }

    // Handle special characters
    if (field === "*") {
      continue; // Asterisk is valid for all fields
    }

    // Handle lists (comma-separated values)
    if (field.includes(",")) {
      const values = field.split(",");
      for (const value of values) {
        if (!isValidRange(value, constraint.min, constraint.max)) {
          return {
            isValid: false,
            message: `Invalid value in ${constraint.name} field: ${value}`,
          };
        }
      }
      continue;
    }

    // Handle ranges (with hyphens)
    if (field.includes("-")) {
      const [start, end] = field.split("-").map(Number);
      if (start == null || end == null || start < constraint.min || end > constraint.max || start > end) {
        return {
          isValid: false,
          message: `Invalid range in ${constraint.name} field: ${field}`,
        };
      }
      continue;
    }

    // Handle steps (with forward slash)
    if (field.includes("/")) {
      const [range, step] = field.split("/");
      if (range !== "*" && !isValidRange(range, constraint.min, constraint.max)) {
        return {
          isValid: false,
          message: `Invalid range in ${constraint.name} field: ${range}`,
        };
      }
      if (!isValidRange(step, 1, constraint.max)) {
        return {
          isValid: false,
          message: `Invalid step value in ${constraint.name} field: ${step}`,
        };
      }
      continue;
    }

    // Handle plain numbers
    if (!isValidRange(field, constraint.min, constraint.max)) {
      return {
        isValid: false,
        message: `Invalid value in ${constraint.name} field: ${field}`,
      };
    }
  }

  return { isValid: true, message: "Valid cron expression" };
}

function isValidRange(value, min, max) {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
}
function SortMonitor(monitorSort, resp) {
  let monitors = [];
  if (!!monitorSort && monitorSort.length > 0) {
    monitors = monitorSort.map((id) => resp.find((m) => m.id == id)).filter((m) => !!m);
    //append any new monitors
    monitors = [...monitors, ...resp.filter((m) => !monitorSort.includes(m.id))];
  } else {
    monitors = resp;
  }
  return monitors;
}
//js function to generate 32 character random string
function RandomString(length) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// List of games for Gamedig monitor type
const AllGamesList = [
  { id: "a2oa", name: "ARMA 2: Operation Arrowhead", isValve: true },
  { id: "aaa", name: "ARMA: Armed Assault" },
  { id: "aapg", name: "America's Army: Proving Grounds", isValve: true },
  { id: "abioticfactor", name: "Abiotic Factor", isValve: true },
  { id: "actionsource", name: "Action: Source", isValve: true },
  { id: "acwa", name: "ARMA: Cold War Assault" },
  { id: "ahl", name: "Action Half-Life", isValve: true },
  { id: "alienarena", name: "Alien Arena" },
  { id: "alienswarm", name: "Alien Swarm", isValve: true },
  { id: "americasarmy", name: "America's Army" },
  { id: "americasarmy2", name: "America's Army 2" },
  { id: "americasarmy3", name: "America's Army 3", isValve: true },
  { id: "aoc", name: "Age of Chivalry", isValve: true },
  { id: "aoe2", name: "Age of Empires 2" },
  { id: "aosc", name: "Ace of Spades Classic" },
  { id: "arma2", name: "ARMA 2", isValve: true },
  { id: "arma3", name: "ARMA 3", isValve: true },
  { id: "armagetronadvanced", name: "Armagetron Advanced" },
  { id: "armareforger", name: "ARMA: Reforger", isValve: true },
  { id: "armaresistance", name: "ARMA: Resistance" },
  { id: "asa", name: "Ark: Survival Ascended" },
  { id: "ase", name: "Ark: Survival Evolved", isValve: true },
  { id: "asr08", name: "Arca Sim Racing '08" },
  { id: "assettocorsa", name: "Assetto Corsa" },
  { id: "atlas", name: "Atlas", isValve: true },
  { id: "avorion", name: "Avorion", isValve: true },
  { id: "avp2", name: "Aliens versus Predator 2" },
  { id: "avp2010", name: "Aliens vs. Predator 2010", isValve: true },
  { id: "baldursgate", name: "Baldur's Gate" },
  { id: "ballisticoverkill", name: "Ballistic Overkill", isValve: true },
  { id: "barotrauma", name: "Barotrauma", isValve: true },
  { id: "bas", name: "Build and Shoot" },
  { id: "basedefense", name: "Base Defense", isValve: true },
  { id: "battalion1944", name: "Battalion 1944", isValve: true },
  { id: "battlefield1942", name: "Battlefield 1942" },
  { id: "battlefield2", name: "Battlefield 2" },
  { id: "battlefield2142", name: "Battlefield 2142" },
  { id: "battlefield3", name: "Battlefield 3" },
  { id: "battlefield4", name: "Battlefield 4" },
  { id: "battlefieldhardline", name: "Battlefield Hardline" },
  { id: "battlefieldvietnam", name: "Battlefield Vietnam" },
  { id: "bbc2", name: "Battlefield: Bad Company 2" },
  { id: "beammp", name: "BeamMP (2021)" },
  { id: "blackmesa", name: "Black Mesa", isValve: true },
  { id: "bladesymphony", name: "Blade Symphony", isValve: true },
  { id: "brainbread", name: "BrainBread", isValve: true },
  { id: "brainbread2", name: "BrainBread 2", isValve: true },
  { id: "breach", name: "Breach", isValve: true },
  { id: "breed", name: "Breed" },
  { id: "brink", name: "Brink", isValve: true },
  { id: "brokeprotocol", name: "BROKE PROTOCOL" },
  { id: "c2d", name: "CS2D" },
  { id: "c3db", name: "Commandos 3: Destination Berlin" },
  { id: "cacr", name: "Command and Conquer: Renegade" },
  { id: "chaser", name: "Chaser" },
  { id: "chrome", name: "Chrome" },
  { id: "cmw", name: "Chivalry: Medieval Warfare", isValve: true },
  { id: "cod", name: "Call of Duty" },
  { id: "cod2", name: "Call of Duty 2" },
  { id: "cod3", name: "Call of Duty 3" },
  { id: "cod4mw", name: "Call of Duty 4: Modern Warfare" },
  { id: "codbo3", name: "Call of Duty: Black Ops 3", isValve: true },
  { id: "codenamecure", name: "Codename CURE", isValve: true },
  { id: "codenameeagle", name: "Codename Eagle" },
  { id: "codmw2", name: "Call of Duty: Modern Warfare 2" },
  { id: "codmw3", name: "Call of Duty: Modern Warfare 3", isValve: true },
  { id: "coduo", name: "Call of Duty: United Offensive" },
  { id: "codwaw", name: "Call of Duty: World at War" },
  { id: "coj", name: "Call of Juarez" },
  { id: "colonysurvival", name: "Colony Survival", isValve: true },
  { id: "conanexiles", name: "Conan Exiles", isValve: true },
  { id: "contagion", name: "Contagion", isValve: true },
  { id: "contractjack", name: "Contract J.A.C.K." },
  { id: "corekeeper", name: "Core Keeper", isValve: true },
  { id: "counterstrike15", name: "Counter-Strike 1.5" },
  { id: "counterstrike16", name: "Counter-Strike 1.6", isValve: true },
  { id: "counterstrike2", name: "Counter-Strike 2", isValve: true },
  { id: "crce", name: "Cross Racing Championship Extreme" },
  { id: "creativerse", name: "Creativerse", isValve: true },
  { id: "crysis", name: "Crysis" },
  { id: "crysis2", name: "Crysis 2" },
  { id: "crysiswars", name: "Crysis Wars" },
  { id: "cscz", name: "Counter-Strike: Condition Zero", isValve: true },
  { id: "csgo", name: "Counter-Strike: Global Offensive", isValve: true },
  { id: "css", name: "Counter-Strike: Source", isValve: true },
  { id: "dab", name: "Double Action: Boogaloo", isValve: true },
  { id: "daikatana", name: "Daikatana" },
  { id: "dal", name: "Dark and Light", isValve: true },
  { id: "dayofdragons", name: "Day of Dragons", isValve: true },
  { id: "dayz", name: "DayZ", isValve: true },
  { id: "dayzmod", name: "DayZ Mod", isValve: true },
  { id: "ddd", name: "Dino D-Day", isValve: true },
  { id: "ddpt", name: "Deadly Dozen: Pacific Theater" },
  { id: "deathmatchclassic", name: "Deathmatch Classic", isValve: true },
  { id: "deerhunter2005", name: "Deer Hunter 2005" },
  { id: "descent3", name: "Descent 3" },
  { id: "deusex", name: "Deus Ex" },
  { id: "devastation", name: "Devastation" },
  { id: "dhe4445", name: "Darkest Hour: Europe '44-'45" },
  { id: "discord", name: "Discord" },
  { id: "dmomam", name: "Dark Messiah of Might and Magic", isValve: true },
  { id: "dnf2001", name: "Duke Nukem Forever 2001" },
  { id: "dod", name: "Day of Defeat", isValve: true },
  { id: "dods", name: "Day of Defeat: Source", isValve: true },
  { id: "doi", name: "Day of Infamy", isValve: true },
  { id: "doom3", name: "Doom 3" },
  { id: "dootf", name: "Drakan: Order of the Flame" },
  { id: "dota2", name: "Dota 2", isValve: true },
  { id: "dow", name: "Days of War", isValve: true },
  { id: "dst", name: "Don't Starve Together", isValve: true },
  { id: "dtr2", name: "Dirt Track Racing 2" },
  { id: "dystopia", name: "Dystopia", isValve: true },
  { id: "eco", name: "Eco" },
  { id: "egs", name: "Empyrion - Galactic Survival", isValve: true },
  { id: "eldewrito", name: "Halo Online - ElDewrito" },
  { id: "empiresmod", name: "Empires Mod", isValve: true },
  { id: "enshrouded", name: "enshrouded", isValve: true },
  { id: "etqw", name: "Enemy Territory: Quake Wars" },
  { id: "ets2", name: "Euro Truck Simulator 2", isValve: true },
  { id: "exfil", name: "Exfil", isValve: true },
  { id: "f1c9902", name: "F1 Challenge '99-'02" },
  { id: "factorio", name: "Factorio" },
  { id: "farcry", name: "Far Cry" },
  { id: "farcry2", name: "Far Cry 2" },
  { id: "farmingsimulator19", name: "Farming Simulator 19" },
  { id: "farmingsimulator22", name: "Farming Simulator 22" },
  { id: "farmingsimulator25", name: "Farming Simulator 25" },
  { id: "fear", name: "F.E.A.R." },
  { id: "ffow", name: "Frontlines: Fuel of War" },
  { id: "fof", name: "Fistful of Frags", isValve: true },
  { id: "formulaone2002", name: "Formula One 2002" },
  { id: "fortressforever", name: "Fortress Forever", isValve: true },
  { id: "foundry", name: "FOUNDRY", isValve: true },
  { id: "garrysmod", name: "Garry's Mod", isValve: true },
  { id: "gck", name: "Giants: Citizen Kabuto" },
  { id: "geneshift", name: "Geneshift" },
  { id: "globaloperations", name: "Global Operations" },
  { id: "goldeneyesource", name: "GoldenEye: Source", isValve: true },
  { id: "groundbreach", name: "Ground Breach", isValve: true },
  { id: "gta5am", name: "Grand Theft Auto V - alt:V Multiplayer" },
  { id: "gta5f", name: "Grand Theft Auto V - FiveM" },
  { id: "gta5r", name: "Grand Theft Auto V - RageMP" },
  { id: "gtasam", name: "Grand Theft Auto: San Andreas Multiplayer" },
  { id: "gtasamta", name: "Grand Theft Auto: San Andreas - Multi Theft Auto" },
  { id: "gtasao", name: "Grand Theft Auto: San Andreas OpenMP" },
  { id: "gtavcmta", name: "Grand Theft Auto: Vice City - Multi Theft Auto" },
  { id: "gunmanchronicles", name: "Gunman Chronicles", isValve: true },
  { id: "gus", name: "Gore: Ultimate Soldier" },
  { id: "halo", name: "Halo" },
  { id: "halo2", name: "Halo 2" },
  { id: "hawakening", name: "Hawakening" },
  { id: "heretic2", name: "Heretic II" },
  { id: "hexen2", name: "Hexen II" },
  { id: "hiddendangerous2", name: "Hidden & Dangerous 2" },
  { id: "hl2d", name: "Half-Life 2: Deathmatch", isValve: true },
  { id: "hld", name: "Half-Life Deathmatch", isValve: true },
  { id: "hlds", name: "Half-Life Deathmatch: Source", isValve: true },
  { id: "hll", name: "Hell Let Loose", isValve: true },
  { id: "hlof", name: "Half-Life: Opposing Force", isValve: true },
  { id: "homefront", name: "Homefront", isValve: true },
  { id: "homeworld2", name: "Homeworld 2" },
  { id: "hurtworld", name: "Hurtworld", isValve: true },
  { id: "i2cs", name: "IGI 2: Covert Strike" },
  { id: "i2s", name: "IL-2 Sturmovik" },
  { id: "icarus", name: "Icarus", isValve: true },
  { id: "imic", name: "Insurgency: Modern Infantry Combat", isValve: true },
  { id: "insurgency", name: "Insurgency", isValve: true },
  { id: "insurgencysandstorm", name: "Insurgency: Sandstorm", isValve: true },
  { id: "ironstorm", name: "Iron Storm" },
  { id: "jb0n", name: "James Bond 007: Nightfire" },
  { id: "jc2m", name: "Just Cause 2 - Multiplayer" },
  { id: "jc3m", name: "Just Cause 3 - Multiplayer", isValve: true },
  { id: "killingfloor", name: "Killing Floor" },
  { id: "killingfloor2", name: "Killing Floor 2", isValve: true },
  { id: "kloc", name: "Kingpin: Life of Crime" },
  { id: "kpctnc", name: "Kiss: Psycho Circus: The Nightmare Child" },
  { id: "kreedzclimbing", name: "Kreedz Climbing", isValve: true },
  { id: "kspd", name: "Kerbal Space Program - DMP" },
  { id: "l4d", name: "Left 4 Dead", isValve: true },
  { id: "l4d2", name: "Left 4 Dead 2", isValve: true },
  { id: "m2m", name: "Mafia II - Multiplayer" },
  { id: "m2o", name: "Mafia II - Online" },
  { id: "mbe", name: "Minecraft: Bedrock Edition" },
  { id: "medievalengineers", name: "Medieval Engineers", isValve: true },
  { id: "mgm", name: "Mumble - GT Murmur" },
  { id: "minecraft", name: "Minecraft" },
  { id: "minetest", name: "Minetest" },
  { id: "mnc", name: "Monday Night Combat", isValve: true },
  { id: "moe", name: "Myth of Empires", isValve: true },
  { id: "moh", name: "Medal of Honor" },
  { id: "moha", name: "Medal of Honor: Airborne" },
  { id: "mohaa", name: "Medal of Honor: Allied Assault" },
  { id: "mohaab", name: "Medal of Honor: Allied Assault Breakthrough" },
  { id: "mohaas", name: "Medal of Honor: Allied Assault Spearhead" },
  { id: "mohpa", name: "Medal of Honor: Pacific Assault" },
  { id: "mohw", name: "Medal of Honor: Warfighter" },
  { id: "mordhau", name: "Mordhau", isValve: true },
  { id: "mumble", name: "Mumble" },
  { id: "mutantfactions", name: "Mutant Factions" },
  { id: "nab", name: "Nerf Arena Blast" },
  { id: "nascarthunder2004", name: "NASCAR Thunder 2004" },
  { id: "naturalselection", name: "Natural Selection", isValve: true },
  { id: "naturalselection2", name: "Natural Selection 2", isValve: true },
  { id: "netpanzer", name: "netPanzer" },
  { id: "neverwinternights", name: "Neverwinter Nights" },
  { id: "neverwinternights2", name: "Neverwinter Nights 2" },
  { id: "nexuiz", name: "Nexuiz" },
  { id: "nfshp2", name: "Need for Speed: Hot Pursuit 2" },
  { id: "nitrofamily", name: "Nitro Family" },
  { id: "nla", name: "Nova-Life: Amboise", isValve: true },
  { id: "nmrih", name: "No More Room in Hell", isValve: true },
  { id: "nolf2asihw", name: "No One Lives Forever 2: A Spy in H.A.R.M.'s Way" },
  { id: "nucleardawn", name: "Nuclear Dawn", isValve: true },
  { id: "ofcwc", name: "Operation Flashpoint: Cold War Crisis" },
  { id: "ofr", name: "Operation Flashpoint: Resistance" },
  { id: "ohd", name: "Operation: Harsh Doorstop", isValve: true },
  { id: "onset", name: "Onset", isValve: true },
  { id: "openarena", name: "OpenArena" },
  { id: "openttd", name: "OpenTTD" },
  { id: "painkiller", name: "Painkiller" },
  { id: "palworld", name: "Palworld" },
  { id: "pce", name: "Primal Carnage: Extinction", isValve: true },
  { id: "pixark", name: "PixARK", isValve: true },
  { id: "postal2", name: "Postal 2" },
  { id: "postscriptum", name: "Post Scriptum", isValve: true },
  { id: "prb2", name: "Project Reality: Battlefield 2" },
  { id: "prey", name: "Prey" },
  { id: "projectcars", name: "Project Cars", isValve: true },
  { id: "projectcars2", name: "Project Cars 2", isValve: true },
  { id: "projectzomboid", name: "Project Zomboid", isValve: true },
  { id: "pvak2", name: "Pirates, Vikings, and Knights II", isValve: true },
  { id: "q3a", name: "Quake 3: Arena" },
  { id: "quake", name: "Quake" },
  { id: "quake2", name: "Quake 2" },
  { id: "quake4", name: "Quake 4" },
  { id: "quakelive", name: "Quake Live", isValve: true },
  { id: "rainbowsix", name: "Rainbow Six" },
  { id: "rallisportchallenge", name: "RalliSport Challenge" },
  { id: "rallymasters", name: "Rally Masters" },
  { id: "rdkf", name: "Rag Doll Kung Fu", isValve: true },
  { id: "rdr2r", name: "Red Dead Redemption 2 - RedM" },
  { id: "redline", name: "Redline" },
  { id: "redorchestra", name: "Red Orchestra" },
  { id: "redorchestra2", name: "Red Orchestra 2", isValve: true },
  { id: "renegade10", name: "Renegade X" },
  { id: "renown", name: "Renown"},
  { id: "rfactor", name: "rFactor" },
  { id: "rfactor2", name: "rFactor 2", isValve: true },
  { id: "ricochet", name: "Ricochet", isValve: true },
  { id: "risingworld", name: "Rising World", isValve: true },
  { id: "ron", name: "Rise of Nations" },
  { id: "roo4145", name: "Red Orchestra: Ostfront 41-45" },
  { id: "ror2", name: "Risk of Rain 2", isValve: true },
  { id: "rs2rs", name: "Rainbow Six 2: Rogue Spear" },
  { id: "rs2v", name: "Rising Storm 2: Vietnam", isValve: true },
  { id: "rs3rs", name: "Rainbow Six 3: Raven Shield" },
  { id: "rtcw", name: "Return to Castle Wolfenstein" },
  { id: "rune", name: "Rune" },
  { id: "rust", name: "Rust", isValve: true },
  { id: "s2ats", name: "Savage 2: A Tortured Soul" },
  { id: "satisfactory", name: "Satisfactory" },
  { id: "sdtd", name: "7 Days to Die", isValve: true },
  { id: "serioussam", name: "Serious Sam" },
  { id: "serioussam2", name: "Serious Sam 2" },
  { id: "shatteredhorizon", name: "Shattered Horizon", isValve: true },
  { id: "shogo", name: "Shogo" },
  { id: "shootmania", name: "Shootmania" },
  { id: "sin", name: "SiN" },
  { id: "sinepisodes", name: "SiN Episodes", isValve: true },
  { id: "sof", name: "Soldier of Fortune" },
  { id: "sof2", name: "Soldier of Fortune 2" },
  { id: "soldat", name: "Soldat" },
  { id: "sotf", name: "Sons Of The Forest", isValve: true },
  { id: "soulmask", name: "Soulmask", isValve: true },
  { id: "spaceengineers", name: "Space Engineers", isValve: true },
  { id: "squad", name: "Squad", isValve: true },
  { id: "sstse", name: "Serious Sam: The Second Encounter" },
  { id: "stalker", name: "S.T.A.L.K.E.R." },
  { id: "starbound", name: "Starbound", isValve: true },
  { id: "starmade", name: "StarMade" },
  { id: "starsiege", name: "Starsiege" },
  { id: "stbc", name: "Star Trek: Bridge Commander" },
  { id: "stn", name: "Survive the Nights", isValve: true },
  { id: "stvef", name: "Star Trek: Voyager - Elite Force" },
  { id: "stvef2", name: "Star Trek: Voyager - Elite Force 2" },
  { id: "suicidesurvival", name: "Suicide Survival", isValve: true },
  { id: "svencoop", name: "Sven Coop", isValve: true },
  { id: "swat4", name: "SWAT 4" },
  { id: "swb", name: "Star Wars: Battlefront" },
  { id: "swb2", name: "Star Wars: Battlefront 2" },
  { id: "swjk2jo", name: "Star Wars Jedi Knight II: Jedi Outcast" },
  { id: "swjkja", name: "Star Wars Jedi Knight: Jedi Academy" },
  { id: "swrc", name: "Star Wars: Republic Commando" },
  { id: "synergy", name: "Synergy", isValve: true },
  { id: "t1s", name: "Tribes 1: Starsiege" },
  { id: "tacticalops", name: "Tactical Ops" },
  { id: "tcgraw", name: "Tom Clancy's Ghost Recon Advanced Warfighter" },
  { id: "tcgraw2", name: "Tom Clancy's Ghost Recon Advanced Warfighter 2" },
  { id: "teamfactor", name: "Team Factor" },
  { id: "teamfortress2", name: "Team Fortress 2", isValve: true },
  { id: "teamspeak2", name: "Teamspeak 2" },
  { id: "teamspeak3", name: "Teamspeak 3" },
  { id: "terminus", name: "Terminus" },
  { id: "terrariatshock", name: "Terraria - TShock" },
  { id: "tfc", name: "Team Fortress Classic", isValve: true },
  { id: "theforest", name: "The Forest", isValve: true },
  { id: "thefront", name: "The Front", isValve: true },
  { id: "thehidden", name: "The Hidden", isValve: true },
  { id: "theisle", name: "The Isle", isValve: true },
  { id: "theship", name: "The Ship", isValve: true },
  { id: "thespecialists", name: "The Specialists", isValve: true },
  { id: "thps3", name: "Tony Hawk's Pro Skater 3" },
  { id: "thps4", name: "Tony Hawk's Pro Skater 4" },
  { id: "thu2", name: "Tony Hawk's Underground 2" },
  { id: "tie", name: "The Isle Evrima"},
  { id: "toh", name: "Take On Helicopters" },
  { id: "tonolf", name: "The Operative: No One Lives Forever" },
  { id: "towerunite", name: "Tower Unite", isValve: true },
  { id: "toxikk", name: "TOXIKK" },
  { id: "trackmania2", name: "Trackmania 2" },
  { id: "trackmaniaforever", name: "Trackmania Forever" },
  { id: "tremulous", name: "Tremulous" },
  { id: "tribesvengeance", name: "Tribes: Vengeance" },
  { id: "tron20", name: "Tron 2.0" },
  { id: "turok2", name: "Turok 2" },
  { id: "u2tax", name: "Unreal 2: The Awakening - XMP" },
  { id: "universalcombat", name: "Universal Combat" },
  { id: "unreal", name: "Unreal" },
  { id: "unrealtournament", name: "Unreal Tournament" },
  { id: "unrealtournament2003", name: "Unreal Tournament 2003" },
  { id: "unrealtournament2004", name: "Unreal Tournament 2004" },
  { id: "unrealtournament3", name: "Unreal Tournament 3" },
  { id: "unturned", name: "unturned", isValve: true },
  { id: "urbanterror", name: "Urban Terror" },
  { id: "v8sc", name: "V8 Supercar Challenge" },
  { id: "valheim", name: "Valheim", isValve: true },
  { id: "vampireslayer", name: "Vampire Slayer", isValve: true },
  { id: "vcm", name: "Vice City Multiplayer" },
  { id: "ventrilo", name: "Ventrilo" },
  { id: "vietcong", name: "Vietcong" },
  { id: "vietcong2", name: "Vietcong 2" },
  { id: "vintagestory", name: "Vintage Story" },
  { id: "vrising", name: "V Rising", isValve: true },
  { id: "warfork", name: "Warfork" },
  { id: "warsow", name: "Warsow" },
  { id: "wet", name: "Wolfenstein: Enemy Territory" },
  { id: "wolfenstein", name: "Wolfenstein" },
  { id: "wop", name: "World Of Padman" },
  { id: "wot", name: "Wheel of Time" },
  { id: "wurmunlimited", name: "Wurm Unlimited", isValve: true },
  { id: "xonotic", name: "Xonotic" },
  { id: "xpandrally", name: "Xpand Rally" },
  { id: "zombiemaster", name: "Zombie Master", isValve: true },
  { id: "zps", name: "Zombie Panic: Source", isValve: true },
];

/**
 * Retreive game's data from its id.
 * @param {string} id Id
 * @return Returns game's data if found, undefined instead.
 */
function getGameFromId(id) {
  return AllGamesList.find((game) => game.id === id);
}

export {
  siteDataExtractFromDb,
  storeSiteData,
  allRecordTypes,
  ValidateIpAddress,
  IsValidHost,
  IsValidNameServer,
  IsValidURL,
  ValidateCronExpression,
  SortMonitor,
  RandomString,
  AllGamesList,
  getGameFromId
};

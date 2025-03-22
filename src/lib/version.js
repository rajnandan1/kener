import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

function getVersionUsingVite() {
  try {
    if (!!import.meta.env.PACKAGE_VERSION) {
      return import.meta.env.PACKAGE_VERSION;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default function version() {
  let v = getVersionUsingVite();
  if (!!v) {
    return v;
  } else {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packagePath = resolve(__dirname, "../../package.json");
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      return packageJson.version;
    } catch (e) {
      return "0.0.0";
    }
  }
}

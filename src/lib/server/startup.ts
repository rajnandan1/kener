import figlet from "figlet";
import { fileURLToPath } from "url";
import version from "../version.js";
import mainScheduler from "./schedulers/appScheduler.js";
import maintenanceScheduler from "./schedulers/maintenanceScheduler.js";

process.env.TZ = "UTC";

async function Startup(): Promise<void> {
  await mainScheduler.start();
  await maintenanceScheduler.start();

  figlet("Kener v" + version(), function (err, data) {
    if (err) {
      console.log("Something went wrong...");
      return;
    }
    console.log(data);
    console.log(`Kener version ${version()} is running!`);
  });
}

// Call Startup() if not imported as a module
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  Startup();
}

export default Startup;

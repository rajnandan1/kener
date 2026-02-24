import figlet from "figlet";
import version from "../version.js";
import mainScheduler from "./schedulers/appScheduler.js";
import maintenanceScheduler from "./schedulers/maintenanceScheduler.js";
import dailyCleanupScheduler from "./schedulers/dailyCleanup.js";

process.env.TZ = "UTC";

async function Startup(): Promise<void> {
  await mainScheduler.start();
  await maintenanceScheduler.start();
  await dailyCleanupScheduler.start();

  const runtimeVersion = version();

  figlet("Kener v" + runtimeVersion, function (err, data) {
    if (err) {
      console.log("Something went wrong...");
      return;
    }
    console.log(data);
    console.log(`Kener version ${runtimeVersion} is running!`);
  });
}

// Call Startup() when run directly (works with both tsx and vite-node)
const isMainModule = process.argv[1]?.includes("startup") || process.argv[1]?.includes("vite-node");

if (isMainModule) {
  Startup();
}

export default Startup;

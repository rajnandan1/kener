import figlet from "figlet";
import version from "../version.js";
import mainScheduler from "./schedulers/appScheduler.js";
import maintenanceScheduler from "./schedulers/maintenanceScheduler.js";
import dailyCleanupScheduler from "./schedulers/dailyCleanup.js";
import { InstallEnvProxy } from "./proxy.js";
import { SecretKeyWarning } from "./controllers/commonController.js";

process.env.TZ = "UTC";

async function Startup(): Promise<void> {
  // After dotenv: main.ts calls dotenv.config() in its body, which runs after static imports,
  // so this cannot be module top-level. Covers fetch (triggers, Resend, OIDC) and the global agents.
  InstallEnvProxy();
  const secretKeyWarning = SecretKeyWarning();
  if (secretKeyWarning) console.warn(secretKeyWarning);
  await mainScheduler.start();
  await maintenanceScheduler.start();
  await dailyCleanupScheduler.start();

  const runtimeVersion = version();

  // The callback reports a failure; the promise figlet also returns would reject with the same error.
  figlet("Kener v" + runtimeVersion, function (err, data) {
    if (err) {
      console.log("Something went wrong...");
      return;
    }
    console.log(data);
    console.log(`Kener version ${runtimeVersion} is running!`);
  }).catch(() => {});
}

// Call Startup() when run directly (works with both tsx and vite-node)
const isMainModule = process.argv[1]?.includes("startup") || process.argv[1]?.includes("vite-node");

if (isMainModule) {
  Startup().catch((err) => {
    console.error("Kener failed to start:", err);
    process.exit(1);
  });
}

export default Startup;

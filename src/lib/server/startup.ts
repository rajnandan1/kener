import figlet from "figlet";
import version from "../version.js";
import mainScheduler from "./schedulers/appScheduler.js";
import maintenanceScheduler from "./schedulers/maintenanceScheduler.js";
import dailyCleanupScheduler from "./schedulers/dailyCleanup.js";
import { InstallEnvProxy } from "./proxy.js";
import { runRollupBackfillWithRetry } from "./schedulers/rollupBackfill.js";

process.env.TZ = "UTC";

async function Startup(): Promise<void> {
  // After dotenv: main.ts calls dotenv.config() in its body, which runs after static imports,
  // so this cannot be module top-level. Covers fetch (triggers, Resend, OIDC) and the global agents.
  InstallEnvProxy();
  await mainScheduler.start();
  await maintenanceScheduler.start();
  await dailyCleanupScheduler.start();

  // Fills monitoring_data_bucket from the existing history. Runs after the
  // schedulers rather than in a migration, so a large install is not held at
  // the boot screen while it walks the raw rows. Nothing reads the rollup yet.
  runRollupBackfillWithRetry().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Rollup backfill did not finish: ${message}`);
  });

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

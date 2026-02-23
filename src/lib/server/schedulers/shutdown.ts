import appScheduler from "./appScheduler";
import monitorSchedulers from "./monitorSchedulers";
import maintenanceScheduler from "./maintenanceScheduler";
import dailyCleanupScheduler from "./dailyCleanup";

export default async () => {
  await appScheduler.shutdown();
  await monitorSchedulers.shutdown();
  await maintenanceScheduler.shutdown();
  await dailyCleanupScheduler.shutdown();
};

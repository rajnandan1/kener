import appScheduler from "./appScheduler";
import monitorSchedulers from "./monitorSchedulers";
import maintenanceScheduler from "./maintenanceScheduler";

export default async () => {
  await appScheduler.shutdown();
  await monitorSchedulers.shutdown();
  await maintenanceScheduler.shutdown();
};

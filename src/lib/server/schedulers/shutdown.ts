import appScheduler from "./appScheduler";
import monitorSchedulers from "./monitorSchedulers";

export default async () => {
  await appScheduler.shutdown();
  await monitorSchedulers.shutdown();
};

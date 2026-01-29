import monitorResponseQueue from "./monitorResponseQueue";
import monitorExecuteQueue from "./monitorExecuteQueue";
import alertingQueue from "./alertingQueue";
import subscriberQueue from "./subscriberQueue";
import emailQueue from "./emailQueue";

export default async () => {
  await monitorExecuteQueue.shutdown();
  await monitorResponseQueue.shutdown();
  await alertingQueue.shutdown();
  await subscriberQueue.shutdown();
  await emailQueue.shutdown();
};

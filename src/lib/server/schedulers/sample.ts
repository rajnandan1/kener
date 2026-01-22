import mainScheduler from "./appScheduler";

await mainScheduler.schedule();

console.log("Job added, waiting for worker to process...");

// Keep process alive for a few seconds to allow worker to process
await new Promise((resolve) => setTimeout(resolve, 3000));

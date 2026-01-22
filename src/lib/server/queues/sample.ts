import monitorResponseQueue from "./monitorResponseQueue";

await monitorResponseQueue.push("test", 1627849200, { status: "up", latency: 120, type: "API" });

console.log("Job added, waiting for worker to process...");

// Keep process alive for a few seconds to allow worker to process
await new Promise((resolve) => setTimeout(resolve, 3000));

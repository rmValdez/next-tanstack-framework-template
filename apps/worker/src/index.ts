import { config } from "./config";
import { startConsumer, stopConsumer } from "./consumer";
import { createServer } from "./server";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = createServer().listen(config.WORKER_PORT, () => {
  console.info(`[worker] Health endpoint on http://localhost:${config.WORKER_PORT}/health`);
});

// If the broker is down this keeps retrying in the background; /health reports
// "disconnected" meanwhile instead of the process crashing.
startConsumer();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[worker] ${signal} received, shutting down.`);

  // Unacknowledged jobs are requeued by RabbitMQ, so a forced exit loses nothing;
  // the timeout only stops a hung SMTP call from blocking a deploy.
  setTimeout(() => {
    console.error("[worker] Shutdown timed out, exiting.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  await stopConsumer();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

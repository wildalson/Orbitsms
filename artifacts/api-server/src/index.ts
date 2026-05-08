import http from "http";
import app from "./app";
import { startDeliveryReportPoller, stopDeliveryReportPoller } from "./lib/delivery-report-poller";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startDeliveryReportPoller();
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received, draining connections");
  stopDeliveryReportPoller();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
  logger.info("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

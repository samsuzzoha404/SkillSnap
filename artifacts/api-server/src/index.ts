import "dotenv/config";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

createApp().then((app) => {
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});

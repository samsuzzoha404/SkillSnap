import "./env.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

createApp().then((app) => {
  const server = app.listen(port);
  server.once("listening", () => {
    logger.info({ port }, "Server listening");
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    logger.error(err, "HTTP server error");
    if (err.code === "EADDRINUSE") {
      logger.error(
        { port },
        "Port already in use. Stop the other API (or old tsx/node) or set PORT=8081. Windows: netstat -ano | findstr :8080 then taskkill /PID <pid> /F",
      );
    }
    process.exit(1);
  });
}).catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});

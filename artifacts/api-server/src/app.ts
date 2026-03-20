import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";

const USE_MOCK = process.env["USE_MOCK_DATA"] === "true";

if (USE_MOCK) {
  logger.info("🎭 DEMO MODE ENABLED — Using in-memory mock data. No database required.");
}

export async function createApp(): Promise<Express> {
  const app: Express = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (USE_MOCK) {
    const { default: mockRouter } = await import("./mock/mockRouter.js");
    app.use("/", mockRouter);
  } else {
    const { default: router } = await import("./routes/index.js");
    app.use("/api", router);
  }

  return app;
}

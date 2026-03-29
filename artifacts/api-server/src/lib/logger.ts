import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

// Avoid pino-pretty via `transport` in dev: worker `unref()` can make Node exit
// on some Windows setups. Prefer JSON logs, or set PINOTTY=1 / `pnpm dev:pretty`.
// Run the API with `node --import tsx` (see package.json `dev`), not the `tsx` CLI,
// which can exit after the child runner closes on Windows.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction
    ? {}
    : process.env["PINOTTY"] === "1"
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : {}),
});

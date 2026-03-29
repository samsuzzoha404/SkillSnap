/**
 * Load `.env` before any other app module reads `process.env`.
 * (ESM evaluates all static imports before module body; `app.ts` reads USE_MOCK_DATA at load time.)
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

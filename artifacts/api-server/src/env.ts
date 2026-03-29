/**
 * Load `.env` before any other app module reads `process.env`.
 * (ESM evaluates all static imports before module body; `app.ts` reads USE_MOCK_DATA at load time.)
 *
 * Uses the Node entry path (no `import.meta`): bundled CJS strips `import.meta.url`, which breaks
 * `fileURLToPath` on deploy.
 */
import dotenv from "dotenv";
import path from "node:path";

const __dirname = path.dirname(process.argv[1] ?? process.cwd());
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

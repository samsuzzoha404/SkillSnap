/**
 * Load workspace and api-server .env before any @workspace/db import.
 * Used via: tsx --import ./src/loadEnv.ts ./src/seed.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dir, "../../.env") });
dotenv.config({ path: path.resolve(dir, "../../artifacts/api-server/.env") });

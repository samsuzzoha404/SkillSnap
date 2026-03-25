/*
 * Cross-platform replacement for the previous `sh -c ...` preinstall script.
 *
 * Responsibilities:
 * - Remove package-lock.json / yarn.lock (we're a pnpm workspace)
 * - Enforce pnpm usage (helps avoid broken installs)
 */

const fs = require("node:fs");
const path = require("node:path");

function rmIfExists(relPath) {
  const abs = path.resolve(process.cwd(), relPath);
  try {
    if (fs.existsSync(abs)) {
      fs.rmSync(abs, { force: true });
      // eslint-disable-next-line no-console
      console.log(`[preinstall] Removed ${relPath}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[preinstall] Failed to remove ${relPath}:`, err?.message ?? err);
  }
}

rmIfExists("package-lock.json");
rmIfExists("yarn.lock");

const userAgent = process.env.npm_config_user_agent || "";
if (!userAgent.startsWith("pnpm/")) {
  // eslint-disable-next-line no-console
  console.error(
    "This workspace uses pnpm. Please re-run using pnpm (e.g. `pnpm install`).\n" +
      `Detected user agent: ${userAgent || "(empty)"}`,
  );
  process.exit(1);
}

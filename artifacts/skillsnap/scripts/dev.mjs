import { execFile, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

function parsePort(value, fallback) {
  const raw = value ?? fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }
  return port;
}

/** Return true if TCP `port` is available on 0.0.0.0 (avoids Expo hanging on EADDRINUSE prompts). */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.unref();
    srv.once("error", () => resolve(false));
    srv.listen(port, "0.0.0.0", () => {
      srv.close(() => resolve(true));
    });
  });
}

async function pickMetroPort(preferred) {
  for (let j = 0; j < 40; j++) {
    const p = preferred + j * 2;
    if (p > 65520) break;
    if (await isPortAvailable(p)) return p;
  }
  return preferred;
}

const preferredPort = parsePort(process.env.PORT, 22172);

const env = { ...process.env };

// CI=1 makes Expo non-interactive and often hides the QR code in embedded terminals.
if (env.CI) {
  console.log("[skillsnap] Unsetting CI so Expo can show the QR code (embedded terminals may still hide it).");
  delete env.CI;
}

// Replit-specific env wiring (kept for compatibility), but optional for local dev.
if (env.REPLIT_EXPO_DEV_DOMAIN && !env.EXPO_PACKAGER_PROXY_URL) {
  env.EXPO_PACKAGER_PROXY_URL = `https://${env.REPLIT_EXPO_DEV_DOMAIN}`;
}
if (env.REPLIT_DEV_DOMAIN && !env.EXPO_PUBLIC_DOMAIN) {
  env.EXPO_PUBLIC_DOMAIN = env.REPLIT_DEV_DOMAIN;
}
if (env.REPL_ID && !env.EXPO_PUBLIC_REPL_ID) {
  env.EXPO_PUBLIC_REPL_ID = env.REPL_ID;
}
if (env.REPLIT_DEV_DOMAIN && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = env.REPLIT_DEV_DOMAIN;
}

function isIPv4Private(address) {
  return (
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function isIPv4Cgnat(address) {
  const parts = address.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  return parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function pickLanIPv4() {
  const nets = os.networkInterfaces();
  const ips = [];

  for (const addrs of Object.values(nets)) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      ips.push(addr.address);
    }
  }

  const preferred = ips.find((ip) => isIPv4Private(ip) && !isIPv4Cgnat(ip));
  if (preferred) return preferred;

  const nonCgnat = ips.find((ip) => !isIPv4Cgnat(ip));
  if (nonCgnat) return nonCgnat;

  return ips[0] ?? null;
}

const extraArgs = process.argv.slice(2);

function hasExplicitHostArgs(argv) {
  const hostFlags = new Set(["--localhost", "--lan", "--tunnel"]);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (hostFlags.has(a)) return true;
    if (a === "--host") return true;
    if (a.startsWith("--host=")) return true;
  }
  return false;
}

function getDefaultHostArg() {
  const raw = (process.env.EXPO_START_HOST ?? process.env.EXPO_HOST ?? "lan").toLowerCase();
  if (raw === "localhost") return "--localhost";
  if (raw === "tunnel") return "--tunnel";
  return "--lan";
}

const expoCli = path.join(projectRoot, "node_modules", "expo", "bin", "cli");
const hostArg = hasExplicitHostArgs(extraArgs) ? null : getDefaultHostArg();

if (hostArg === "--lan" && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  const ip = pickLanIPv4();
  if (ip) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
  }
}

const hasDevClient = extraArgs.includes("--dev-client");
/** Prefer Expo Go explicitly so the QR opens in Expo Go (not a missing dev client). */
const goArgs = hasDevClient ? [] : ["--go"];

async function main() {
  const port = await pickMetroPort(preferredPort);
  if (port !== preferredPort) {
    console.log(`[skillsnap] Port ${preferredPort} busy — using ${port} instead.`);
  }
  env.PORT = String(port);

  console.log(
    `[skillsnap] expo start host=${hostArg ?? "(custom)"} port=${port}` +
      (env.REACT_NATIVE_PACKAGER_HOSTNAME ? ` packagerHost=${env.REACT_NATIVE_PACKAGER_HOSTNAME}` : ""),
  );

  const lanHost = env.REACT_NATIVE_PACKAGER_HOSTNAME || "localhost";
  console.log(`\n[skillsnap] Expo Go URL: exp://${lanHost}:${port}\n`);

  const args = [
    expoCli,
    "start",
    ...(hostArg ? [hostArg] : []),
    ...goArgs,
    "--port",
    String(port),
    ...extraArgs,
  ];

  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env,
    shell: false,
  });

  const requireFromProject = createRequire(path.join(projectRoot, "package.json"));

  async function writeExpoQrBrowserPage(expUrl) {
    try {
      const QRCode = requireFromProject("qrcode");
      const outDir = path.join(projectRoot, ".expo");
      mkdirSync(outDir, { recursive: true });
      const fp = path.join(outDir, "expo-go-qr.html");
      const dataUrl = await QRCode.toDataURL(expUrl, {
        margin: 2,
        width: 320,
        errorCorrectionLevel: "M",
      });
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SkillSnap — Expo Go</title></head><body style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:24px auto;padding:16px;text-align:center;background:#0f172a;color:#e2e8f0"><h1 style="font-size:1.25rem;margin:0 0 8px">Expo Go</h1><p style="margin:0 0 16px;color:#94a3b8;font-size:14px">Scan with Expo Go (Android) or Camera (iOS).</p><img src="${dataUrl}" width="288" height="288" alt="QR code"/><p style="margin:16px 0;font-size:12px;word-break:break-all"><a href="${expUrl}" style="color:#38bdf8">${expUrl}</a></p><p style="font-size:12px;color:#64748b">Metro port ${port}</p></body></html>`;
      writeFileSync(fp, html, "utf8");
      const fileUrl = pathToFileURL(fp).href;
      console.log(
        `\n\x1b[36m[skillsnap]\x1b[0m Open this file in your browser for a scannable QR (Cursor often hides terminal QR):\n   \x1b[1m${fileUrl}\x1b[0m\n`,
      );
      if (process.env.EXPO_OPEN_QR_BROWSER === "1" || process.env.EXPO_OPEN_QR_BROWSER === "true") {
        if (process.platform === "win32") {
          execFile("cmd", ["/c", "start", "", fileUrl], { windowsHide: true }, () => {});
        } else if (process.platform === "darwin") {
          execFile("open", [fileUrl], () => {});
        } else {
          execFile("xdg-open", [fileUrl], () => {});
        }
      }
    } catch (e) {
      console.warn("[skillsnap] Could not write .expo/expo-go-qr.html (install deps: pnpm add -D qrcode):", e?.message || e);
    }
  }

  /** Embedded terminals (Cursor/VS Code) often lack a TTY — terminal QR + browser HTML file. */
  const qrTimer = setTimeout(() => {
    const expUrl = `exp://${lanHost}:${port}`;
    void writeExpoQrBrowserPage(expUrl);
    try {
      const qrcode = requireFromProject("qrcode-terminal");
      console.log("\n\x1b[36m[skillsnap]\x1b[0m Terminal QR (may not render in embedded terminals):\n");
      qrcode.generate(expUrl, { small: false }, (qr) => {
        process.stdout.write(`${qr}\n`);
        console.log(`\nExpo Go URL: ${expUrl}\n`);
      });
    } catch (e) {
      console.warn("[skillsnap] qrcode-terminal:", e?.message || e);
    }
  }, 3500);

  child.on("exit", (code, signal) => {
    clearTimeout(qrTimer);
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

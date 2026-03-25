import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

function getPnpmCommand() {
  return "pnpm";
}

function parsePort(value, fallback) {
  const raw = value ?? fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }
  return String(port);
}

const port = parsePort(process.env.PORT, "22172");

const env = { ...process.env };

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
  // 100.64.0.0/10 (often used by VPNs like Tailscale)
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
    if (a === "--host") return true; // value may follow
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

const pnpm = getPnpmCommand();
const hostArg = hasExplicitHostArgs(extraArgs) ? null : getDefaultHostArg();

if (hostArg === "--lan" && !env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  const ip = pickLanIPv4();
  if (ip) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
  }
}

console.log(
  `[skillsnap] expo start host=${hostArg ?? "(custom)"} port=${port}` +
    (env.REACT_NATIVE_PACKAGER_HOSTNAME
      ? ` packagerHost=${env.REACT_NATIVE_PACKAGER_HOSTNAME}`
      : "")
);

const args = [
  "exec",
  "expo",
  "start",
  ...(hostArg ? [hostArg] : []),
  "--port",
  port,
  ...extraArgs,
];

const child = spawn(pnpm, args, {
  cwd: projectRoot,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

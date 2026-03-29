import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function getExplicitApiBase(): string | null {
  const raw =
    process.env.EXPO_PUBLIC_API_URL ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_BASE;

  if (!raw) return null;
  return trimTrailingSlashes(raw);
}

/** Parse hostname from Metro/dev URIs: "192.168.1.2:22172", "[::1]:8081", "exp://192.168.1.2:22172". */
function parseDevHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes("://")) {
    try {
      const normalized = trimmed.startsWith("exp:") ? `http:${trimmed.slice("exp:".length)}` : trimmed;
      const u = new URL(normalized);
      if (u.hostname) return u.hostname.replace(/^\[|\]$/g, "");
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end !== -1) return trimmed.slice(1, end);
    return null;
  }

  const colon = trimmed.lastIndexOf(":");
  if (colon > 0) {
    const after = trimmed.slice(colon + 1);
    if (/^\d+$/.test(after)) return trimmed.slice(0, colon);
  }

  return trimmed;
}

function getApiDevHostFromExtra(): string | null {
  const extra = Constants.expoConfig?.extra as { apiDevHost?: string } | undefined;
  const h = extra?.apiDevHost;
  if (h && typeof h === "string") return parseDevHost(h);
  return null;
}

/**
 * Host:port of the Metro server that served this bundle (same machine as your API in dev).
 * More reliable than manifest hostUri when Expo Go / extra.apiDevHost is missing or wrong.
 */
function getDevServerHostFromScript(): string | null {
  try {
    const source = NativeModules.SourceCode as
      | { getConstants?: () => { scriptURL?: string } }
      | undefined;
    const scriptURL = source?.getConstants?.()?.scriptURL;
    if (!scriptURL || typeof scriptURL !== "string") return null;
    if (!/^https?:\/\//i.test(scriptURL)) return null;
    const m = scriptURL.match(/^https?:\/\/([^/]+)/i);
    if (!m?.[1]) return null;
    return parseDevHost(m[1]);
  } catch {
    return null;
  }
}

/**
 * Dev machine hostname (same as Metro packager host). Used to build http://HOST:8080/api.
 */
function getDevPackagerHost(): string | null {
  const fromScript = getDevServerHostFromScript();
  if (fromScript) return fromScript;

  const fromExtra = getApiDevHostFromExtra();
  if (fromExtra) return fromExtra;

  const candidates: (string | undefined)[] = [
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).manifest?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    const host = parseDevHost(raw);
    if (host) return host;
  }

  try {
    const expUrl = Constants.experienceUrl;
    if (expUrl?.startsWith("exp://")) {
      const host = parseDevHost(expUrl.replace(/^exp:\/\//, "http://"));
      if (host) return host;
    }
  } catch {
    /* ignore */
  }

  return null;
}

function getNativeFallbackApiBase(): string {
  // React Native fetch prefers absolute URLs.
  // Emulator-only defaults when we cannot infer the LAN host (Expo Go on a real device should use getDevPackagerHost).
  if (Platform.OS === "android") return "http://10.0.2.2:8080/api";
  return "http://localhost:8080/api";
}

/**
 * Returns the API base URL, WITHOUT trailing slash.
 *
 * Native __DEV__:
 * 1) Metro-derived host (scriptURL / extra.apiDevHost / hostUri) — same machine the device uses for the bundle; avoids stale EXPO_PUBLIC_API_URL IPs.
 * 2) EXPO_PUBLIC_API_URL (override / CI)
 * 3) Emulator fallbacks (10.0.2.2 / localhost)
 *
 * Production / web: explicit URL, domain, or /api for web.
 */
export function getApiBase(): string {
  const explicit = getExplicitApiBase();

  if (Platform.OS === "web") {
    return explicit ?? "/api";
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const devHost = getDevPackagerHost();
    if (devHost) return `http://${devHost}:8080/api`;
    if (explicit) return explicit;
    return getNativeFallbackApiBase();
  }

  if (explicit) return explicit;
  return getNativeFallbackApiBase();
}

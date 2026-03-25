import Constants from "expo-constants";
import { Platform } from "react-native";

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

function getMetroHost(): string | null {
  // Typical formats:
  // - "192.168.0.12:19000"
  // - "localhost:19000"
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older / alternate shapes:
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any).manifest?.hostUri;

  if (!hostUri || typeof hostUri !== "string") return null;
  return hostUri.split(":")[0] ?? null;
}

function getNativeFallbackApiBase(): string {
  // React Native fetch prefers absolute URLs.
  // These defaults work for:
  // - iOS Simulator: localhost
  // - Android Emulator: 10.0.2.2
  if (Platform.OS === "android") return "http://10.0.2.2:8080/api";
  return "http://localhost:8080/api";
}

/**
 * Returns the API base URL, WITHOUT trailing slash.
 *
 * Priority:
 * 1) EXPO_PUBLIC_API_URL (full base, e.g. http://192.168.0.12:8080/api)
 * 2) EXPO_PUBLIC_DOMAIN (host only, e.g. skillsnap.example.com)
 * 3) Dev-mode best effort from Metro host
 * 4) Platform fallback (localhost / 10.0.2.2)
 */
export function getApiBase(): string {
  const explicit = getExplicitApiBase();
  if (explicit) return explicit;

  if (Platform.OS === "web") {
    // For web builds served alongside the api-server behind the same origin.
    return "/api";
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    const metroHost = getMetroHost();
    if (metroHost) return `http://${metroHost}:8080/api`;
  }

  return getNativeFallbackApiBase();
}

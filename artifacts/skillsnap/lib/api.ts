import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBase } from "@/lib/apiBase";

/** Fail fast when the API host is wrong or unreachable (avoids minutes of loading on device). */
const FETCH_TIMEOUT_MS = 22_000;

async function getToken() {
  return AsyncStorage.getItem("auth_token");
}

async function apiCall(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const base = getApiBase();
  const url = `${base}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const e = err as { name?: string; message?: string };
    const reason =
      e?.name === "AbortError" ? `Request timed out after ${FETCH_TIMEOUT_MS / 1000}s` : e?.message || String(err);
    const devHint = typeof __DEV__ !== "undefined" && __DEV__ ? ` — ${url}` : "";
    throw new Error(`${reason}${devHint}`);
  }
  clearTimeout(timeoutId);

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `API Error (${res.status})`);
  return data;
}

export const api = {
  get: (path: string) => apiCall(path),
  post: (path: string, body: unknown) =>
    apiCall(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    apiCall(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: (path: string, body: unknown) =>
    apiCall(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) =>
    apiCall(path, { method: "DELETE" }),
};

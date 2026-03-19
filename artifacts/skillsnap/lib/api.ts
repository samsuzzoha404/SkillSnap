import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "/api";

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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API Error");
  return data;
}

export const api = {
  get: (path: string) => apiCall(path),
  post: (path: string, body: unknown) =>
    apiCall(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    apiCall(path, { method: "PATCH", body: JSON.stringify(body) }),
};

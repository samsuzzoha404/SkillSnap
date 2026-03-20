import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

function getApiBase() {
  if (Platform.OS === "web") return "/api";
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

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
  const res = await fetch(`${base}${path}`, { ...options, headers });
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
  put: (path: string, body: unknown) =>
    apiCall(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) =>
    apiCall(path, { method: "DELETE" }),
};

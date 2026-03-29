import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBase } from "@/lib/apiBase";

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "consumer" | "provider" | "admin";
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: "consumer" | "provider";
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("auth_token");
        const storedUser = await AsyncStorage.getItem("auth_user");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      setIsLoading(false);
    };
    load();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const base = getApiBase();
    const url = `${base}/auth/login`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (err: any) {
      throw new Error(`Login network error calling ${url}: ${err?.message || String(err)}`);
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Some network / proxy failures can return HTML or empty body.
      // Try to keep the error readable without crashing JSON parsing.
      const fallbackText = await res.text().catch(() => "");
      data = fallbackText ? { message: fallbackText } : null;
    }

    if (!res.ok) {
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        `Login failed (HTTP ${res.status})`;
      throw new Error(msg);
    }
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user as User;
  };

  const register = async (registerData: RegisterData): Promise<User> => {
    const base = getApiBase();
    const url = `${base}/auth/register`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
    } catch (err: any) {
      throw new Error(`Registration network error calling ${url}: ${err?.message || String(err)}`);
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      const fallbackText = await res.text().catch(() => "");
      data = fallbackText ? { message: fallbackText } : null;
    }

    if (!res.ok) {
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        `Registration failed (HTTP ${res.status})`;
      throw new Error(msg);
    }
    if (!data?.token || !data?.user) throw new Error("Invalid registration response");
    await AsyncStorage.setItem("auth_token", data.token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user as User;
  };

  const logout = async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    AsyncStorage.setItem("auth_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

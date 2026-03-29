import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "skillsnap-secret-2024";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

function attachUserFromBearer(req: AuthRequest, token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    return true;
  } catch {
    return false;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "AuthError", message: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  if (!attachUserFromBearer(req, token!)) {
    return res.status(401).json({ error: "AuthError", message: "Invalid or expired token" });
  }
  return next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "AuthError", message: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  if (!attachUserFromBearer(req, token!)) {
    return res.status(401).json({ error: "AuthError", message: "Invalid or expired token" });
  }
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
  }
  return next();
}

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "skillsnap-secret-2024";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "AuthError", message: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token!, JWT_SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    return next();
  } catch {
    return res.status(401).json({ error: "AuthError", message: "Invalid or expired token" });
  }
}

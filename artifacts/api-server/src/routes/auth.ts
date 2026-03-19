import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = process.env["JWT_SECRET"] || "skillsnap-secret-2024";

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phone, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "ConflictError", message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({
      fullName,
      email,
      passwordHash,
      phone: phone || null,
      role: role || "consumer",
    }).returning();

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "ValidationError", message: "Email and password required" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "AuthError", message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "AuthError", message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Login failed" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "AuthError", message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "NotFound", message: "User not found" });
    }

    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(401).json({ error: "AuthError", message: "Invalid token" });
  }
});

export default router;

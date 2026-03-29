import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail, findUserById } from "@workspace/db";

const router = Router();

const JWT_SECRET = process.env["JWT_SECRET"] || "skillsnap-secret-2024";

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, phone, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const roleNorm = String(role).trim().toLowerCase();
    const safeRole = roleNorm === "provider" ? "provider" : "consumer";

    const existing = await findUserByEmail(emailNorm);
    if (existing) {
      return res.status(400).json({ error: "ConflictError", message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await createUser({
      fullName: String(fullName).trim(),
      email: emailNorm,
      passwordHash,
      phone: phone ?? null,
      role: safeRole,
    });

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

    const emailNorm = String(email).trim().toLowerCase();
    /** Mock fixtures used tan.wei.ming@; Mongo seed uses electrical.1@ for the same demo story. */
    const LOGIN_EMAIL_ALIASES: Record<string, string> = {
      "tan.wei.ming@skillsnap.my": "electrical.1@skillsnap.my",
    };
    const lookupEmail = LOGIN_EMAIL_ALIASES[emailNorm] ?? emailNorm;
    const user = await findUserByEmail(lookupEmail);
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

    const user = await findUserById(decoded.userId);
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

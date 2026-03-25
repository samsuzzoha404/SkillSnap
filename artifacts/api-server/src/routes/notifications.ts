import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { listNotificationsByUserId, markNotificationAsRead } from "@workspace/db";

const router = Router();

function getSingleParam(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifications = await listNotificationsByUserId(req.userId!);

    return res.json(
      notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch notifications" });
  }
});

router.patch("/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getSingleParam((req.params as any).id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "Invalid notification id" });
    }
    const updated = await markNotificationAsRead(id);
    if (!updated) return res.status(404).json({ error: "NotFound", message: "Notification not found" });
    return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to update notification" });
  }
});

export default router;

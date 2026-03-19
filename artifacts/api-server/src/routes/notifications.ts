import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!))
      .orderBy(notificationsTable.createdAt);

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
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, req.params.id!))
      .returning();

    return res.json({ ...updated, createdAt: updated!.createdAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to update notification" });
  }
});

export default router;

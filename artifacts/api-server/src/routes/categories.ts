import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.isActive, true));
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch categories" });
  }
});

export default router;

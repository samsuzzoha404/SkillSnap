import { Router } from "express";
import { listActiveCategories } from "@workspace/db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await listActiveCategories();
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch categories" });
  }
});

export default router;

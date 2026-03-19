import { Router } from "express";
import { db } from "@workspace/db";
import { serviceRequestsTable, categoriesTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      categoryId,
      title,
      description,
      address,
      latitude,
      longitude,
      preferredDate,
      preferredTime,
      urgency,
    } = req.body;

    if (!categoryId || !title || !description || !address) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const [request] = await db
      .insert(serviceRequestsTable)
      .values({
        consumerId: req.userId!,
        categoryId,
        title,
        description,
        address,
        latitude: latitude || 3.1390,
        longitude: longitude || 101.6869,
        preferredDate,
        preferredTime,
        urgency: urgency || "medium",
        status: "pending",
      })
      .returning();

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      type: "service_request",
      title: "Service Request Created",
      body: `Your request for "${title}" has been submitted. We're finding the best providers for you.`,
      isRead: false,
    });

    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .limit(1);

    return res.status(201).json({
      ...request,
      category,
      createdAt: request!.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to create service request" });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requests = await db
      .select({ request: serviceRequestsTable, category: categoriesTable })
      .from(serviceRequestsTable)
      .leftJoin(categoriesTable, eq(serviceRequestsTable.categoryId, categoriesTable.id))
      .where(eq(serviceRequestsTable.consumerId, req.userId!));

    return res.json(
      requests.map(({ request, category }) => ({
        ...request,
        category,
        createdAt: request.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch requests" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [row] = await db
      .select({ request: serviceRequestsTable, category: categoriesTable })
      .from(serviceRequestsTable)
      .leftJoin(categoriesTable, eq(serviceRequestsTable.categoryId, categoriesTable.id))
      .where(eq(serviceRequestsTable.id, req.params.id!))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "NotFound", message: "Service request not found" });
    }

    return res.json({
      ...row.request,
      category: row.category,
      createdAt: row.request.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch request" });
  }
});

export default router;

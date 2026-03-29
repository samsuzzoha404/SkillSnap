import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import {
  createNotification,
  createServiceRequest,
  findCategoryById,
  findRequestByIdWithCategory,
  listRequestsByConsumerIdWithCategory,
} from "@workspace/db";

const router = Router();

function getSingleParam(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

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

    const request = await createServiceRequest({
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
    });

    await createNotification({
      userId: req.userId!,
      type: "service_request",
      title: "Service Request Created",
      body: `Your request for "${title}" has been submitted. We're finding the best providers for you.`,
      isRead: false,
    });

    const category = await findCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "NotFound", message: "Category not found" });
    }

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
    const requests = await listRequestsByConsumerIdWithCategory(req.userId!);

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
    const id = getSingleParam((req.params as any).id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "Invalid service request id" });
    }

    const row = await findRequestByIdWithCategory(id);
    if (!row) {
      return res.status(404).json({ error: "NotFound", message: "Service request not found" });
    }

    if (row.request.consumerId !== req.userId) {
      return res.status(403).json({ error: "Forbidden", message: "You do not have access to this service request" });
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

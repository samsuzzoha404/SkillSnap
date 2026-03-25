import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import {
  createBooking,
  createNotification,
  getBookingDetails,
  listBookingsByConsumerId,
  listBookingsByProviderId,
  updateBookingStatus,
  updateServiceRequestStatus,
} from "@workspace/db";

const router = Router();

function getSingleParam(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { serviceRequestId, providerId, scheduledAt } = req.body;

    if (!serviceRequestId || !providerId || !scheduledAt) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const booking = await createBooking({
      serviceRequestId,
      consumerId: req.userId!,
      providerId,
      status: "requested",
      scheduledAt: new Date(scheduledAt),
      paymentStatus: "pending",
    });

    await updateServiceRequestStatus(serviceRequestId, "booked");

    await createNotification({
      userId: req.userId!,
      type: "booking_created",
      title: "Booking Confirmed",
      body: "Your booking has been created. The provider will confirm shortly.",
      isRead: false,
    });

    return res.status(201).json({
      ...booking,
      scheduledAt: booking!.scheduledAt.toISOString(),
      createdAt: booking!.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to create booking" });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role } = req.query;

    const roleParam = Array.isArray(role) ? role[0] : role;
    const bookings =
      roleParam === "provider"
        ? await listBookingsByProviderId(req.userId!)
        : await listBookingsByConsumerId(req.userId!);

    return res.json(
      bookings.map((b) => ({
        ...b,
        scheduledAt: b.scheduledAt.toISOString(),
        acceptedAt: b.acceptedAt?.toISOString() || null,
        startedAt: b.startedAt?.toISOString() || null,
        completedAt: b.completedAt?.toISOString() || null,
        cancelledAt: b.cancelledAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch bookings" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getSingleParam((req.params as any).id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "Invalid booking id" });
    }

    const details = await getBookingDetails(id);
    if (!details) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }
    return res.json({
      ...details.booking,
      scheduledAt: details.booking.scheduledAt.toISOString(),
      acceptedAt: details.booking.acceptedAt?.toISOString() || null,
      startedAt: details.booking.startedAt?.toISOString() || null,
      completedAt: details.booking.completedAt?.toISOString() || null,
      cancelledAt: details.booking.cancelledAt?.toISOString() || null,
      createdAt: details.booking.createdAt.toISOString(),
      serviceRequest: {
        ...details.serviceRequest,
        category: details.category,
        createdAt: details.serviceRequest.createdAt.toISOString(),
      },
      provider: {
        ...details.provider.provider,
        categories: details.provider.categories,
        basePrice: details.provider.basePrice,
        priceType: details.provider.priceType,
        avatarUrl: details.provider.avatarUrl,
        distance: null,
      },
      review: details.review
        ? {
            id: details.review.id,
            bookingId: details.review.bookingId,
            consumerId: details.review.consumerId,
            providerId: details.review.providerId,
            rating: details.review.rating,
            comment: details.review.comment,
            consumerName: details.review.consumerName,
            createdAt: details.review.createdAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch booking" });
  }
});

router.patch("/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = getSingleParam((req.params as any).id);
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "Invalid booking id" });
    }
    const { status } = req.body;

    const updated = await updateBookingStatus(id, status);

    if (!updated) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    await createNotification({
      userId: updated.consumerId,
      type: "booking_status",
      title: `Booking ${status.replace(/_/g, " ")}`,
      body: `Your booking status has been updated to: ${status.replace(/_/g, " ")}`,
      isRead: false,
    });

    return res.json({
      ...updated,
      scheduledAt: updated.scheduledAt.toISOString(),
      acceptedAt: updated.acceptedAt?.toISOString() || null,
      startedAt: updated.startedAt?.toISOString() || null,
      completedAt: updated.completedAt?.toISOString() || null,
      cancelledAt: updated.cancelledAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to update booking status" });
  }
});

export default router;

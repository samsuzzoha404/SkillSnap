import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import {
  createReview,
  findBookingById,
  findReviewByBookingId,
  findUserById,
  listReviewsByConsumerId,
  recalculateAndUpdateProviderAvgRating,
} from "@workspace/db";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const reviews = await listReviewsByConsumerId(req.userId!);
    return res.json(
      reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch reviews" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bookingId, rating, comment = "" } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields: bookingId, rating" });
    }

    const booking = await findBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    if (booking.consumerId !== req.userId) {
      return res.status(403).json({ error: "Forbidden", message: "You can only review your own bookings" });
    }
    if (booking.status !== "completed") {
      return res.status(400).json({ error: "ValidationError", message: "You can only review completed bookings" });
    }
    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ error: "ValidationError", message: "You can only review after payment is completed" });
    }

    const existing = await findReviewByBookingId(bookingId);
    if (existing) {
      return res.status(400).json({ error: "ValidationError", message: "A review already exists for this booking" });
    }

    const review = await createReview({
      bookingId,
      consumerId: req.userId!,
      providerId: booking.providerId,
      rating: Number(rating),
      comment,
    });

    await recalculateAndUpdateProviderAvgRating(booking.providerId);
    const consumer = await findUserById(req.userId!);

    return res.status(201).json({
      ...review,
      consumerName: consumer?.fullName || "Anonymous",
      createdAt: review!.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to create review" });
  }
});

export default router;

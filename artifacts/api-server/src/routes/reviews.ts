import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { createReview, findBookingById } from "@workspace/db";
import { findUserById } from "@workspace/db";
import { recalculateAndUpdateProviderAvgRating } from "@workspace/db";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const booking = await findBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
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

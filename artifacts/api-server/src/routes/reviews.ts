import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, bookingsTable, providerProfilesTable, usersTable } from "@workspace/db/schema";
import { eq, avg } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .limit(1);

    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    const [review] = await db
      .insert(reviewsTable)
      .values({
        bookingId,
        consumerId: req.userId!,
        providerId: booking.providerId,
        rating: Number(rating),
        comment,
      })
      .returning();

    const avgResult = await db
      .select({ avg: avg(reviewsTable.rating) })
      .from(reviewsTable)
      .where(eq(reviewsTable.providerId, booking.providerId));

    const newAvg = Number(avgResult[0]?.avg || 0);
    await db
      .update(providerProfilesTable)
      .set({ avgRating: newAvg })
      .where(eq(providerProfilesTable.id, booking.providerId));

    const [consumer] = await db
      .select({ fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

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

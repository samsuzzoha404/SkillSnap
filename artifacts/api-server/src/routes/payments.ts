import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, bookingsTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/initiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bookingId, amount } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const mockPaymentId = `SNAP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const [payment] = await db
      .insert(paymentsTable)
      .values({
        bookingId,
        provider: "mock",
        externalPaymentId: mockPaymentId,
        amount: Number(amount),
        currency: "MYR",
        status: "paid",
        paidAt: new Date(),
      })
      .returning();

    await db
      .update(bookingsTable)
      .set({ paymentStatus: "paid", finalPrice: Number(amount) })
      .where(eq(bookingsTable.id, bookingId));

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId))
      .limit(1);

    if (booking) {
      await db.insert(notificationsTable).values({
        userId: booking.consumerId,
        type: "payment",
        title: "Payment Successful",
        body: `Payment of MYR ${Number(amount).toFixed(2)} has been processed successfully.`,
        isRead: false,
      });
    }

    return res.json({
      paymentId: mockPaymentId,
      status: "paid",
      amount: Number(amount),
      currency: "MYR",
      message: "Payment processed successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Payment failed" });
  }
});

export default router;

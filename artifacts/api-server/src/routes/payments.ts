import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { findBookingById, listPaymentsByConsumerId, processMockPaymentAndUpdateBooking } from "@workspace/db";

const router = Router();

async function processPayment(
  bookingId: string,
  amount: number,
  userId: string,
  res: import("express").Response,
) {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "NotFound", message: "Booking not found" });
  }
  if (booking.consumerId !== userId) {
    return res.status(403).json({ error: "Forbidden", message: "You can only pay for your own bookings" });
  }
  if (booking.status !== "completed") {
    return res.status(400).json({
      error: "ValidationError",
      message: "Payment is only allowed after the booking is completed",
    });
  }
  if (booking.paymentStatus === "paid") {
    return res.status(400).json({ error: "ValidationError", message: "This booking is already paid" });
  }

  const result = await processMockPaymentAndUpdateBooking({ bookingId, amount });
  return res.json(result);
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const payments = await listPaymentsByConsumerId(req.userId!);
    return res.json(
      payments.map((p) => ({
        ...p,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch payments" });
  }
});

router.post("/initiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || !amount) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }
    return processPayment(bookingId, Number(amount), req.userId!, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Payment failed" });
  }
});

router.post("/:bookingId/pay", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = (req.params as { bookingId?: string }).bookingId;
    const { amount } = req.body || {};
    if (!bookingId || amount == null) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields: bookingId, amount" });
    }
    return processPayment(bookingId, Number(amount), req.userId!, res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Payment failed" });
  }
});

export default router;

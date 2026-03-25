import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { processMockPaymentAndUpdateBooking } from "@workspace/db";

const router = Router();

async function processPayment(bookingId: string, amount: number, res: import("express").Response) {
  const result = await processMockPaymentAndUpdateBooking({ bookingId, amount });
  return res.json(result);
}

router.post("/initiate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || !amount) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }
    return processPayment(bookingId, Number(amount), res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Payment failed" });
  }
});

// Frontend compatibility: POST /payments/:bookingId/pay with { amount, method? }
router.post("/:bookingId/pay", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookingId = (req.params as { bookingId?: string }).bookingId;
    const { amount } = req.body || {};
    if (!bookingId || amount == null) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields: bookingId, amount" });
    }
    return processPayment(bookingId, Number(amount), res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Payment failed" });
  }
});

export default router;

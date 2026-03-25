import { Router } from "express";
import {
  countBookingsByStatus,
  countProvidersByVerificationStatus,
  countUsers,
  countBookings,
  countProviders,
  sumPaidPaymentsAmount,
} from "@workspace/db";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const activeStatuses = ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress"];

    const [totalUsers, totalProviders, totalBookings] = await Promise.all([
      countUsers(),
      countProviders(),
      countBookings(),
    ]);

    const activeBookingsByStatus = await Promise.all(
      activeStatuses.map((s) => countBookingsByStatus(s as any)),
    );
    const activeBookings = activeBookingsByStatus.reduce((a, b) => a + b, 0);

    const completedBookings = await countBookingsByStatus("completed");
    const totalRevenue = await sumPaidPaymentsAmount();
    const pendingVerifications = await countProvidersByVerificationStatus("pending");

    return res.json({
      totalUsers,
      totalProviders,
      totalBookings,
      activeBookings,
      completedBookings,
      totalRevenue,
      pendingVerifications,
      avgRating: 4.3,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch stats" });
  }
});

export default router;

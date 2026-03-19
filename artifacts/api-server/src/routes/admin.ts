import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, bookingsTable, providerProfilesTable, paymentsTable } from "@workspace/db/schema";
import { count, sum, avg, eq } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [totalProviders] = await db.select({ count: count() }).from(providerProfilesTable);
    const [totalBookings] = await db.select({ count: count() }).from(bookingsTable);

    const activeStatuses = ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress"];
    const allBookings = await db.select({ status: bookingsTable.status }).from(bookingsTable);
    const activeBookings = allBookings.filter((b) => activeStatuses.includes(b.status)).length;
    const completedBookings = allBookings.filter((b) => b.status === "completed").length;

    const [revenue] = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(eq(paymentsTable.status, "paid"));
    const [pendingVerifications] = await db.select({ count: count() }).from(providerProfilesTable).where(eq(providerProfilesTable.verificationStatus, "pending"));

    return res.json({
      totalUsers: Number(totalUsers?.count || 0),
      totalProviders: Number(totalProviders?.count || 0),
      totalBookings: Number(totalBookings?.count || 0),
      activeBookings,
      completedBookings,
      totalRevenue: Number(revenue?.total || 0),
      pendingVerifications: Number(pendingVerifications?.count || 0),
      avgRating: 4.3,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch stats" });
  }
});

export default router;

import { Router } from "express";
import {
  avgPlatformProviderRating,
  bookingsAndRevenueByMonth,
  countBookingsByStatus,
  countProvidersByVerificationStatus,
  countUsers,
  countBookings,
  countProviders,
  createNotification,
  findProviderProfileById,
  findUserById,
  listAllBookingsAdmin,
  listAllProviderProfilesWithUser,
  listCategoryStats,
  listPaymentsAdmin,
  listUsersPaginated,
  platformCompletionRate,
  sumPaidPaymentsAmount,
  updateProviderProfile,
} from "@workspace/db";
import type { VerificationStatus } from "@workspace/db";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

function getSingleParam(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

function parseIntParam(value: unknown, fallback: number): number {
  const s = getSingleParam(value);
  const n = s != null ? Number.parseInt(s, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const activeStatuses = ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress"];

    const [totalUsers, totalProviders, totalBookings, avgRating, completionRate] = await Promise.all([
      countUsers(),
      countProviders(),
      countBookings(),
      avgPlatformProviderRating(),
      platformCompletionRate(),
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
      avgRating,
      completionRate,
      openDisputes: 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch stats" });
  }
});

router.get("/analytics", requireAdmin, async (req, res) => {
  try {
    const months = parseIntParam(req.query.months, 12);
    const series = await bookingsAndRevenueByMonth(months);
    return res.json({ series });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch analytics" });
  }
});

router.get("/category-stats", requireAdmin, async (_req, res) => {
  try {
    const rows = await listCategoryStats();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch category stats" });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseIntParam(req.query.limit, 50), 200);
    const offset = parseIntParam(req.query.offset, 0);
    const role = getSingleParam(req.query.role) as "consumer" | "provider" | "admin" | undefined;
    const { items, total } = await listUsersPaginated({
      limit,
      offset,
      role: role && ["consumer", "provider", "admin"].includes(role) ? role : undefined,
    });
    return res.json({
      items: items.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch users" });
  }
});

/** Body carries `providerId` so UUIDs are not parsed as URL path segments (avoids Express 404 on PATCH). */
router.patch("/providers/verification", requireAdmin, async (req, res) => {
  try {
    const { providerId, verificationStatus, reason } = req.body as {
      providerId?: string;
      verificationStatus?: string;
      reason?: string;
    };
    const id = typeof providerId === "string" ? providerId.trim() : "";
    if (!id) {
      return res.status(400).json({ error: "ValidationError", message: "providerId is required" });
    }
    if (verificationStatus !== "verified" && verificationStatus !== "rejected") {
      return res.status(400).json({
        error: "ValidationError",
        message: "verificationStatus must be \"verified\" or \"rejected\"",
      });
    }

    const existing = await findProviderProfileById(id);
    if (!existing) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const updated = await updateProviderProfile(id, { verificationStatus });
    if (!updated) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const userDoc = await findUserById(existing.userId);
    const user = userDoc
      ? {
          fullName: userDoc.fullName,
          avatarUrl: userDoc.avatarUrl,
          email: userDoc.email,
          phone: userDoc.phone,
        }
      : { fullName: "", email: "", avatarUrl: null, phone: null };

    try {
      if (verificationStatus === "verified") {
        await createNotification({
          userId: existing.userId,
          type: "verification",
          title: "Profile verified",
          body: "Your provider profile has been approved. You can now receive job matches.",
          isRead: false,
        });
      } else {
        const detail = reason?.trim()
          ? ` Reason: ${reason.trim()}`
          : "";
        await createNotification({
          userId: existing.userId,
          type: "verification",
          title: "Profile not approved",
          body: `Your provider verification was rejected.${detail}`,
          isRead: false,
        });
      }
    } catch (notifyErr) {
      console.error("admin verification: notification failed (profile still updated)", notifyErr);
    }

    return res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to update verification" });
  }
});

router.get("/providers", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseIntParam(req.query.limit, 50), 200);
    const offset = parseIntParam(req.query.offset, 0);
    const vs = getSingleParam(req.query.verificationStatus) as VerificationStatus | undefined;
    const { items, total } = await listAllProviderProfilesWithUser({
      limit,
      offset,
      verificationStatus:
        vs && ["pending", "verified", "rejected"].includes(vs) ? vs : undefined,
    });
    return res.json({
      items: items.map(({ provider, user }) => ({
        ...provider,
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
        user,
      })),
      total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch providers" });
  }
});

router.get("/bookings", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseIntParam(req.query.limit, 50), 200);
    const offset = parseIntParam(req.query.offset, 0);
    const statusRaw = getSingleParam(req.query.status);
    const validBookingStatuses = [
      "requested",
      "matched",
      "accepted",
      "on_the_way",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
    ] as const;
    const status = statusRaw && validBookingStatuses.includes(statusRaw as any) ? (statusRaw as any) : undefined;
    const { items, total } = await listAllBookingsAdmin({
      limit,
      offset,
      status,
    });
    return res.json({
      items: items.map((row) => ({
        booking: {
          ...row.booking,
          scheduledAt: row.booking.scheduledAt.toISOString(),
          acceptedAt: row.booking.acceptedAt?.toISOString() ?? null,
          startedAt: row.booking.startedAt?.toISOString() ?? null,
          completedAt: row.booking.completedAt?.toISOString() ?? null,
          cancelledAt: row.booking.cancelledAt?.toISOString() ?? null,
          createdAt: row.booking.createdAt.toISOString(),
        },
        serviceRequest: {
          ...row.serviceRequest,
          createdAt: row.serviceRequest.createdAt.toISOString(),
        },
        category: row.category,
        consumerName: row.consumerName,
        providerBusinessName: row.providerBusinessName,
      })),
      total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch bookings" });
  }
});

router.get("/payments", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseIntParam(req.query.limit, 50), 200);
    const offset = parseIntParam(req.query.offset, 0);
    const { items, total } = await listPaymentsAdmin({ limit, offset });
    return res.json({
      items: items.map((p) => ({
        ...p,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch payments" });
  }
});

export default router;

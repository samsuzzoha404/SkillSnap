import { Router } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  serviceRequestsTable,
  providerProfilesTable,
  reviewsTable,
  notificationsTable,
  categoriesTable,
  providerServicesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { serviceRequestId, providerId, scheduledAt } = req.body;

    if (!serviceRequestId || !providerId || !scheduledAt) {
      return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
    }

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        serviceRequestId,
        consumerId: req.userId!,
        providerId,
        status: "requested",
        scheduledAt: new Date(scheduledAt),
        paymentStatus: "pending",
      })
      .returning();

    await db
      .update(serviceRequestsTable)
      .set({ status: "booked" })
      .where(eq(serviceRequestsTable.id, serviceRequestId));

    await db.insert(notificationsTable).values({
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

    let bookings;
    if (role === "provider") {
      bookings = await db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.providerId, req.userId!));
    } else {
      bookings = await db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.consumerId, req.userId!));
    }

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
    const { id } = req.params;

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id!)).limit(1);
    if (!booking) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    const [serviceReqRow] = await db
      .select({ request: serviceRequestsTable, category: categoriesTable })
      .from(serviceRequestsTable)
      .leftJoin(categoriesTable, eq(serviceRequestsTable.categoryId, categoriesTable.id))
      .where(eq(serviceRequestsTable.id, booking.serviceRequestId))
      .limit(1);

    const [providerRow] = await db
      .select({
        provider: providerProfilesTable,
        user: { fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl },
      })
      .from(providerProfilesTable)
      .innerJoin(usersTable, eq(providerProfilesTable.userId, usersTable.id))
      .where(eq(providerProfilesTable.id, booking.providerId))
      .limit(1);

    const services = providerRow
      ? await db
          .select({ category: categoriesTable, service: providerServicesTable })
          .from(providerServicesTable)
          .innerJoin(categoriesTable, eq(providerServicesTable.categoryId, categoriesTable.id))
          .where(eq(providerServicesTable.providerId, providerRow.provider.id))
      : [];

    const [review] = await db
      .select({ review: reviewsTable, consumer: { fullName: usersTable.fullName } })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.consumerId, usersTable.id))
      .where(eq(reviewsTable.bookingId, id!))
      .limit(1);

    return res.json({
      ...booking,
      scheduledAt: booking.scheduledAt.toISOString(),
      acceptedAt: booking.acceptedAt?.toISOString() || null,
      startedAt: booking.startedAt?.toISOString() || null,
      completedAt: booking.completedAt?.toISOString() || null,
      cancelledAt: booking.cancelledAt?.toISOString() || null,
      createdAt: booking.createdAt.toISOString(),
      serviceRequest: serviceReqRow
        ? {
            ...serviceReqRow.request,
            category: serviceReqRow.category,
            createdAt: serviceReqRow.request.createdAt.toISOString(),
          }
        : null,
      provider: providerRow
        ? {
            id: providerRow.provider.id,
            userId: providerRow.provider.userId,
            businessName: providerRow.provider.businessName,
            bio: providerRow.provider.bio,
            yearsExperience: providerRow.provider.yearsExperience,
            avgRating: providerRow.provider.avgRating,
            totalJobs: providerRow.provider.totalJobs,
            completionRate: providerRow.provider.completionRate,
            acceptanceRate: providerRow.provider.acceptanceRate,
            serviceRadiusKm: providerRow.provider.serviceRadiusKm,
            verificationStatus: providerRow.provider.verificationStatus,
            categories: services.map((s) => s.category),
            basePrice: services[0]?.service.basePrice || 80,
            priceType: services[0]?.service.priceType || "hourly",
            avatarUrl: providerRow.user.avatarUrl,
            distance: null,
          }
        : null,
      review: review
        ? {
            id: review.review.id,
            bookingId: review.review.bookingId,
            consumerId: review.review.consumerId,
            providerId: review.review.providerId,
            rating: review.review.rating,
            comment: review.review.comment,
            consumerName: review.consumer.fullName,
            createdAt: review.review.createdAt.toISOString(),
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
    const { id } = req.params;
    const { status } = req.body;

    const now = new Date();
    const updates: Record<string, unknown> = { status };

    if (status === "accepted") updates.acceptedAt = now;
    else if (status === "in_progress") updates.startedAt = now;
    else if (status === "completed") {
      updates.completedAt = now;
      updates.finalPrice = 150;
    } else if (status === "cancelled") updates.cancelledAt = now;

    const [updated] = await db
      .update(bookingsTable)
      .set(updates as Parameters<typeof bookingsTable.$inferInsert>[0])
      .where(eq(bookingsTable.id, id!))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "NotFound", message: "Booking not found" });
    }

    await db.insert(notificationsTable).values({
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

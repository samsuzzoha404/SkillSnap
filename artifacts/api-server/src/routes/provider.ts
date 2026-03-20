import { Router } from "express";
import { db } from "@workspace/db";
import {
  providerProfilesTable,
  providerServicesTable,
  providerAvailabilityTable,
  categoriesTable,
  bookingsTable,
  serviceRequestsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

async function getProviderProfile(userId: string) {
  const [row] = await db
    .select()
    .from(providerProfilesTable)
    .where(eq(providerProfilesTable.userId, userId))
    .limit(1);
  return row;
}

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const [userRow] = await db
      .select({ fullName: usersTable.fullName, email: usersTable.email, phone: usersTable.phone, avatarUrl: usersTable.avatarUrl })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    const services = await db
      .select({ category: categoriesTable, service: providerServicesTable })
      .from(providerServicesTable)
      .innerJoin(categoriesTable, eq(providerServicesTable.categoryId, categoriesTable.id))
      .where(eq(providerServicesTable.providerId, profile.id));

    const availability = await db
      .select()
      .from(providerAvailabilityTable)
      .where(eq(providerAvailabilityTable.providerId, profile.id))
      .orderBy(providerAvailabilityTable.dayOfWeek);

    return res.json({
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      fullName: userRow?.fullName,
      email: userRow?.email,
      phone: userRow?.phone,
      avatarUrl: userRow?.avatarUrl,
      services: services.map(({ service, category }) => ({ ...service, category })),
      availability,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch provider profile" });
  }
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const { businessName, bio, yearsExperience, serviceRadiusKm, address, latitude, longitude } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (businessName !== undefined) updates.businessName = businessName;
    if (bio !== undefined) updates.bio = bio;
    if (yearsExperience !== undefined) updates.yearsExperience = Number(yearsExperience);
    if (serviceRadiusKm !== undefined) updates.serviceRadiusKm = Number(serviceRadiusKm);
    if (address !== undefined) updates.address = address;
    if (latitude !== undefined) updates.latitude = Number(latitude);
    if (longitude !== undefined) updates.longitude = Number(longitude);

    const [updated] = await db
      .update(providerProfilesTable)
      .set(updates as any)
      .where(eq(providerProfilesTable.id, profile.id))
      .returning();

    return res.json({ ...updated, createdAt: updated!.createdAt.toISOString(), updatedAt: updated!.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to update provider profile" });
  }
});

router.post("/setup", requireAuth, async (req: AuthRequest, res) => {
  try {
    const existing = await getProviderProfile(req.userId!);
    if (existing) {
      return res.status(400).json({ error: "ConflictError", message: "Provider profile already exists" });
    }

    const { businessName, bio, yearsExperience, serviceRadiusKm, address, categoryIds } = req.body;
    if (!businessName) {
      return res.status(400).json({ error: "ValidationError", message: "Business name is required" });
    }

    const [profile] = await db
      .insert(providerProfilesTable)
      .values({
        userId: req.userId!,
        businessName,
        bio: bio || "",
        yearsExperience: yearsExperience ? Number(yearsExperience) : 0,
        verificationStatus: "pending",
        serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : 15,
        address: address || "",
      })
      .returning();

    if (categoryIds?.length > 0) {
      for (const categoryId of categoryIds) {
        await db.insert(providerServicesTable).values({
          providerId: profile!.id,
          categoryId,
          basePrice: 80,
          priceType: "hourly",
          isActive: true,
        }).onConflictDoNothing();
      }
    }

    for (let day = 1; day <= 5; day++) {
      await db.insert(providerAvailabilityTable).values({
        providerId: profile!.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "18:00",
        isAvailable: true,
      }).onConflictDoNothing();
    }

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      type: "verification",
      title: "Profile Submitted",
      body: "Your provider profile has been submitted for verification. We'll notify you once it's approved.",
      isRead: false,
    });

    return res.status(201).json({ ...profile, createdAt: profile!.createdAt.toISOString(), updatedAt: profile!.updatedAt.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to create provider profile" });
  }
});

router.get("/inbox", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const bookings = await db
      .select({
        booking: bookingsTable,
        request: serviceRequestsTable,
        consumer: { fullName: usersTable.fullName, phone: usersTable.phone, avatarUrl: usersTable.avatarUrl },
        category: categoriesTable,
      })
      .from(bookingsTable)
      .innerJoin(serviceRequestsTable, eq(bookingsTable.serviceRequestId, serviceRequestsTable.id))
      .innerJoin(usersTable, eq(bookingsTable.consumerId, usersTable.id))
      .leftJoin(categoriesTable, eq(serviceRequestsTable.categoryId, categoriesTable.id))
      .where(and(eq(bookingsTable.providerId, profile.id), eq(bookingsTable.status, "requested")))
      .orderBy(desc(bookingsTable.createdAt));

    return res.json(
      bookings.map(({ booking, request, consumer, category }) => ({
        ...booking,
        scheduledAt: booking.scheduledAt.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        acceptedAt: booking.acceptedAt?.toISOString() || null,
        serviceRequest: { ...request, category, createdAt: request.createdAt.toISOString() },
        consumer,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch inbox" });
  }
});

router.get("/bookings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const { status } = req.query;

    let query = db
      .select({
        booking: bookingsTable,
        request: serviceRequestsTable,
        consumer: { fullName: usersTable.fullName, phone: usersTable.phone, avatarUrl: usersTable.avatarUrl },
        category: categoriesTable,
      })
      .from(bookingsTable)
      .innerJoin(serviceRequestsTable, eq(bookingsTable.serviceRequestId, serviceRequestsTable.id))
      .innerJoin(usersTable, eq(bookingsTable.consumerId, usersTable.id))
      .leftJoin(categoriesTable, eq(serviceRequestsTable.categoryId, categoriesTable.id))
      .where(eq(bookingsTable.providerId, profile.id))
      .orderBy(desc(bookingsTable.createdAt)) as any;

    const bookings = await query;

    const filtered = status
      ? bookings.filter((b: any) => b.booking.status === status)
      : bookings;

    return res.json(
      filtered.map(({ booking, request, consumer, category }: any) => ({
        ...booking,
        scheduledAt: booking.scheduledAt.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        acceptedAt: booking.acceptedAt?.toISOString() || null,
        startedAt: booking.startedAt?.toISOString() || null,
        completedAt: booking.completedAt?.toISOString() || null,
        cancelledAt: booking.cancelledAt?.toISOString() || null,
        serviceRequest: { ...request, category, createdAt: request.createdAt.toISOString() },
        consumer,
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch bookings" });
  }
});

router.get("/earnings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const allBookings = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.providerId, profile.id))
      .orderBy(desc(bookingsTable.createdAt));

    const completedBookings = allBookings.filter((b) => b.status === "completed");
    const totalEarnings = completedBookings.reduce((s, b) => s + (b.finalPrice || 0), 0);
    const pendingEarnings = completedBookings.filter((b) => b.paymentStatus === "pending").reduce((s, b) => s + (b.finalPrice || 0), 0);
    const paidEarnings = completedBookings.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + (b.finalPrice || 0), 0);

    const byMonth: Record<string, number> = {};
    completedBookings.forEach((b) => {
      const month = (b.completedAt || b.createdAt).toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + (b.finalPrice || 0);
    });

    return res.json({
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      totalJobs: completedBookings.length,
      totalBookings: allBookings.length,
      byMonth,
      recentBookings: completedBookings.slice(0, 15).map((b) => ({
        id: b.id,
        finalPrice: b.finalPrice,
        paymentStatus: b.paymentStatus,
        completedAt: b.completedAt?.toISOString(),
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch earnings" });
  }
});

router.get("/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

    const availability = await db
      .select()
      .from(providerAvailabilityTable)
      .where(eq(providerAvailabilityTable.providerId, profile.id))
      .orderBy(providerAvailabilityTable.dayOfWeek);

    return res.json(availability);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch schedule" });
  }
});

router.put("/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

    const { availability } = req.body;

    for (const slot of (availability || [])) {
      const existing = await db
        .select()
        .from(providerAvailabilityTable)
        .where(and(eq(providerAvailabilityTable.providerId, profile.id), eq(providerAvailabilityTable.dayOfWeek, slot.dayOfWeek)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(providerAvailabilityTable)
          .set({ startTime: slot.startTime, endTime: slot.endTime, isAvailable: slot.isAvailable })
          .where(eq(providerAvailabilityTable.id, existing[0]!.id));
      } else {
        await db.insert(providerAvailabilityTable).values({
          providerId: profile.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: slot.isAvailable,
        });
      }
    }

    const updated = await db
      .select()
      .from(providerAvailabilityTable)
      .where(eq(providerAvailabilityTable.providerId, profile.id))
      .orderBy(providerAvailabilityTable.dayOfWeek);

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to update schedule" });
  }
});

router.get("/dashboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

    const allBookings = await db
      .select({ booking: bookingsTable, request: serviceRequestsTable, category: categoriesTable })
      .from(bookingsTable)
      .innerJoin(serviceRequestsTable, eq(bookingsTable.serviceRequestId, serviceRequestsTable.id))
      .leftJoin(categoriesTable, eq(serviceRequestsTable.categoryId, categoriesTable.id))
      .where(eq(bookingsTable.providerId, profile.id))
      .orderBy(desc(bookingsTable.createdAt));

    const pending = allBookings.filter((b) => b.booking.status === "requested").length;
    const active = allBookings.filter((b) => ["accepted", "on_the_way", "arrived", "in_progress"].includes(b.booking.status)).length;
    const completed = allBookings.filter((b) => b.booking.status === "completed");
    const totalEarnings = completed.reduce((s, b) => s + (b.booking.finalPrice || 0), 0);

    const today = new Date().toDateString();
    const todayJobs = allBookings.filter((b) => new Date(b.booking.scheduledAt).toDateString() === today);

    return res.json({
      profile: {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
      stats: {
        pending,
        active,
        completed: completed.length,
        totalEarnings,
        avgRating: profile.avgRating,
        completionRate: profile.completionRate,
        acceptanceRate: profile.acceptanceRate,
      },
      todayJobs: todayJobs.slice(0, 5).map(({ booking, request, category }) => ({
        ...booking,
        scheduledAt: booking.scheduledAt.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        serviceRequest: { ...request, category, createdAt: request.createdAt.toISOString() },
      })),
      recentActivity: allBookings.slice(0, 5).map(({ booking, request, category }) => ({
        ...booking,
        scheduledAt: booking.scheduledAt.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        serviceRequest: { ...request, category, createdAt: request.createdAt.toISOString() },
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch dashboard" });
  }
});

export default router;

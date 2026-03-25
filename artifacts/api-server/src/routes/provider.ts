import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import {
  createNotification,
  createProviderProfile,
  createServicesForProvider,
  findProviderProfileByUserId,
  findUserById,
  listAvailabilityByProviderId,
  listProviderBookingsJoin,
  listServicesByProviderIdWithCategories,
  upsertAvailabilitySlots,
  updateProviderProfile,
} from "@workspace/db";

const router = Router();

async function getProviderProfile(userId: string) {
  return findProviderProfileByUserId(userId);
}

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProviderProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
    }

    const userRow = await findUserById(req.userId!);

    const services = await listServicesByProviderIdWithCategories(profile.id);

    const availability = await listAvailabilityByProviderId(profile.id);

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

    const updated = await updateProviderProfile(profile.id, updates as any);
    if (!updated) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

    return res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
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

    const profile = await createProviderProfile({
      userId: req.userId!,
      businessName,
      bio: bio || "",
      yearsExperience: yearsExperience ? Number(yearsExperience) : 0,
      verificationStatus: "pending",
      serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : 15,
      address: address || null,
    });

    if (categoryIds?.length > 0) {
      await createServicesForProvider({
        providerId: profile.id,
        services: categoryIds.map((categoryId: string) => ({
          categoryId,
          basePrice: 80,
          priceType: "hourly",
          isActive: true,
        })),
      });
    }

    await upsertAvailabilitySlots(profile.id, Array.from({ length: 5 }, (_, i) => ({
      dayOfWeek: i + 1,
      startTime: "09:00",
      endTime: "18:00",
      isAvailable: true,
    })));

    await createNotification({
      userId: req.userId!,
      type: "verification",
      title: "Profile Submitted",
      body: "Your provider profile has been submitted for verification. We'll notify you once it's approved.",
      isRead: false,
    });

    return res.status(201).json({ ...profile, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString() });
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

    const bookings = await listProviderBookingsJoin(profile.id, { status: "requested" });

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

    const statusParam = Array.isArray(status) ? status[0] : status;
    const bookings = await listProviderBookingsJoin(profile.id, statusParam ? { status: statusParam as any } : undefined);

    return res.json(
      bookings.map(({ booking, request, consumer, category }) => ({
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

    const allBookings = (await listProviderBookingsJoin(profile.id)).map((j) => j.booking);

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

    const availability = await listAvailabilityByProviderId(profile.id);

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
    await upsertAvailabilitySlots(profile.id, availability || []);

    const updated = await listAvailabilityByProviderId(profile.id);
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

    const allBookings = await listProviderBookingsJoin(profile.id);

    const pending = allBookings.filter((b) => b.booking.status === "requested").length;
    const active = allBookings.filter((b) =>
      ["accepted", "on_the_way", "arrived", "in_progress"].includes(b.booking.status),
    ).length;
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

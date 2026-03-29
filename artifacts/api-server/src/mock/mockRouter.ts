import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  users,
  categories,
  providerProfiles,
  providerServices,
  providerAvailability,
  serviceRequests,
  bookings,
  reviews,
  notifications,
  makeToken,
  verifyToken,
  uid,
  toPublicUser,
  getProviderWithDetails,
  MockUser,
  MockBooking,
  MockProviderProfile,
  MockNotification,
} from "./store.js";

const ACTIVE_BOOKING_STATUSES = new Set([
  "requested",
  "matched",
  "accepted",
  "on_the_way",
  "arrived",
  "in_progress",
]);

const router = Router();

function getAuth(req: Request): { userId: string; role: string } | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return verifyToken(header.split(" ")[1]!);
}

function requireAuth(req: Request, res: Response, next: () => void) {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "AuthError", message: "Authentication required" });
    return;
  }
  (req as any).userId = auth.userId;
  (req as any).userRole = auth.role;
  next();
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "AuthError", message: "Authentication required" });
    return;
  }
  if (auth.role !== "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    return;
  }
  next();
}

function getBookingWithDetails(booking: MockBooking) {
  const request = serviceRequests.find(r => r.id === booking.serviceRequestId);
  const category = request ? categories.find(c => c.id === request.categoryId) : null;
  const providerProfile = providerProfiles.find(p => p.id === booking.providerId);
  const providerUser = providerProfile ? users.find(u => u.id === providerProfile.userId) : null;
  const provServices = providerProfile ? providerServices.filter(s => s.providerId === providerProfile.id) : [];
  const provCategories = provServices.map(s => categories.find(c => c.id === s.categoryId)).filter(Boolean);
  const primarySvc = provServices[0];
  const consumerUser = users.find(u => u.id === booking.consumerId);
  const review = reviews.find(r => r.bookingId === booking.id);
  const consumerOfReview = review ? users.find(u => u.id === review.consumerId) : null;

  return {
    id: booking.id,
    serviceRequestId: booking.serviceRequestId,
    consumerId: booking.consumerId,
    providerId: booking.providerId,
    status: booking.status,
    scheduledAt: booking.scheduledAt,
    acceptedAt: booking.acceptedAt,
    startedAt: booking.startedAt,
    completedAt: booking.completedAt,
    cancelledAt: booking.cancelledAt,
    finalPrice: booking.finalPrice,
    paymentStatus: booking.paymentStatus,
    notes: booking.notes,
    createdAt: booking.createdAt,
    serviceRequest: request
      ? { ...request, category }
      : null,
    provider: providerProfile && providerUser
      ? {
          id: providerProfile.id,
          userId: providerProfile.userId,
          businessName: providerProfile.businessName,
          bio: providerProfile.bio,
          yearsExperience: providerProfile.yearsExperience,
          avgRating: providerProfile.avgRating,
          totalJobs: providerProfile.totalJobs,
          completionRate: providerProfile.completionRate,
          acceptanceRate: providerProfile.acceptanceRate,
          serviceRadiusKm: providerProfile.serviceRadiusKm,
          verificationStatus: providerProfile.verificationStatus,
          categories: provCategories,
          basePrice: primarySvc?.basePrice || 80,
          priceType: primarySvc?.priceType || "hourly",
          avatarUrl: providerUser.avatarUrl,
          fullName: providerUser.fullName,
          phone: providerUser.phone,
          distance: 2.4,
        }
      : null,
    consumer: consumerUser
      ? { fullName: consumerUser.fullName, phone: consumerUser.phone, avatarUrl: consumerUser.avatarUrl }
      : null,
    review: review
      ? {
          id: review.id,
          bookingId: review.bookingId,
          consumerId: review.consumerId,
          providerId: review.providerId,
          rating: review.rating,
          comment: review.comment,
          consumerName: consumerOfReview?.fullName || "Customer",
          createdAt: review.createdAt,
        }
      : null,
  };
}

router.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    demoMode: true,
    mockAuth: true,
    mockRepository: true,
    demoUsers: [
      { email: "consumer@skillsnap.my", role: "consumer" },
      { email: "tan.wei.ming@skillsnap.my", role: "provider", status: "verified" },
      { email: "lee.pending@skillsnap.my", role: "provider", status: "pending" },
    ],
  });
});

router.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", demoMode: true });
});

router.post("/api/auth/register", async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
  }
  const existing = users.find(u => u.email === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "ConflictError", message: "Email already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser: MockUser = {
    id: uid(),
    fullName,
    email: email.toLowerCase(),
    phone: phone || "",
    role: role || "consumer",
    avatarUrl: null,
    isActive: true,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  if (role === "provider") {
    const newProfile: MockProviderProfile = {
      id: uid(),
      userId: newUser.id,
      businessName: fullName + "'s Services",
      bio: "",
      yearsExperience: 0,
      avgRating: 0,
      totalJobs: 0,
      completionRate: 0,
      acceptanceRate: 0,
      serviceRadiusKm: 15,
      verificationStatus: "pending",
      address: "",
      latitude: null,
      longitude: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    providerProfiles.push(newProfile);

    notifications.push({
      id: uid(),
      userId: newUser.id,
      type: "verification",
      title: "Profile Submitted",
      body: "Your provider profile has been submitted for verification. We'll notify you once it's approved.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  const token = makeToken(newUser.id, newUser.role);
  return res.status(201).json({ token, user: toPublicUser(newUser) });
});

router.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "ValidationError", message: "Email and password required" });
  }
  const emailNorm = String(email).trim().toLowerCase();
  /** Aligns app demo button with Mongo seed; mock fixtures use tan.wei.ming@ for that provider. */
  const LOGIN_ALIASES: Record<string, string> = {
    "electrical.1@skillsnap.my": "tan.wei.ming@skillsnap.my",
  };
  const lookupEmail = LOGIN_ALIASES[emailNorm] ?? emailNorm;
  const user = users.find((u) => u.email === lookupEmail);
  if (!user) {
    return res.status(401).json({ error: "AuthError", message: "Invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "AuthError", message: "Invalid credentials" });
  }
  const token = makeToken(user.id, user.role);
  return res.json({ token, user: toPublicUser(user) });
});

router.get("/api/auth/me", requireAuth as any, (req, res) => {
  const user = users.find(u => u.id === (req as any).userId);
  if (!user) return res.status(404).json({ error: "NotFound", message: "User not found" });
  return res.json(toPublicUser(user));
});

router.get("/api/categories", (_req, res) => {
  res.json(categories.filter(c => c.isActive));
});

router.get("/api/providers", (req, res) => {
  const { categoryId } = req.query;
  const verifiedProfiles = providerProfiles.filter(p => p.verificationStatus === "verified");

  const result = verifiedProfiles.map(profile => {
    const details = getProviderWithDetails(profile);
    if (categoryId) {
      const hasCategory = providerServices.some(s => s.providerId === profile.id && s.categoryId === categoryId);
      if (!hasCategory) return null;
    }
    return details;
  }).filter(Boolean);

  res.json(result);
});

router.get("/api/providers/:id", (req, res) => {
  const profile = providerProfiles.find(p => p.id === req.params.id);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider not found" });

  const user = users.find(u => u.id === profile.userId)!;
  const services = providerServices.filter(s => s.providerId === profile.id);
  const serviceCategories = services.map(s => ({
    ...s,
    category: categories.find(c => c.id === s.categoryId),
  }));
  const primarySvc = services[0];
  const provReviews = reviews
    .filter(r => r.providerId === profile.id)
    .slice(0, 8)
    .map(r => {
      const consumer = users.find(u => u.id === r.consumerId);
      return { ...r, consumerName: consumer?.fullName || "Customer" };
    });

  return res.json({
    id: profile.id,
    userId: profile.userId,
    businessName: profile.businessName,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience,
    avgRating: profile.avgRating,
    totalJobs: profile.totalJobs,
    completionRate: profile.completionRate,
    acceptanceRate: profile.acceptanceRate,
    serviceRadiusKm: profile.serviceRadiusKm,
    verificationStatus: profile.verificationStatus,
    address: profile.address,
    categories: serviceCategories.map(s => s.category).filter(Boolean),
    services: serviceCategories,
    basePrice: primarySvc?.basePrice || 80,
    priceType: primarySvc?.priceType || "hourly",
    avatarUrl: user?.avatarUrl || null,
    fullName: user?.fullName,
    email: user?.email,
    phone: user?.phone,
    distance: +(Math.random() * 8 + 0.5).toFixed(1),
    recentReviews: provReviews,
  });
});

router.get("/api/providers/:id/reviews", (req, res) => {
  const provReviews = reviews
    .filter(r => r.providerId === req.params.id)
    .map(r => {
      const consumer = users.find(u => u.id === r.consumerId);
      return { ...r, consumerName: consumer?.fullName || "Customer" };
    });
  res.json(provReviews);
});

function buildMatchResult(profile: MockProviderProfile) {
  const details = getProviderWithDetails(profile);
  const ratingScore = +(profile.avgRating / 5 * 0.9 + Math.random() * 0.1).toFixed(2);
  const completionScore = +(profile.completionRate / 100 * 0.9 + Math.random() * 0.1).toFixed(2);
  const experienceScore = +(Math.min(profile.yearsExperience / 15, 1) * 0.9 + Math.random() * 0.1).toFixed(2);
  const proximityScore = +(Math.random() * 0.4 + 0.6).toFixed(2);
  const matchScore = +((ratingScore + completionScore + experienceScore + proximityScore) / 4).toFixed(2);
  return {
    ...details,
    matchScore,
    estimatedPrice: +(details.basePrice * (1.2 + Math.random() * 0.6)).toFixed(2),
    scoreBreakdown: {
      ratingScore,
      completionScore,
      experienceScore,
      proximityScore,
    },
  };
}

router.get("/api/matching", requireAuth as any, (req, res) => {
  const { serviceRequestId } = req.query;
  const request = serviceRequests.find(r => r.id === serviceRequestId);
  const catId = request?.categoryId;

  const matches = providerProfiles
    .filter(p => p.verificationStatus === "verified")
    .filter(p => !catId || providerServices.some(s => s.providerId === p.id && s.categoryId === catId))
    .map(buildMatchResult)
    .sort((a, b) => b.matchScore - a.matchScore);

  res.json(matches);
});

router.get("/api/matching/:requestId", requireAuth as any, (req, res) => {
  const request = serviceRequests.find(r => r.id === req.params.requestId);
  const catId = request?.categoryId;

  const matches = providerProfiles
    .filter(p => p.verificationStatus === "verified")
    .filter(p => !catId || providerServices.some(s => s.providerId === p.id && s.categoryId === catId))
    .map(buildMatchResult)
    .sort((a, b) => b.matchScore - a.matchScore);

  res.json(matches);
});

router.post("/api/service-requests", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const { categoryId, title, description, address, urgency, preferredDate, preferredTime, budget } = req.body;
  if (!categoryId || !title || !address) {
    return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
  }

  const newRequest = {
    id: uid(),
    consumerId: auth.userId,
    categoryId,
    title,
    description: description || "",
    address,
    latitude: null,
    longitude: null,
    urgency: urgency || "medium",
    preferredDate: preferredDate || new Date().toISOString().slice(0, 10),
    preferredTime: preferredTime || "09:00",
    status: "pending" as const,
    budget: budget ? Number(budget) : null,
    createdAt: new Date().toISOString(),
  };
  serviceRequests.push(newRequest);

  return res.status(201).json(newRequest);
});

router.get("/api/service-requests", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });
  const userRequests = serviceRequests.filter(r => r.consumerId === auth.userId);
  return res.json(userRequests.map(r => ({
    ...r,
    category: categories.find(c => c.id === r.categoryId),
  })));
});

router.post("/api/bookings", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const { serviceRequestId, providerId, scheduledAt } = req.body;
  if (!serviceRequestId || !providerId || !scheduledAt) {
    return res.status(400).json({ error: "ValidationError", message: "Missing required fields" });
  }

  const existingRequest = serviceRequests.find(r => r.id === serviceRequestId);
  if (existingRequest) existingRequest.status = "booked";

  const newBooking: MockBooking = {
    id: uid(),
    serviceRequestId,
    consumerId: auth.userId,
    providerId,
    status: "requested",
    scheduledAt,
    acceptedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    finalPrice: null,
    paymentStatus: "pending",
    notes: null,
    createdAt: new Date().toISOString(),
  };
  bookings.push(newBooking);

  notifications.push({
    id: uid(),
    userId: auth.userId,
    type: "booking_created",
    title: "Booking Confirmed",
    body: "Your booking has been created. The provider will confirm shortly.",
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(getBookingWithDetails(newBooking));
});

router.get("/api/bookings", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const { role } = req.query;
  let userBookings: MockBooking[];

  if (role === "provider") {
    const profile = providerProfiles.find(p => p.userId === auth.userId);
    userBookings = profile ? bookings.filter(b => b.providerId === profile.id) : [];
  } else {
    userBookings = bookings.filter(b => b.consumerId === auth.userId);
  }

  return res.json(userBookings.map(b => getBookingWithDetails(b)));
});

router.get("/api/bookings/:id", requireAuth as any, (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "NotFound", message: "Booking not found" });
  return res.json(getBookingWithDetails(booking));
});

router.patch("/api/bookings/:id/status", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "NotFound", message: "Booking not found" });

  const { status } = req.body;
  const now = new Date().toISOString();

  booking.status = status;
  if (status === "accepted") booking.acceptedAt = now;
  else if (status === "in_progress") booking.startedAt = now;
  else if (status === "completed") {
    booking.completedAt = now;
    booking.finalPrice = 180;
  } else if (status === "cancelled") booking.cancelledAt = now;
  else if (status === "on_the_way") booking.acceptedAt = booking.acceptedAt || now;
  else if (status === "arrived") booking.startedAt = booking.startedAt || now;

  const statusLabels: Record<string, string> = {
    accepted: "Booking Accepted",
    on_the_way: "Provider On The Way",
    arrived: "Provider Has Arrived",
    in_progress: "Work In Progress",
    completed: "Job Completed",
    cancelled: "Booking Cancelled",
  };

  notifications.push({
    id: uid(),
    userId: booking.consumerId,
    type: "booking_status",
    title: statusLabels[status] || `Booking ${status}`,
    body: `Your booking status has been updated to: ${status.replace(/_/g, " ")}.`,
    isRead: false,
    createdAt: now,
  });

  if (status === "completed") {
    const provProfile = providerProfiles.find(p => p.id === booking.providerId);
    if (provProfile) {
      provProfile.totalJobs += 1;
      notifications.push({
        id: uid(),
        userId: provProfile.userId,
        type: "payment_received",
        title: "Payment Received",
        body: `You've received MYR ${(booking.finalPrice || 180).toFixed(2)} for your completed job.`,
        isRead: false,
        createdAt: now,
      });
    }
  }

  return res.json(getBookingWithDetails(booking));
});

router.post("/api/payments/:bookingId/pay", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const booking = bookings.find(b => b.id === req.params.bookingId);
  if (!booking) return res.status(404).json({ error: "NotFound", message: "Booking not found" });

  booking.paymentStatus = "paid";
  if (!booking.finalPrice) booking.finalPrice = 180;

  notifications.push({
    id: uid(),
    userId: auth.userId,
    type: "payment_success",
    title: "Payment Successful",
    body: `Your payment of MYR ${booking.finalPrice.toFixed(2)} has been processed. Reference: SS-${Date.now().toString().slice(-8)}.`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return res.json({
    success: true,
    reference: `SS-${Date.now().toString().slice(-8)}`,
    amount: booking.finalPrice,
    paymentStatus: "paid",
    booking: getBookingWithDetails(booking),
  });
});

router.get("/api/reviews", (req, res) => {
  const { providerId, consumerId } = req.query;
  let filtered = [...reviews];
  if (providerId) filtered = filtered.filter(r => r.providerId === providerId);
  if (consumerId) filtered = filtered.filter(r => r.consumerId === consumerId);
  res.json(filtered.map(r => {
    const consumer = users.find(u => u.id === r.consumerId);
    return { ...r, consumerName: consumer?.fullName || "Customer" };
  }));
});

router.post("/api/reviews", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const { bookingId, rating, comment } = req.body;
  if (!bookingId || !rating) {
    return res.status(400).json({ error: "ValidationError", message: "bookingId and rating required" });
  }

  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) return res.status(404).json({ error: "NotFound", message: "Booking not found" });

  const existing = reviews.find(r => r.bookingId === bookingId && r.consumerId === auth.userId);
  if (existing) return res.status(400).json({ error: "ConflictError", message: "Review already submitted" });

  const newReview = {
    id: uid(),
    bookingId,
    consumerId: auth.userId,
    providerId: booking.providerId,
    rating: Number(rating),
    comment: comment || "",
    createdAt: new Date().toISOString(),
  };
  reviews.push(newReview);

  const provProfile = providerProfiles.find(p => p.id === booking.providerId);
  if (provProfile) {
    const provReviews = reviews.filter(r => r.providerId === provProfile.id);
    provProfile.avgRating = +(provReviews.reduce((s, r) => s + r.rating, 0) / provReviews.length).toFixed(1);
  }

  const consumer = users.find(u => u.id === auth.userId);
  return res.status(201).json({ ...newReview, consumerName: consumer?.fullName || "Customer" });
});

router.get("/api/notifications", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });
  const userNotifs = notifications
    .filter(n => n.userId === auth.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json(userNotifs);
});

router.patch("/api/notifications/:id/read", requireAuth as any, (req, res) => {
  const notif = notifications.find(n => n.id === req.params.id);
  if (notif) notif.isRead = true;
  res.json({ success: true });
});

router.patch("/api/notifications/read-all", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });
  notifications.filter(n => n.userId === auth.userId).forEach(n => { n.isRead = true; });
  return res.json({ success: true });
});

router.get("/api/provider/me", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const user = users.find(u => u.id === auth.userId)!;
  const services = providerServices.filter(s => s.providerId === profile.id).map(s => ({
    ...s,
    category: categories.find(c => c.id === s.categoryId),
  }));
  const availability = providerAvailability
    .filter(a => a.providerId === profile.id)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return res.json({
    ...profile,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    services,
    availability,
  });
});

router.patch("/api/provider/me", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const { businessName, bio, yearsExperience, serviceRadiusKm, address } = req.body;
  if (businessName !== undefined) profile.businessName = businessName;
  if (bio !== undefined) profile.bio = bio;
  if (yearsExperience !== undefined) profile.yearsExperience = Number(yearsExperience);
  if (serviceRadiusKm !== undefined) profile.serviceRadiusKm = Number(serviceRadiusKm);
  if (address !== undefined) profile.address = address;
  profile.updatedAt = new Date().toISOString();

  return res.json({ ...profile });
});

router.post("/api/provider/setup", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const existing = providerProfiles.find(p => p.userId === auth.userId);
  if (existing) {
    const { businessName, bio, yearsExperience, serviceRadiusKm, address, categoryIds } = req.body;
    if (businessName !== undefined) existing.businessName = businessName;
    if (bio !== undefined) existing.bio = bio;
    if (yearsExperience !== undefined) existing.yearsExperience = Number(yearsExperience);
    if (serviceRadiusKm !== undefined) existing.serviceRadiusKm = Number(serviceRadiusKm);
    if (address !== undefined) existing.address = address;
    existing.updatedAt = new Date().toISOString();
    if (categoryIds?.length > 0) {
      for (const categoryId of categoryIds) {
        const hasSvc = providerServices.some(s => s.providerId === existing.id && s.categoryId === categoryId);
        if (!hasSvc) {
          providerServices.push({ id: uid(), providerId: existing.id, categoryId, basePrice: 80, priceType: "hourly", isActive: true });
        }
      }
    }
    return res.json(existing);
  }

  const { businessName, bio, yearsExperience, serviceRadiusKm, address, categoryIds } = req.body;
  if (!businessName) return res.status(400).json({ error: "ValidationError", message: "Business name is required" });

  const newProfile: MockProviderProfile = {
    id: uid(),
    userId: auth.userId,
    businessName,
    bio: bio || "",
    yearsExperience: yearsExperience ? Number(yearsExperience) : 0,
    avgRating: 0,
    totalJobs: 0,
    completionRate: 0,
    acceptanceRate: 0,
    serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : 15,
    verificationStatus: "pending",
    address: address || "",
    latitude: null,
    longitude: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  providerProfiles.push(newProfile);

  if (categoryIds?.length > 0) {
    for (const categoryId of categoryIds) {
      providerServices.push({ id: uid(), providerId: newProfile.id, categoryId, basePrice: 80, priceType: "hourly", isActive: true });
    }
  }

  for (let day = 1; day <= 5; day++) {
    providerAvailability.push({ id: uid(), providerId: newProfile.id, dayOfWeek: day, startTime: "09:00", endTime: "18:00", isAvailable: true });
  }

  notifications.push({
    id: uid(),
    userId: auth.userId,
    type: "verification",
    title: "Profile Submitted for Review",
    body: "Your provider profile has been submitted for verification. You'll be notified once approved.",
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(newProfile);
});

router.get("/api/provider/inbox", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  if (profile.verificationStatus !== "verified") {
    return res.json([]);
  }

  const inboxBookings = bookings
    .filter(b => b.providerId === profile.id && b.status === "requested")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(inboxBookings.map(b => getBookingWithDetails(b)));
});

router.get("/api/provider/bookings", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const provBookings = bookings
    .filter(b => b.providerId === profile.id && b.status !== "requested")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(provBookings.map(b => getBookingWithDetails(b)));
});

router.get("/api/provider/earnings", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const provBookings = bookings.filter(b => b.providerId === profile.id);
  const completed = provBookings.filter(b => b.status === "completed");
  const totalEarnings = completed.reduce((s, b) => s + (b.finalPrice || 0), 0);
  const pendingEarnings = completed.filter(b => b.paymentStatus === "pending").reduce((s, b) => s + (b.finalPrice || 0), 0);
  const paidEarnings = completed.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + (b.finalPrice || 0), 0);

  const byMonth: Record<string, number> = {};
  completed.forEach(b => {
    const month = (b.completedAt || b.createdAt).slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + (b.finalPrice || 0);
  });

  return res.json({
    totalEarnings,
    pendingEarnings,
    paidEarnings,
    totalJobs: completed.length,
    totalBookings: provBookings.length,
    byMonth,
    recentBookings: completed.slice(0, 15).map(b => ({
      id: b.id,
      finalPrice: b.finalPrice,
      paymentStatus: b.paymentStatus,
      completedAt: b.completedAt,
      createdAt: b.createdAt,
    })),
  });
});

router.get("/api/provider/schedule", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const avail = providerAvailability.filter(a => a.providerId === profile.id).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return res.json(avail);
});

router.put("/api/provider/schedule", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const { availability } = req.body;
  for (const slot of (availability || [])) {
    const existing = providerAvailability.find(a => a.providerId === profile.id && a.dayOfWeek === slot.dayOfWeek);
    if (existing) {
      existing.isAvailable = slot.isAvailable;
      existing.startTime = slot.startTime || existing.startTime;
      existing.endTime = slot.endTime || existing.endTime;
    } else {
      providerAvailability.push({
        id: uid(),
        providerId: profile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime || "09:00",
        endTime: slot.endTime || "18:00",
        isAvailable: slot.isAvailable,
      });
    }
  }

  return res.json(providerAvailability.filter(a => a.providerId === profile.id).sort((a, b) => a.dayOfWeek - b.dayOfWeek));
});

router.get("/api/provider/dashboard", requireAuth as any, (req, res) => {
  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ error: "AuthError", message: "Authentication required" });

  const profile = providerProfiles.find(p => p.userId === auth.userId);
  if (!profile) return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });

  const provBookings = bookings.filter(b => b.providerId === profile.id);
  const pending = provBookings.filter(b => b.status === "requested").length;
  const active = provBookings.filter(b => ["accepted", "on_the_way", "arrived", "in_progress"].includes(b.status)).length;
  const completed = provBookings.filter(b => b.status === "completed");
  const totalEarnings = completed.reduce((s, b) => s + (b.finalPrice || 0), 0);

  const todayStr = new Date().toDateString();
  const todayJobs = provBookings
    .filter(b => new Date(b.scheduledAt).toDateString() === todayStr)
    .slice(0, 5)
    .map(b => getBookingWithDetails(b));

  const recentActivity = provBookings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(b => getBookingWithDetails(b));

  return res.json({
    profile: { ...profile },
    stats: {
      pending,
      active,
      completed: completed.length,
      totalEarnings,
      avgRating: profile.avgRating,
      completionRate: profile.completionRate,
      acceptanceRate: profile.acceptanceRate,
    },
    todayJobs,
    recentActivity,
  });
});

router.get("/api/matching/providers", requireAuth as any, (req, res) => {
  const { categoryId } = req.query;
  const verifiedProfiles = providerProfiles.filter(p => p.verificationStatus === "verified");

  const matches = verifiedProfiles
    .filter(p => !categoryId || providerServices.some(s => s.providerId === p.id && s.categoryId === categoryId))
    .map(profile => ({
      ...getProviderWithDetails(profile),
      matchScore: +(Math.random() * 30 + 70).toFixed(0),
      estimatedPayout: +(Math.random() * 100 + 100).toFixed(2),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  res.json(matches);
});

/** Admin routes (demo mode): admin UI expects these under `/api/admin/*`. */
router.get("/api/admin/stats", requireAdmin as any, (_req, res) => {
  const totalUsers = users.length;
  const totalProviders = providerProfiles.length;
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => ACTIVE_BOOKING_STATUSES.has(b.status)).length;
  const completedBookings = bookings.filter(b => b.status === "completed").length;
  const totalRevenue = bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + (b.finalPrice || 0), 0);
  const pendingVerifications = providerProfiles.filter(p => p.verificationStatus === "pending").length;
  const verified = providerProfiles.filter(p => p.verificationStatus === "verified");
  const avgRating = verified.length ? verified.reduce((s, p) => s + p.avgRating, 0) / verified.length : 0;
  const completionRate = totalBookings ? (completedBookings / totalBookings) * 100 : 0;
  res.json({
    totalUsers,
    totalProviders,
    totalBookings,
    activeBookings,
    completedBookings,
    totalRevenue,
    pendingVerifications,
    avgRating: Math.round(avgRating * 10) / 10,
    completionRate: Math.round(completionRate * 10) / 10,
    openDisputes: 0,
  });
});

router.get("/api/admin/analytics", requireAdmin as any, (req, res) => {
  const months = Math.min(Math.max(Number.parseInt(String(req.query.months ?? "12"), 10) || 12, 1), 24);
  const series: { month: string; bookings: number; revenue: number }[] = [];
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - (months - 1));
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setUTCMonth(start.getUTCMonth() + i);
    series.push({ month: d.toISOString().slice(0, 7), bookings: 0, revenue: 0 });
  }
  for (const b of bookings) {
    const bk = b.createdAt.slice(0, 7);
    const slot = series.find(s => s.month === bk);
    if (slot) slot.bookings += 1;
    if (b.paymentStatus === "paid" && b.finalPrice) {
      const paidAt = (b.completedAt || b.scheduledAt).slice(0, 7);
      const revSlot = series.find(s => s.month === paidAt);
      if (revSlot) revSlot.revenue += b.finalPrice;
    }
  }
  res.json({ series });
});

router.get("/api/admin/category-stats", requireAdmin as any, (_req, res) => {
  const rows = categories.map((c) => {
    const providerCount = new Set(providerServices.filter(s => s.categoryId === c.id && s.isActive).map(s => s.providerId)).size;
    const reqs = serviceRequests.filter(r => r.categoryId === c.id);
    const bookingCount = bookings.filter(b => reqs.some(r => r.id === b.serviceRequestId)).length;
    const provProfiles = providerProfiles.filter(p =>
      providerServices.some(s => s.providerId === p.id && s.categoryId === c.id),
    );
    const ratings = provProfiles.map(p => p.avgRating).filter(x => x > 0);
    const avgProviderRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      categoryId: c.id,
      name: c.name,
      providerCount,
      bookingCount,
      avgProviderRating: Math.round(avgProviderRating * 10) / 10,
    };
  });
  res.json(rows);
});

router.get("/api/admin/users", requireAdmin as any, (req, res) => {
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const offset = Number.parseInt(String(req.query.offset ?? "0"), 10) || 0;
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  let list = [...users];
  if (role && ["consumer", "provider", "admin"].includes(role)) {
    list = list.filter(u => u.role === role);
  }
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const total = list.length;
  const slice = list.slice(offset, offset + limit);
  res.json({
    items: slice.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.createdAt,
    })),
    total,
  });
});

router.get("/api/admin/providers", requireAdmin as any, (req, res) => {
  const limit = Math.min(Number.parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const offset = Number.parseInt(String(req.query.offset ?? "0"), 10) || 0;
  const vs = typeof req.query.verificationStatus === "string" ? req.query.verificationStatus : undefined;
  let list = [...providerProfiles];
  if (vs && ["pending", "verified", "rejected"].includes(vs)) {
    list = list.filter(p => p.verificationStatus === vs);
  }
  list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const total = list.length;
  const slice = list.slice(offset, offset + limit);
  const items = slice
    .map((p) => {
      const u = users.find(u => u.id === p.userId);
      if (!u) return null;
      return {
        ...p,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        user: { fullName: u.fullName, avatarUrl: u.avatarUrl, email: u.email, phone: u.phone },
      };
    })
    .filter(Boolean);
  res.json({ items, total });
});

router.patch("/api/admin/providers/verification", requireAdmin as any, (req, res) => {
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
  const profile = providerProfiles.find(p => p.id === id);
  if (!profile) {
    return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
  }
  const u = users.find(u => u.id === profile.userId);
  if (!u) {
    return res.status(404).json({ error: "NotFound", message: "Provider profile not found" });
  }
  profile.verificationStatus = verificationStatus;
  profile.updatedAt = new Date().toISOString();
  if (verificationStatus === "verified") {
    notifications.push({
      id: uid(),
      userId: profile.userId,
      type: "verification",
      title: "Profile verified",
      body: "Your provider profile has been approved. You can now receive job matches.",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    const detail = typeof reason === "string" && reason.trim() ? ` Reason: ${reason.trim()}` : "";
    notifications.push({
      id: uid(),
      userId: profile.userId,
      type: "verification",
      title: "Profile not approved",
      body: `Your provider verification was rejected.${detail}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
  return res.json({
    ...profile,
    user: {
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      email: u.email,
      phone: u.phone,
    },
  });
});

router.get("/api/admin/bookings", requireAdmin as any, (_req, res) => {
  const items = bookings
    .map((b) => {
      const sr = serviceRequests.find(r => r.id === b.serviceRequestId);
      if (!sr) return null;
      const cat = categories.find(c => c.id === sr.categoryId);
      if (!cat) return null;
      const pp = providerProfiles.find(p => p.id === b.providerId);
      const consumer = users.find(u => u.id === b.consumerId);
      return {
        booking: {
          id: b.id,
          serviceRequestId: b.serviceRequestId,
          consumerId: b.consumerId,
          providerId: b.providerId,
          status: b.status,
          scheduledAt: b.scheduledAt,
          acceptedAt: b.acceptedAt,
          startedAt: b.startedAt,
          completedAt: b.completedAt,
          cancelledAt: b.cancelledAt,
          finalPrice: b.finalPrice,
          paymentStatus: b.paymentStatus,
          notes: b.notes,
          createdAt: b.createdAt,
        },
        serviceRequest: {
          id: sr.id,
          consumerId: sr.consumerId,
          categoryId: sr.categoryId,
          title: sr.title,
          description: sr.description,
          address: sr.address,
          latitude: sr.latitude,
          longitude: sr.longitude,
          urgency: sr.urgency,
          preferredDate: sr.preferredDate,
          preferredTime: sr.preferredTime,
          status: sr.status,
          budget: sr.budget,
          createdAt: sr.createdAt,
        },
        category: { id: cat.id, name: cat.name, description: cat.description, icon: cat.iconUrl, isActive: cat.isActive },
        consumerName: consumer?.fullName ?? "—",
        providerBusinessName: pp?.businessName ?? "—",
      };
    })
    .filter(Boolean);
  res.json({ items, total: items.length });
});

router.get("/api/admin/payments", requireAdmin as any, (_req, res) => {
  res.json({ items: [], total: 0 });
});

export default router;

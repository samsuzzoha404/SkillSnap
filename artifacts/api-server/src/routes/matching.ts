import { Router } from "express";
import { db } from "@workspace/db";
import {
  serviceRequestsTable,
  providerProfilesTable,
  providerServicesTable,
  providerAvailabilityTable,
  bookingsTable,
  categoriesTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const WEIGHTS = {
  distance: 0.3,
  rating: 0.25,
  availability: 0.15,
  workload: 0.1,
  acceptanceRate: 0.1,
  completionRate: 0.05,
  reputation: 0.05,
};

router.get("/:requestId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { requestId } = req.params;

    const [serviceRequest] = await db
      .select()
      .from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.id, requestId!))
      .limit(1);

    if (!serviceRequest) {
      return res.status(404).json({ error: "NotFound", message: "Service request not found" });
    }

    const matchingProviders = await db
      .select({
        provider: providerProfilesTable,
        user: { fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl },
      })
      .from(providerProfilesTable)
      .innerJoin(usersTable, eq(providerProfilesTable.userId, usersTable.id))
      .where(eq(providerProfilesTable.verificationStatus, "verified"));

    const providerDetails = await Promise.all(
      matchingProviders.map(async ({ provider, user }) => {
        const services = await db
          .select({ category: categoriesTable, service: providerServicesTable })
          .from(providerServicesTable)
          .innerJoin(categoriesTable, eq(providerServicesTable.categoryId, categoriesTable.id))
          .where(eq(providerServicesTable.providerId, provider.id));

        const hasCategory = services.some((s) => s.category.id === serviceRequest.categoryId);
        if (!hasCategory) return null;

        const activeJobs = await db
          .select({ count: count() })
          .from(bookingsTable)
          .where(eq(bookingsTable.providerId, provider.id));

        const activeJobCount = activeJobs[0]?.count || 0;

        const dayOfWeek = new Date(serviceRequest.preferredDate).getDay();
        const availability = await db
          .select()
          .from(providerAvailabilityTable)
          .where(eq(providerAvailabilityTable.providerId, provider.id))
          .limit(1);

        const isAvailable = availability.some(
          (a) => a.dayOfWeek === dayOfWeek && a.isAvailable
        );

        const distance = provider.latitude && provider.longitude
          ? haversineDistance(serviceRequest.latitude, serviceRequest.longitude, provider.latitude, provider.longitude)
          : Math.random() * 10 + 1;

        const inRadius = distance <= (provider.serviceRadiusKm || 15);
        if (!inRadius) return null;

        const distanceScore = Math.max(0, 1 - distance / (provider.serviceRadiusKm || 15));
        const ratingScore = provider.avgRating / 5;
        const availabilityScore = isAvailable ? 1 : 0.3;
        const workloadScore = Math.max(0, 1 - Number(activeJobCount) / 5);
        const acceptanceRateScore = provider.acceptanceRate / 100;
        const completionRateScore = provider.completionRate / 100;
        const reputationScore = provider.reputationScore / 100;

        const matchScore =
          distanceScore * WEIGHTS.distance +
          ratingScore * WEIGHTS.rating +
          availabilityScore * WEIGHTS.availability +
          workloadScore * WEIGHTS.workload +
          acceptanceRateScore * WEIGHTS.acceptanceRate +
          completionRateScore * WEIGHTS.completionRate +
          reputationScore * WEIGHTS.reputation;

        const primaryService = services.find((s) => s.category.id === serviceRequest.categoryId) || services[0];
        const estimatedPrice = primaryService?.service.basePrice
          ? primaryService.service.priceType === "hourly"
            ? primaryService.service.basePrice * 2
            : primaryService.service.basePrice
          : 120;

        return {
          id: provider.id,
          userId: provider.userId,
          businessName: provider.businessName,
          bio: provider.bio,
          yearsExperience: provider.yearsExperience,
          avgRating: provider.avgRating,
          totalJobs: provider.totalJobs,
          completionRate: provider.completionRate,
          acceptanceRate: provider.acceptanceRate,
          serviceRadiusKm: provider.serviceRadiusKm,
          verificationStatus: provider.verificationStatus,
          categories: services.map((s) => s.category),
          basePrice: primaryService?.service.basePrice || 80,
          priceType: primaryService?.service.priceType || "hourly",
          avatarUrl: user.avatarUrl,
          distance: Math.round(distance * 10) / 10,
          matchScore: Math.round(matchScore * 100) / 100,
          matchRank: 0,
          estimatedPrice,
          scoreBreakdown: {
            distanceScore: Math.round(distanceScore * 100) / 100,
            ratingScore: Math.round(ratingScore * 100) / 100,
            availabilityScore: Math.round(availabilityScore * 100) / 100,
            workloadScore: Math.round(workloadScore * 100) / 100,
            acceptanceRateScore: Math.round(acceptanceRateScore * 100) / 100,
            completionRateScore: Math.round(completionRateScore * 100) / 100,
            reputationScore: Math.round(reputationScore * 100) / 100,
          },
        };
      })
    );

    const valid = providerDetails.filter(Boolean) as NonNullable<(typeof providerDetails)[0]>[];
    valid.sort((a, b) => b.matchScore - a.matchScore);
    valid.forEach((p, i) => (p.matchRank = i + 1));

    return res.json(valid);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Matching failed" });
  }
});

export default router;

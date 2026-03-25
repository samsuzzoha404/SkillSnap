import { Router } from "express";
import {
  findProviderProfileById,
  findUserById,
  listReviewsByProviderIdWithConsumerName,
  listServicesByProviderIdWithCategories,
  listVerifiedProviderProfilesWithUserSummary,
} from "@workspace/db";

const router = Router();

function getSingleParam(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

router.get("/", async (req, res) => {
  try {
    const { categoryId, limit = "20", offset = "0" } = req.query;

    const requestedCategoryId = getSingleParam(categoryId);
    const providers = await listVerifiedProviderProfilesWithUserSummary({
      limit: Number(limit),
      offset: Number(offset),
    });

    const result = await Promise.all(
      providers.map(async ({ provider, user }) => {
        const services = await listServicesByProviderIdWithCategories(provider.id);

        if (requestedCategoryId) {
          const hasCategory = services.some((s) => s.category.id === requestedCategoryId);
          if (!hasCategory) return null;
        }

        const primaryService = services[0]?.service;
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
          basePrice: primaryService?.basePrice || 80,
          priceType: primaryService?.priceType || "hourly",
          avatarUrl: user.avatarUrl,
          distance: null,
        };
      }),
    );

    return res.json(result.filter(Boolean));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch providers" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await findProviderProfileById(id!);
    if (!provider) {
      return res.status(404).json({ error: "NotFound", message: "Provider not found" });
    }
    const user = await findUserById(provider.userId);
    if (!user) {
      return res.status(404).json({ error: "NotFound", message: "Provider user not found" });
    }

    const services = await listServicesByProviderIdWithCategories(provider.id);
    const reviews = await listReviewsByProviderIdWithConsumerName(provider.id);

    const primaryService = services[0]?.service;

    return res.json({
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
      basePrice: primaryService?.basePrice || 80,
      priceType: primaryService?.priceType || "hourly",
      avatarUrl: user.avatarUrl,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      distance: null,
      recentReviews: reviews.slice(0, 5).map((review) => ({
        id: review.id,
        bookingId: review.bookingId,
        consumerId: review.consumerId,
        providerId: review.providerId,
        rating: review.rating,
        comment: review.comment,
        consumerName: review.consumerName,
        createdAt: review.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch provider" });
  }
});

router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await listReviewsByProviderIdWithConsumerName(id!);
    return res.json(
      reviews.map((review) => ({
        id: review.id,
        bookingId: review.bookingId,
        consumerId: review.consumerId,
        providerId: review.providerId,
        rating: review.rating,
        comment: review.comment,
        consumerName: review.consumerName,
        createdAt: review.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch reviews" });
  }
});

export default router;

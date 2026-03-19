import { Router } from "express";
import { db } from "@workspace/db";
import {
  providerProfilesTable,
  providerServicesTable,
  categoriesTable,
  usersTable,
  reviewsTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { categoryId, limit = "20", offset = "0" } = req.query;

    let query = db
      .select({
        provider: providerProfilesTable,
        user: { fullName: usersTable.fullName, avatarUrl: usersTable.avatarUrl },
      })
      .from(providerProfilesTable)
      .innerJoin(usersTable, eq(providerProfilesTable.userId, usersTable.id))
      .where(eq(providerProfilesTable.verificationStatus, "verified"))
      .limit(Number(limit))
      .offset(Number(offset));

    const providers = await query;

    const result = await Promise.all(
      providers.map(async ({ provider, user }) => {
        const services = await db
          .select({ category: categoriesTable, service: providerServicesTable })
          .from(providerServicesTable)
          .innerJoin(categoriesTable, eq(providerServicesTable.categoryId, categoriesTable.id))
          .where(eq(providerServicesTable.providerId, provider.id));

        if (categoryId) {
          const hasCategory = services.some((s) => s.category.id === categoryId);
          if (!hasCategory) return null;
        }

        const primaryService = services[0];
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
          distance: null,
        };
      })
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

    const [row] = await db
      .select({
        provider: providerProfilesTable,
        user: {
          fullName: usersTable.fullName,
          email: usersTable.email,
          phone: usersTable.phone,
          avatarUrl: usersTable.avatarUrl,
        },
      })
      .from(providerProfilesTable)
      .innerJoin(usersTable, eq(providerProfilesTable.userId, usersTable.id))
      .where(eq(providerProfilesTable.id, id!))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: "NotFound", message: "Provider not found" });
    }

    const services = await db
      .select({ category: categoriesTable, service: providerServicesTable })
      .from(providerServicesTable)
      .innerJoin(categoriesTable, eq(providerServicesTable.categoryId, categoriesTable.id))
      .where(eq(providerServicesTable.providerId, row.provider.id));

    const reviews = await db
      .select({ review: reviewsTable, consumer: { fullName: usersTable.fullName } })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.consumerId, usersTable.id))
      .where(eq(reviewsTable.providerId, row.provider.id))
      .limit(5);

    const primaryService = services[0];

    return res.json({
      id: row.provider.id,
      userId: row.provider.userId,
      businessName: row.provider.businessName,
      bio: row.provider.bio,
      yearsExperience: row.provider.yearsExperience,
      avgRating: row.provider.avgRating,
      totalJobs: row.provider.totalJobs,
      completionRate: row.provider.completionRate,
      acceptanceRate: row.provider.acceptanceRate,
      serviceRadiusKm: row.provider.serviceRadiusKm,
      verificationStatus: row.provider.verificationStatus,
      categories: services.map((s) => s.category),
      basePrice: primaryService?.service.basePrice || 80,
      priceType: primaryService?.service.priceType || "hourly",
      avatarUrl: row.user.avatarUrl,
      fullName: row.user.fullName,
      email: row.user.email,
      phone: row.user.phone,
      distance: null,
      recentReviews: reviews.map(({ review, consumer }) => ({
        id: review.id,
        bookingId: review.bookingId,
        consumerId: review.consumerId,
        providerId: review.providerId,
        rating: review.rating,
        comment: review.comment,
        consumerName: consumer.fullName,
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

    const reviews = await db
      .select({ review: reviewsTable, consumer: { fullName: usersTable.fullName } })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.consumerId, usersTable.id))
      .where(eq(reviewsTable.providerId, id!));

    return res.json(
      reviews.map(({ review, consumer }) => ({
        id: review.id,
        bookingId: review.bookingId,
        consumerId: review.consumerId,
        providerId: review.providerId,
        rating: review.rating,
        comment: review.comment,
        consumerName: consumer.fullName,
        createdAt: review.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "InternalError", message: "Failed to fetch reviews" });
  }
});

export default router;

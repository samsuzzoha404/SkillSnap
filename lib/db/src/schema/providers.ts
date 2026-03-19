import {
  pgTable,
  text,
  real,
  integer,
  boolean,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const providerProfilesTable = pgTable("provider_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  bio: text("bio").notNull().default(""),
  yearsExperience: integer("years_experience").notNull().default(0),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"],
  }).notNull().default("pending"),
  serviceRadiusKm: real("service_radius_km").notNull().default(10),
  avgRating: real("avg_rating").notNull().default(0),
  completionRate: real("completion_rate").notNull().default(0),
  acceptanceRate: real("acceptance_rate").notNull().default(0),
  totalJobs: integer("total_jobs").notNull().default(0),
  reputationScore: real("reputation_score").notNull().default(0),
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const providerServicesTable = pgTable("provider_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").notNull().references(() => providerProfilesTable.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categoriesTable.id),
  basePrice: real("base_price").notNull().default(50),
  priceType: text("price_type", { enum: ["hourly", "fixed"] }).notNull().default("hourly"),
  isActive: boolean("is_active").notNull().default(true),
});

export const providerAvailabilityTable = pgTable("provider_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").notNull().references(() => providerProfilesTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull().default("09:00"),
  endTime: text("end_time").notNull().default("18:00"),
  isAvailable: boolean("is_available").notNull().default(true),
});

export const insertProviderProfileSchema = createInsertSchema(providerProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;
export type ProviderProfile = typeof providerProfilesTable.$inferSelect;
export type ProviderService = typeof providerServicesTable.$inferSelect;

import {
  pgTable,
  text,
  real,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const serviceRequestsTable = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  consumerId: uuid("consumer_id").notNull().references(() => usersTable.id),
  categoryId: uuid("category_id").notNull().references(() => categoriesTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  urgency: text("urgency", { enum: ["low", "medium", "high", "emergency"] }).notNull().default("medium"),
  status: text("status", { enum: ["pending", "matched", "booked", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matchesTable = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull().references(() => serviceRequestsTable.id),
  providerId: uuid("provider_id").notNull(),
  score: real("score").notNull().default(0),
  scoreBreakdownJson: text("score_breakdown_json"),
  rank: real("rank").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequestsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequestsTable.$inferSelect;

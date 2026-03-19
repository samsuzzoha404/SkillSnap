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
import { serviceRequestsTable } from "./serviceRequests";
import { providerProfilesTable } from "./providers";

export const bookingsTable = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceRequestId: uuid("service_request_id").notNull().references(() => serviceRequestsTable.id),
  consumerId: uuid("consumer_id").notNull().references(() => usersTable.id),
  providerId: uuid("provider_id").notNull().references(() => providerProfilesTable.id),
  status: text("status", {
    enum: ["requested", "matched", "accepted", "on_the_way", "arrived", "in_progress", "completed", "cancelled"],
  }).notNull().default("requested"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  finalPrice: real("final_price"),
  paymentStatus: text("payment_status", { enum: ["pending", "paid", "refunded"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;

import { pgTable, text, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookingsTable.id),
  provider: text("provider").notNull().default("mock"),
  externalPaymentId: text("external_payment_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("MYR"),
  status: text("status", { enum: ["pending", "paid", "refunded", "failed"] }).notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;

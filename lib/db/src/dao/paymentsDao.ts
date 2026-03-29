import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";
import { createNotification } from "./notificationsDao";
import type { BookingDoc } from "./bookingsDao";
import { findBookingById, updateBookingPayment } from "./bookingsDao";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface PaymentDoc {
  _id: string;
  bookingId: string;
  provider: string;
  externalPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: Date | null;
  createdAt: Date;
}

export type Payment = Omit<PaymentDoc, "_id"> & { id: string };

export async function processMockPaymentAndUpdateBooking(input: {
  bookingId: string;
  amount: number;
  currency?: string;
}): Promise<{
  paymentId: string;
  status: "paid";
  amount: number;
  currency: string;
  message: string;
}> {
  const mockPaymentId = `SNAP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const currency = input.currency ?? "MYR";

  const paymentsColl = await getCollection<PaymentDoc>(collections.payments);
  const now = new Date();

  const paymentDoc: PaymentDoc = {
    _id: newId(),
    bookingId: input.bookingId,
    provider: "mock",
    externalPaymentId: mockPaymentId,
    amount: Number(input.amount),
    currency,
    status: "paid",
    paidAt: now,
    createdAt: now,
  };

  await paymentsColl.insertOne(paymentDoc);

  await updateBookingPayment({
    bookingId: input.bookingId,
    paymentStatus: "paid",
    finalPrice: Number(input.amount),
  });

  const booking = await findBookingById(input.bookingId);
  if (booking) {
    await createNotification({
      userId: booking.consumerId,
      type: "payment",
      title: "Payment Successful",
      body: `Payment of ${currency} ${Number(input.amount).toFixed(2)} has been processed successfully.`,
      isRead: false,
    });
  }

  return {
    paymentId: mockPaymentId,
    status: "paid",
    amount: Number(input.amount),
    currency,
    message: "Payment processed successfully",
  };
}

export async function sumPaidPaymentsAmount(): Promise<number> {
  const coll = await getCollection<PaymentDoc>(collections.payments);
  const paid = await coll.find({ status: "paid" }).toArray();
  return paid.reduce((s, p) => s + Number(p.amount), 0);
}

export async function listPaymentsByConsumerId(consumerId: string): Promise<Payment[]> {
  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const bookingDocs = await bookingsColl.find({ consumerId }).project({ _id: 1 }).toArray();
  const bookingIds = bookingDocs.map((b) => b._id);
  if (bookingIds.length === 0) return [];

  const paymentsColl = await getCollection<PaymentDoc>(collections.payments);
  const docs = await paymentsColl.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => mapMongoDoc(d) as Payment);
}


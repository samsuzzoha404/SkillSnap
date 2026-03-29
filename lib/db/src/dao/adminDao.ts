import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import type { UserDoc, User, UserRole } from "./usersDao";
import { findProviderProfilesByIds } from "./providerProfilesDao";
import type {
  ProviderProfileDoc,
  ProviderProfile,
  ProviderUserSummary,
} from "./providerProfilesDao";
import type { BookingDoc, Booking, BookingStatus } from "./bookingsDao";
import type { ServiceRequestDoc, ServiceRequest } from "./serviceRequestsDao";
import type { CategoryDoc, Category } from "./categoriesDao";
import type { PaymentDoc, Payment } from "./paymentsDao";
import type { ProviderServiceDoc } from "./providerServicesDao";

/** Mean of non-zero provider avgRating values (platform overview). */
export async function avgPlatformProviderRating(): Promise<number> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const docs = await coll.find({ avgRating: { $gt: 0 } }).project({ avgRating: 1 }).toArray();
  if (docs.length === 0) return 0;
  const sum = docs.reduce((s, d) => s + Number((d as any).avgRating), 0);
  return Math.round((sum / docs.length) * 10) / 10;
}

export type MonthPoint = { month: string; bookings: number; revenue: number };

/** Bookings count by created month; revenue from paid payments by paidAt month (last `months`). */
export async function bookingsAndRevenueByMonth(months: number): Promise<MonthPoint[]> {
  const m = Math.min(Math.max(months, 1), 24);
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - (m - 1));
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const paymentsColl = await getCollection<PaymentDoc>(collections.payments);

  const bookings = await bookingsColl.find({ createdAt: { $gte: start } }).project({ createdAt: 1 }).toArray();
  const payments = await paymentsColl
    .find({ status: "paid", paidAt: { $ne: null, $gte: start } as any })
    .project({ amount: 1, paidAt: 1 })
    .toArray();

  const monthKeys: string[] = [];
  for (let i = 0; i < m; i++) {
    const d = new Date(start);
    d.setUTCMonth(start.getUTCMonth() + i);
    monthKeys.push(d.toISOString().slice(0, 7));
  }

  const bookingCount = new Map<string, number>();
  const revenueSum = new Map<string, number>();
  for (const k of monthKeys) {
    bookingCount.set(k, 0);
    revenueSum.set(k, 0);
  }

  for (const b of bookings) {
    const key = (b as any).createdAt ? new Date((b as any).createdAt).toISOString().slice(0, 7) : "";
    if (bookingCount.has(key)) bookingCount.set(key, (bookingCount.get(key) || 0) + 1);
  }
  for (const p of payments) {
    const paidAt = (p as any).paidAt as Date | null;
    if (!paidAt) continue;
    const key = new Date(paidAt).toISOString().slice(0, 7);
    if (!revenueSum.has(key)) continue;
    revenueSum.set(key, (revenueSum.get(key) || 0) + Number((p as any).amount));
  }

  return monthKeys.map((month) => ({
    month,
    bookings: bookingCount.get(month) || 0,
    revenue: Math.round((revenueSum.get(month) || 0) * 100) / 100,
  }));
}

export type CategoryStatRow = {
  categoryId: string;
  name: string;
  providerCount: number;
  bookingCount: number;
  avgProviderRating: number;
};

export async function listCategoryStats(): Promise<CategoryStatRow[]> {
  const categoriesColl = await getCollection<CategoryDoc>(collections.categories);
  const servicesColl = await getCollection<ProviderServiceDoc>(collections.provider_services);
  const requestsColl = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const profilesColl = await getCollection<ProviderProfileDoc>(collections.provider_profiles);

  const categories = await categoriesColl.find({}).toArray();
  const result: CategoryStatRow[] = [];

  for (const c of categories) {
    const id = String((c as any)._id);
    const name = (c as any).name as string;

    const services = await servicesColl.find({ categoryId: id, isActive: true }).toArray();
    const providerIds = [...new Set(services.map((s) => s.providerId))];

    const requests = await requestsColl.find({ categoryId: id }).project({ _id: 1 }).toArray();
    const requestIds = requests.map((r) => String((r as any)._id));
    let bookingCount = 0;
    if (requestIds.length > 0) {
      bookingCount = await bookingsColl.countDocuments({
        serviceRequestId: { $in: requestIds },
      });
    }

    let avgRating = 0;
    if (providerIds.length > 0) {
      const profs = await findProviderProfilesByIds(providerIds);
      const ratings = profs.map((p) => p.avgRating || 0).filter((x) => x > 0);
      avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    }

    result.push({
      categoryId: id,
      name,
      providerCount: providerIds.length,
      bookingCount,
      avgProviderRating: Math.round(avgRating * 10) / 10,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listUsersPaginated(options: {
  limit: number;
  offset: number;
  role?: UserRole;
}): Promise<{ items: Array<Omit<UserDoc, "passwordHash"> & { id: string }>; total: number }> {
  const coll = await getCollection<UserDoc>(collections.users);
  const query: Record<string, unknown> = {};
  if (options.role) query.role = options.role;

  const total = await coll.countDocuments(query);
  const docs = await coll
    .find(query)
    .sort({ createdAt: -1 })
    .skip(options.offset)
    .limit(options.limit)
    .project({ passwordHash: 0 })
    .toArray();

  const items = docs.map((d) => {
    const u = mapMongoDoc(d as { _id: unknown }) as User;
    const { passwordHash: _, ...rest } = u as any;
    return rest as Omit<UserDoc, "passwordHash"> & { id: string };
  });
  return { items, total };
}

export type AdminProviderRow = {
  provider: ProviderProfile;
  user: ProviderUserSummary;
};

export async function listAllProviderProfilesWithUser(options: {
  limit: number;
  offset: number;
  verificationStatus?: import("./providerProfilesDao").VerificationStatus;
}): Promise<{ items: AdminProviderRow[]; total: number }> {
  const profilesColl = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const query: Record<string, unknown> = {};
  if (options.verificationStatus) query.verificationStatus = options.verificationStatus;

  const total = await profilesColl.countDocuments(query);
  const profiles = await profilesColl
    .find(query)
    .sort({ createdAt: -1 })
    .skip(options.offset)
    .limit(options.limit)
    .toArray();

  const userIds = profiles.map((p) => p.userId);
  const users =
    userIds.length === 0
      ? []
      : await usersColl
          .find({
            $expr: { $in: [{ $toString: "$_id" }, userIds] },
          } as any)
          .project({ fullName: 1, avatarUrl: 1, email: 1, phone: 1 })
          .toArray();
  const userById = new Map<string, UserDoc>();
  for (const u of users) userById.set(String((u as any)._id), u as UserDoc);

  const items: AdminProviderRow[] = profiles
    .map((p) => {
      const provider = mapMongoDoc(p) as ProviderProfile;
      const userDoc = userById.get(p.userId);
      if (!userDoc) return null;
      return {
        provider,
        user: {
          fullName: userDoc.fullName,
          avatarUrl: userDoc.avatarUrl,
          email: userDoc.email,
          phone: userDoc.phone,
        },
      };
    })
    .filter(Boolean) as AdminProviderRow[];

  return { items, total };
}

export type AdminBookingRow = {
  booking: Booking;
  serviceRequest: ServiceRequest;
  category: Category;
  consumerName: string;
  providerBusinessName: string;
};

export async function listAllBookingsAdmin(options: {
  limit: number;
  offset: number;
  status?: BookingStatus;
}): Promise<{ items: AdminBookingRow[]; total: number }> {
  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const requestColl = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const categoriesColl = await getCollection<CategoryDoc>(collections.categories);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const query: Record<string, unknown> = {};
  if (options.status) query.status = options.status;

  const total = await bookingsColl.countDocuments(query);
  const bookingDocs = await bookingsColl.find(query).sort({ createdAt: -1 }).skip(options.offset).limit(options.limit).toArray();

  const requests = await requestColl
    .find({ _id: { $in: [...new Set(bookingDocs.map((b) => b.serviceRequestId))] } } as any)
    .toArray();
  const requestById = new Map<string, ServiceRequest>(requests.map((r) => [r._id, mapMongoDoc(r) as ServiceRequest]));

  const categoryIds = [...new Set(requests.map((r) => r.categoryId))];
  const categories = await categoriesColl.find({ _id: { $in: categoryIds } } as any).toArray();
  const categoryById = new Map<string, Category>(categories.map((c) => [c._id, mapMongoDoc(c) as Category]));

  const providerIds = [...new Set(bookingDocs.map((b) => b.providerId))];
  const providers = await findProviderProfilesByIds(providerIds);
  const providerById = new Map<string, ProviderProfile>(providers.map((p) => [p.id, p]));

  const consumerIds = [...new Set(bookingDocs.map((b) => b.consumerId))];
  const users = await usersColl.find({ _id: { $in: consumerIds } } as any).project({ fullName: 1 }).toArray();
  const consumerNameById = new Map<string, string>();
  for (const u of users) consumerNameById.set(String((u as any)._id), (u as any).fullName ?? "");

  const items: AdminBookingRow[] = bookingDocs
    .map((bd) => {
      const booking = mapMongoDoc(bd) as Booking;
      const sr = requestById.get(booking.serviceRequestId);
      if (!sr) return null;
      const cat = categoryById.get(sr.categoryId);
      if (!cat) return null;
      const pp = providerById.get(booking.providerId);
      return {
        booking,
        serviceRequest: sr,
        category: cat,
        consumerName: consumerNameById.get(booking.consumerId) ?? "—",
        providerBusinessName: pp?.businessName ?? "—",
      };
    })
    .filter(Boolean) as AdminBookingRow[];

  return { items, total };
}

export type AdminPaymentRow = Payment & {
  bookingId: string;
  consumerName: string | null;
  providerBusinessName: string | null;
};

export async function listPaymentsAdmin(options: {
  limit: number;
  offset: number;
}): Promise<{ items: AdminPaymentRow[]; total: number }> {
  const paymentsColl = await getCollection<PaymentDoc>(collections.payments);
  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const total = await paymentsColl.countDocuments({});
  const payDocs = await paymentsColl.find({}).sort({ createdAt: -1 }).skip(options.offset).limit(options.limit).toArray();

  const bookingIds = [...new Set(payDocs.map((p) => p.bookingId))];
  const bookings = await bookingsColl.find({ _id: { $in: bookingIds } } as any).toArray();
  const bookingById = new Map<string, Booking>(bookings.map((b) => [b._id, mapMongoDoc(b) as Booking]));

  const providerIds = [...new Set(bookings.map((b) => b.providerId))];
  const consumers = [...new Set(bookings.map((b) => b.consumerId))];
  const [profs, users] = await Promise.all([
    findProviderProfilesByIds(providerIds),
    usersColl.find({ _id: { $in: consumers } } as any).project({ fullName: 1 }).toArray(),
  ]);
  const provName = new Map<string, string>();
  for (const p of profs) provName.set(p.id, p.businessName ?? "");
  const consName = new Map<string, string>();
  for (const u of users) consName.set(String((u as any)._id), (u as any).fullName ?? "");

  const items: AdminPaymentRow[] = payDocs.map((doc) => {
    const p = mapMongoDoc(doc) as Payment;
    const b = bookingById.get(p.bookingId);
    return {
      ...p,
      bookingId: p.bookingId,
      consumerName: b ? consName.get(b.consumerId) ?? null : null,
      providerBusinessName: b ? provName.get(b.providerId) ?? null : null,
    };
  });

  return { items, total };
}

/** Completed bookings / total bookings (percent). */
export async function platformCompletionRate(): Promise<number> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  const total = await coll.countDocuments({});
  if (total === 0) return 0;
  const completed = await coll.countDocuments({ status: "completed" });
  return Math.round((completed / total) * 1000) / 10;
}

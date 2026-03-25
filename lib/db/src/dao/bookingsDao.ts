import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";
import type { CategoryDoc, Category } from "./categoriesDao";
import type { ProviderProfileDoc, ProviderProfile } from "./providerProfilesDao";
import type { ProviderServiceDoc, ProviderService } from "./providerServicesDao";
import type { ServiceRequestDoc, ServiceRequest } from "./serviceRequestsDao";
import type { UserDoc, User } from "./usersDao";

export type BookingStatus =
  | "requested"
  | "matched"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "refunded";

export interface BookingDoc {
  _id: string;
  serviceRequestId: string;
  consumerId: string;
  providerId: string;
  status: BookingStatus;
  scheduledAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  finalPrice: number | null;
  paymentStatus: PaymentStatus;
  createdAt: Date;
}

export type Booking = Omit<BookingDoc, "_id"> & { id: string };

export type ProviderDetail = {
  provider: ProviderProfile;
  avatarUrl: string | null;
  categories: Category[];
  basePrice: number;
  priceType: "hourly" | "fixed";
};

export type BookingDetails = {
  booking: Booking;
  serviceRequest: ServiceRequest;
  category: Category;
  provider: ProviderDetail;
  review: null | {
    id: string;
    bookingId: string;
    consumerId: string;
    providerId: string;
    rating: number;
    comment: string;
    consumerName: string;
    createdAt: Date;
  };
};

export type ProviderBookingJoin = {
  booking: Booking;
  request: ServiceRequest;
  consumer: Pick<User, "fullName" | "phone" | "avatarUrl">;
  category: Category;
};

export async function createBooking(input: {
  id?: string;
  serviceRequestId: string;
  consumerId: string;
  providerId: string;
  status: BookingStatus;
  scheduledAt: Date;
  paymentStatus: PaymentStatus;
}): Promise<Booking> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  const now = new Date();
  const id = input.id ?? newId();

  const doc: BookingDoc = {
    _id: id,
    serviceRequestId: input.serviceRequestId,
    consumerId: input.consumerId,
    providerId: input.providerId,
    status: input.status,
    scheduledAt: input.scheduledAt,
    acceptedAt: input.status === "accepted" ? now : null,
    startedAt: input.status === "in_progress" ? now : null,
    completedAt: input.status === "completed" ? now : null,
    cancelledAt: input.status === "cancelled" ? now : null,
    finalPrice: input.status === "completed" ? 150 : null,
    paymentStatus: input.paymentStatus,
    createdAt: now,
  };

  await coll.insertOne(doc);
  return mapMongoDoc(doc) as Booking;
}

export async function listBookingsByConsumerId(consumerId: string): Promise<Booking[]> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  const docs = await coll.find({ consumerId }).toArray();
  return docs.map((d) => mapMongoDoc(d) as Booking);
}

export async function listBookingsByProviderId(providerId: string): Promise<Booking[]> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  const docs = await coll.find({ providerId }).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => mapMongoDoc(d) as Booking);
}

export async function findBookingById(id: string): Promise<Booking | null> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  const doc = await coll.findOne({ _id: id });
  return doc ? (mapMongoDoc(doc) as Booking) : null;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | null> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  const now = new Date();

  const updates: Partial<BookingDoc> & Record<string, any> = { status };
  if (status === "accepted") updates.acceptedAt = now;
  else if (status === "in_progress") updates.startedAt = now;
  else if (status === "completed") {
    updates.completedAt = now;
    updates.finalPrice = 150;
  } else if (status === "cancelled") updates.cancelledAt = now;

  await coll.updateOne({ _id: id }, { $set: updates });
  const updatedDoc = await coll.findOne({ _id: id });
  return updatedDoc ? (mapMongoDoc(updatedDoc) as Booking) : null;
}

export async function updateBookingPayment(input: {
  bookingId: string;
  paymentStatus: PaymentStatus;
  finalPrice: number | null;
}): Promise<void> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  await coll.updateOne(
    { _id: input.bookingId },
    { $set: { paymentStatus: input.paymentStatus, finalPrice: input.finalPrice } },
  );
}

export async function listProviderBookingsJoin(
  providerId: string,
  options?: { status?: BookingStatus },
): Promise<ProviderBookingJoin[]> {
  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const requestColl = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const categoriesColl = await getCollection<CategoryDoc>(collections.categories);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const query: any = { providerId };
  if (options?.status) query.status = options.status;

  const bookings = await bookingsColl.find(query).sort({ createdAt: -1 }).toArray();
  const requestIds = [...new Set(bookings.map((b) => b.serviceRequestId))];
  const serviceRequests = await requestColl
    .find({ _id: { $in: requestIds } } as any)
    .toArray();
  const requestById = new Map<string, ServiceRequest>(serviceRequests.map((r) => [r._id, mapMongoDoc(r) as ServiceRequest]));

  const categoryIds = [...new Set(serviceRequests.map((r) => r.categoryId))];
  const categories = await categoriesColl
    .find({ _id: { $in: categoryIds } } as any)
    .toArray();
  const categoryById = new Map<string, Category>(categories.map((c) => [c._id, mapMongoDoc(c) as Category]));

  const consumerIds = [...new Set(bookings.map((b) => b.consumerId))];
  const users = await usersColl
    .find({ _id: { $in: consumerIds } } as any)
    .project({ fullName: 1, phone: 1, avatarUrl: 1 })
    .toArray();
  const userById = new Map<string, Pick<User, "fullName" | "phone" | "avatarUrl">>();
  for (const u of users) {
    userById.set(String((u as any)._id), {
      fullName: (u as any).fullName,
      phone: (u as any).phone ?? null,
      avatarUrl: (u as any).avatarUrl ?? null,
    });
  }

  return bookings
    .map((b) => {
      const booking = mapMongoDoc(b) as Booking;
      const request = requestById.get(booking.serviceRequestId);
      if (!request) return null;
      const category = categoryById.get(request.categoryId);
      if (!category) return null;
      const consumer = userById.get(booking.consumerId);
      if (!consumer) return null;

      return { booking, request, consumer, category } as ProviderBookingJoin;
    })
    .filter(Boolean) as ProviderBookingJoin[];
}

export async function countBookings(): Promise<number> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  return coll.countDocuments();
}

export async function countBookingsByProviderId(providerId: string): Promise<number> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  return coll.countDocuments({ providerId });
}

export async function countBookingsByStatus(status: BookingStatus): Promise<number> {
  const coll = await getCollection<BookingDoc>(collections.bookings);
  return coll.countDocuments({ status });
}

export async function getBookingDetails(id: string): Promise<BookingDetails | null> {
  const bookingsColl = await getCollection<BookingDoc>(collections.bookings);
  const requestColl = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const categoriesColl = await getCollection<CategoryDoc>(collections.categories);
  const providerProfilesColl = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const providerServicesColl = await getCollection<ProviderServiceDoc>(collections.provider_services);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const bookingDoc = await bookingsColl.findOne({ _id: id });
  if (!bookingDoc) return null;
  const booking = mapMongoDoc(bookingDoc) as Booking;

  const requestDoc = await requestColl.findOne({ _id: booking.serviceRequestId });
  if (!requestDoc) throw new Error("Service request missing for booking");
  const serviceRequest = mapMongoDoc(requestDoc) as ServiceRequest;

  const categoryDoc = await categoriesColl.findOne({ _id: serviceRequest.categoryId });
  if (!categoryDoc) throw new Error("Category missing for service request");
  const category = mapMongoDoc(categoryDoc) as Category;

  const providerProfileDoc = await providerProfilesColl.findOne({ _id: booking.providerId });
  if (!providerProfileDoc) throw new Error("Provider profile missing for booking");
  const provider = mapMongoDoc(providerProfileDoc) as ProviderProfile;

  const providerUserDoc = await usersColl.findOne({ _id: provider.userId });
  if (!providerUserDoc) throw new Error("Provider user missing for booking");
  const providerUser = mapMongoDoc(providerUserDoc) as User;

  const services = await providerServicesColl.find({ providerId: provider.id, isActive: true }).toArray();
  const serviceCategoryIds = [...new Set(services.map((s) => s.categoryId))];
  const serviceCategoriesDocs = await categoriesColl
    .find({ _id: { $in: serviceCategoryIds } } as any)
    .toArray();
  const categoryById = new Map<string, Category>(serviceCategoriesDocs.map((c) => [String((c as any)._id), mapMongoDoc(c) as Category]));

  const mappedServices = services
    .map((s) => ({
      service: mapMongoDoc(s) as ProviderService,
      category: categoryById.get(s.categoryId),
    }))
    .filter((x) => x.category) as Array<{ service: ProviderService; category: Category }>;

  const categories = mappedServices.map((x) => x.category);
  const primaryService = mappedServices[0]?.service;

  const providerDetail: ProviderDetail = {
    provider,
    avatarUrl: providerUser.avatarUrl,
    categories,
    basePrice: primaryService?.basePrice ?? 80,
    priceType: (primaryService?.priceType ?? "hourly") as "hourly" | "fixed",
  };

  // Reviews (optional)
  const reviewsColl = await getCollection<any>(collections.reviews);
  const reviewDoc = await reviewsColl.findOne({ bookingId: booking.id });
  let review: BookingDetails["review"] = null;
  if (reviewDoc) {
    const consumerId = reviewDoc.consumerId as string;
    const consumer = await usersColl.findOne({ _id: consumerId });
    if (!consumer) throw new Error("Review consumer missing");
    review = {
      id: String(reviewDoc._id),
      bookingId: reviewDoc.bookingId,
      consumerId,
      providerId: reviewDoc.providerId,
      rating: Number(reviewDoc.rating),
      comment: String(reviewDoc.comment),
      consumerName: (consumer as any).fullName ?? "Anonymous",
      createdAt: reviewDoc.createdAt ? new Date(reviewDoc.createdAt) : new Date(),
    };
  }

  return {
    booking,
    serviceRequest,
    category,
    provider: providerDetail,
    review,
  };
}


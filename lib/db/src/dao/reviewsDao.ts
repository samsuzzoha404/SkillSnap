import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";
import type { UserDoc, User } from "./usersDao";
import type { ProviderProfileDoc } from "./providerProfilesDao";
import { updateProviderProfile } from "./providerProfilesDao";

export interface ReviewDoc {
  _id: string;
  bookingId: string;
  consumerId: string;
  providerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export type Review = Omit<ReviewDoc, "_id"> & { id: string };

export type ReviewWithConsumer = Review & { consumerName: string };

export async function findReviewByBookingId(bookingId: string): Promise<Review | null> {
  const coll = await getCollection<ReviewDoc>(collections.reviews);
  const doc = await coll.findOne({ bookingId });
  return doc ? (mapMongoDoc(doc) as Review) : null;
}

export async function createReview(input: {
  id?: string;
  bookingId: string;
  consumerId: string;
  providerId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const coll = await getCollection<ReviewDoc>(collections.reviews);
  const now = new Date();
  const id = input.id ?? newId();

  const doc: ReviewDoc = {
    _id: id,
    bookingId: input.bookingId,
    consumerId: input.consumerId,
    providerId: input.providerId,
    rating: input.rating,
    comment: input.comment,
    createdAt: now,
  };

  await coll.insertOne(doc);
  return mapMongoDoc(doc) as Review;
}

export async function computeAverageRatingForProvider(providerId: string): Promise<number> {
  const coll = await getCollection<ReviewDoc>(collections.reviews);

  const docs = await coll.find({ providerId }).toArray();
  if (docs.length === 0) return 0;
  const sum = docs.reduce((s, d) => s + Number(d.rating), 0);
  return sum / docs.length;
}

export async function recalculateAndUpdateProviderAvgRating(providerId: string): Promise<number> {
  const avg = await computeAverageRatingForProvider(providerId);
  await updateProviderProfile(providerId, { avgRating: avg } as any);
  return avg;
}

export async function listReviewsByConsumerId(consumerId: string): Promise<ReviewWithConsumer[]> {
  const reviewsColl = await getCollection<ReviewDoc>(collections.reviews);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const reviews = await reviewsColl.find({ consumerId }).sort({ createdAt: -1 }).toArray();
  const consumer = await usersColl.findOne({ _id: consumerId } as any);
  const consumerName = consumer ? (consumer as any).fullName ?? "Anonymous" : "Anonymous";

  return reviews.map((r) => {
    const review = mapMongoDoc(r) as Review;
    return { ...review, consumerName };
  });
}

export async function listReviewsByProviderIdWithConsumerName(providerId: string): Promise<ReviewWithConsumer[]> {
  const reviewsColl = await getCollection<ReviewDoc>(collections.reviews);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const reviews = await reviewsColl.find({ providerId }).toArray();
  const consumerIds = [...new Set(reviews.map((r) => r.consumerId))];
  const users = await usersColl
    .find({ _id: { $in: consumerIds } } as any)
    .project({ fullName: 1 })
    .toArray();
  const userById = new Map<string, Pick<User, "fullName">>();
  for (const u of users) {
    userById.set(String((u as any)._id), { fullName: (u as any).fullName });
  }

  return reviews.map((r) => {
    const review = mapMongoDoc(r) as Review;
    const consumer = userById.get(review.consumerId);
    return { ...review, consumerName: consumer?.fullName ?? "Anonymous" };
  });
}


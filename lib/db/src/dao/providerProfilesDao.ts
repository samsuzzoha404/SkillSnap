import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";
import type { UserDoc } from "./usersDao";

export type VerificationStatus = "pending" | "verified" | "rejected";

export interface ProviderProfileDoc {
  _id: string;
  userId: string;
  businessName: string;
  bio: string;
  yearsExperience: number;
  verificationStatus: VerificationStatus;
  serviceRadiusKm: number;
  avgRating: number;
  completionRate: number;
  acceptanceRate: number;
  totalJobs: number;
  reputationScore: number;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProviderProfile = Omit<ProviderProfileDoc, "_id"> & { id: string };

export interface ProviderUserSummary {
  fullName: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
}

export type ProviderProfileWithUser = {
  provider: ProviderProfile;
  user: ProviderUserSummary;
};

export async function findProviderProfileByUserId(
  userId: string,
): Promise<ProviderProfile | null> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const doc = await coll.findOne({ userId });
  return doc ? (mapMongoDoc(doc) as ProviderProfile) : null;
}

export async function findProviderProfileById(id: string): Promise<ProviderProfile | null> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const doc = await coll.findOne({ _id: id });
  return doc ? (mapMongoDoc(doc) as ProviderProfile) : null;
}

export async function createProviderProfile(input: {
  id?: string;
  userId: string;
  businessName: string;
  bio?: string;
  yearsExperience?: number;
  verificationStatus?: VerificationStatus;
  serviceRadiusKm?: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<ProviderProfile> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const now = new Date();
  const id = input.id ?? newId();

  const doc: ProviderProfileDoc = {
    _id: id,
    userId: input.userId,
    businessName: input.businessName,
    bio: input.bio ?? "",
    yearsExperience: input.yearsExperience ?? 0,
    verificationStatus: input.verificationStatus ?? "pending",
    serviceRadiusKm: input.serviceRadiusKm ?? 15,
    avgRating: 0,
    completionRate: 0,
    acceptanceRate: 0,
    totalJobs: 0,
    reputationScore: 0,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    address: input.address ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await coll.insertOne(doc);
  return mapMongoDoc(doc) as ProviderProfile;
}

export async function updateProviderProfile(
  id: string,
  updates: Partial<Omit<ProviderProfileDoc, "_id" | "createdAt" | "updatedAt">>,
): Promise<ProviderProfile | null> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const now = new Date();
  await coll.updateOne(
    { _id: id },
    { $set: { ...(updates as any), updatedAt: now } },
  );

  const updatedDoc = await coll.findOne({ _id: id });
  return updatedDoc ? (mapMongoDoc(updatedDoc) as ProviderProfile) : null;
}

export async function countProviders(): Promise<number> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  return coll.countDocuments();
}

export async function countProvidersByVerificationStatus(status: VerificationStatus): Promise<number> {
  const coll = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  return coll.countDocuments({ verificationStatus: status });
}

function toProviderUserSummary(user: Pick<UserDoc, "fullName" | "avatarUrl" | "email" | "phone">): ProviderUserSummary {
  return {
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    email: user.email,
    phone: user.phone,
  };
}

export async function listVerifiedProviderProfilesWithUserSummary(options?: {
  limit?: number;
  offset?: number;
}): Promise<ProviderProfileWithUser[]> {
  const limit = options?.limit;
  const offset = options?.offset ?? 0;

  const profilesColl = await getCollection<ProviderProfileDoc>(collections.provider_profiles);
  const usersColl = await getCollection<UserDoc>(collections.users);

  const cursor = profilesColl.find({ verificationStatus: "verified" }).skip(offset);
  const profiles = limit != null ? await cursor.limit(limit).toArray() : await cursor.toArray();

  const userIds = profiles.map((p) => p.userId);
  const users = await usersColl
    .find({ _id: { $in: userIds } } as any)
    .project({ fullName: 1, avatarUrl: 1, email: 1, phone: 1 })
    .toArray();

  const usersById = new Map<string, UserDoc>();
  for (const u of users) usersById.set(String((u as any)._id), u as any as UserDoc);

  return profiles
    .map((p) => {
      const userDoc = usersById.get(p.userId);
      if (!userDoc) return null;
      return {
        provider: mapMongoDoc(p) as ProviderProfile,
        user: toProviderUserSummary(userDoc),
      };
    })
    .filter(Boolean) as ProviderProfileWithUser[];
}


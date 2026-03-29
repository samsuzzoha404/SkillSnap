import { ObjectId, UUID } from "mongodb";
import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Match users._id for string UUID, BSON UUID, or ObjectId (legacy). */
function userIdFilter(id: string): Record<string, unknown> {
  const or: Array<Record<string, unknown>> = [{ _id: id }];
  if (id.length === 24 && /^[a-f0-9]{24}$/i.test(id)) {
    try {
      or.push({ _id: new ObjectId(id) });
    } catch {
      /* ignore */
    }
  }
  if (UUID_REGEX.test(id)) {
    try {
      or.push({ _id: new UUID(id) });
    } catch {
      /* ignore */
    }
  }
  if (or.length === 1) return or[0]!;
  return { $or: or };
}

export type UserRole = "consumer" | "provider" | "admin";

export interface UserDoc {
  _id: string;
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type User = Omit<UserDoc, "_id"> & { id: string };

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getCollection<UserDoc>(collections.users);
  const norm = normalizeEmail(email);
  let doc = await users.findOne({ email: norm });
  if (!doc && norm) {
    doc = await users.findOne({
      email: { $regex: new RegExp(`^${norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
  }
  return doc ? (mapMongoDoc(doc) as User) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await getCollection<UserDoc>(collections.users);
  let doc = await users.findOne({
    $expr: { $eq: [{ $toString: "$_id" }, id] },
  } as any);
  if (!doc) {
    doc = await users.findOne(userIdFilter(id));
  }
  return doc ? (mapMongoDoc(doc) as User) : null;
}

export async function createUser(input: {
  id?: string;
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  role?: UserRole;
  avatarUrl?: string | null;
  isActive?: boolean;
}): Promise<User> {
  const users = await getCollection<UserDoc>(collections.users);
  const now = new Date();
  const id = input.id ?? newId();

  const doc: UserDoc = {
    _id: id,
    fullName: input.fullName,
    email: normalizeEmail(input.email),
    phone: input.phone ?? null,
    passwordHash: input.passwordHash,
    avatarUrl: input.avatarUrl ?? null,
    role: input.role ?? "consumer",
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await users.insertOne(doc);
  return mapMongoDoc(doc) as User;
}

export async function countUsers(): Promise<number> {
  const users = await getCollection<UserDoc>(collections.users);
  return users.countDocuments();
}


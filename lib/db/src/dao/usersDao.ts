import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";

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
  const doc = await users.findOne({ email });
  return doc ? (mapMongoDoc(doc) as User) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await getCollection<UserDoc>(collections.users);
  const doc = await users.findOne({ _id: id });
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
    email: input.email,
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


import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";
import type { CategoryDoc, Category } from "./categoriesDao";
import { type UserRole } from "./usersDao";

export type ServiceRequestUrgency = "low" | "medium" | "high" | "emergency";
export type ServiceRequestStatus = "pending" | "matched" | "booked" | "cancelled";

export interface ServiceRequestDoc {
  _id: string;
  consumerId: string;
  categoryId: string;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  preferredDate: string;
  preferredTime: string;
  urgency: ServiceRequestUrgency;
  status: ServiceRequestStatus;
  createdAt: Date;
}

export type ServiceRequest = Omit<ServiceRequestDoc, "_id"> & { id: string };

export async function createServiceRequest(input: {
  id?: string;
  consumerId: string;
  categoryId: string;
  title: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  preferredDate: string;
  preferredTime: string;
  urgency?: ServiceRequestUrgency;
}): Promise<ServiceRequest> {
  const coll = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const id = input.id ?? newId();
  const now = new Date();

  const doc: ServiceRequestDoc = {
    _id: id,
    consumerId: input.consumerId,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    address: input.address,
    latitude: input.latitude ?? 3.1390,
    longitude: input.longitude ?? 101.6869,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    urgency: input.urgency ?? "medium",
    status: "pending",
    createdAt: now,
  };

  await coll.insertOne(doc);
  return mapMongoDoc(doc) as ServiceRequest;
}

export async function updateServiceRequestStatus(id: string, status: ServiceRequestStatus): Promise<void> {
  const coll = await getCollection<ServiceRequestDoc>(collections.service_requests);
  await coll.updateOne({ _id: id }, { $set: { status } });
}

export async function findServiceRequestById(id: string): Promise<ServiceRequest | null> {
  const coll = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const doc = await coll.findOne({ _id: id });
  return doc ? (mapMongoDoc(doc) as ServiceRequest) : null;
}

export async function listRequestsByConsumerIdWithCategory(consumerId: string): Promise<
  Array<{ request: ServiceRequest; category: Category }>
> {
  const reqColl = await getCollection<ServiceRequestDoc>(collections.service_requests);
  const catColl = await getCollection<CategoryDoc>(collections.categories);

  const requests = await reqColl.find({ consumerId }).toArray();
  const categoryIds = [...new Set(requests.map((r) => r.categoryId))];
  const categories = await catColl.find({ _id: { $in: categoryIds } } as any).toArray();
  const categoriesById = new Map<string, Category>();
  for (const c of categories) categoriesById.set(String((c as any)._id), { ...(mapMongoDoc(c) as Category) });

  return requests.map((r) => ({
    request: mapMongoDoc(r) as ServiceRequest,
    category: categoriesById.get(r.categoryId)!,
  }));
}

export async function findRequestByIdWithCategory(id: string): Promise<{
  request: ServiceRequest;
  category: Category;
} | null> {
  const req = await findServiceRequestById(id);
  if (!req) return null;
  const catColl = await getCollection<CategoryDoc>(collections.categories);
  const cat = await catColl.findOne({ _id: req.categoryId });
  if (!cat) throw new Error("Category missing for service request");
  return { request: req, category: mapMongoDoc(cat) as Category };
}


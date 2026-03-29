import { MongoClient, ServerApiVersion } from "mongodb";
import type { Collection, Db } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "skillsnap";

if (!mongoUri) {
  throw new Error("MONGODB_URI must be set. Did you forget to provision MongoDB Atlas?");
}

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

let mongoDbPromise: Promise<Db> | null = null;

export const collections = {
  users: "users",
  categories: "categories",
  provider_profiles: "provider_profiles",
  provider_services: "provider_services",
  provider_availability: "provider_availability",
  service_requests: "service_requests",
  bookings: "bookings",
  reviews: "reviews",
  notifications: "notifications",
  payments: "payments",
  matches: "matches",
} as const;

export async function getMongoClient(): Promise<MongoClient> {
  if (mongoClient) return mongoClient;

  mongoClient = new MongoClient(mongoUri as string, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    // Fail fast instead of hanging when Atlas/network is unreachable (common dev pain).
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
  });

  await mongoClient.connect();
  return mongoClient;
}

export async function getMongoDb(): Promise<Db> {
  if (mongoDb) return mongoDb;
  if (!mongoDbPromise) {
    mongoDbPromise = (async () => {
      const client = await getMongoClient();
      mongoDb = client.db(dbName);
      return mongoDb!;
    })();
  }
  return mongoDbPromise;
}

export async function getCollection<TSchema = any>(
  collectionName: keyof typeof collections | string,
): Promise<Collection<any>> {
  const db = await getMongoDb();
  return db.collection(collectionName as string);
}


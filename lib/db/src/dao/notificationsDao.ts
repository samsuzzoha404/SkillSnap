import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";

export interface NotificationDoc {
  _id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}

export type Notification = Omit<NotificationDoc, "_id"> & { id: string };

export async function createNotification(input: {
  id?: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead?: boolean;
}): Promise<Notification> {
  const coll = await getCollection<NotificationDoc>(collections.notifications);
  const now = new Date();
  const id = input.id ?? newId();

  const doc: NotificationDoc = {
    _id: id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    isRead: input.isRead ?? false,
    createdAt: now,
  };

  await coll.insertOne(doc);
  return mapMongoDoc(doc) as Notification;
}

export async function listNotificationsByUserId(userId: string): Promise<Notification[]> {
  const coll = await getCollection<NotificationDoc>(collections.notifications);
  const docs = await coll.find({ userId }).sort({ createdAt: 1 }).toArray();
  return docs.map((d) => mapMongoDoc(d) as Notification);
}

export async function markNotificationAsRead(id: string): Promise<Notification | null> {
  const coll = await getCollection<NotificationDoc>(collections.notifications);
  await coll.updateOne({ _id: id }, { $set: { isRead: true } });
  const updatedDoc = await coll.findOne({ _id: id });
  return updatedDoc ? (mapMongoDoc(updatedDoc) as Notification) : null;
}


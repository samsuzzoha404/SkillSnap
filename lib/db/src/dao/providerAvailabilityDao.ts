import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";

export interface ProviderAvailabilityDoc {
  _id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export type ProviderAvailability = Omit<ProviderAvailabilityDoc, "_id"> & { id: string };

export async function listAvailabilityByProviderId(
  providerId: string,
): Promise<ProviderAvailability[]> {
  const coll = await getCollection<ProviderAvailabilityDoc>(collections.provider_availability);
  const docs = await coll.find({ providerId }).sort({ dayOfWeek: 1 }).toArray();
  return docs.map((d) => mapMongoDoc(d) as ProviderAvailability);
}

export async function upsertAvailabilitySlots(
  providerId: string,
  slots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>,
): Promise<void> {
  const coll = await getCollection<ProviderAvailabilityDoc>(collections.provider_availability);

  const dayOfWeekSet = [...new Set(slots.map((s) => s.dayOfWeek))];
  const existingDocs = await coll
    .find({ providerId, dayOfWeek: { $in: dayOfWeekSet } } as any)
    .toArray();
  const existingByDay = new Map<number, ProviderAvailabilityDoc>();
  for (const d of existingDocs) existingByDay.set(d.dayOfWeek, d);

  const now = new Date(); // not stored but can be used later
  void now;

  const inserts: ProviderAvailabilityDoc[] = [];
  const updates: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }> = [];

  for (const slot of slots) {
    const ex = existingByDay.get(slot.dayOfWeek);
    if (ex) {
      updates.push({
        id: ex._id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      });
    } else {
      inserts.push({
        _id: newId(),
        providerId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable,
      });
    }
  }

  const updatePromises = updates.map((u) =>
    coll.updateOne(
      { _id: u.id },
      { $set: { startTime: u.startTime, endTime: u.endTime, isAvailable: u.isAvailable } },
    ),
  );

  await Promise.all([...updatePromises, ...(inserts.length ? [coll.insertMany(inserts)] : [])]);
}


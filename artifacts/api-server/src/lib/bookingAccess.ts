import {
  findProviderProfileByUserId,
  findProviderProfileById,
  type Booking,
  type BookingStatus,
} from "@workspace/db";

const ALL_STATUSES: BookingStatus[] = [
  "requested",
  "matched",
  "accepted",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
];

export function parseBookingStatus(body: unknown): BookingStatus | null {
  if (typeof body !== "object" || body === null) return null;
  const s = (body as { status?: unknown }).status;
  if (typeof s !== "string") return null;
  return ALL_STATUSES.includes(s as BookingStatus) ? (s as BookingStatus) : null;
}

export async function bookingParty(
  booking: Booking,
  userId: string | undefined,
): Promise<"consumer" | "provider" | null> {
  if (!userId) return null;
  if (booking.consumerId === userId) return "consumer";
  const profile = await findProviderProfileByUserId(userId);
  if (profile?.id === booking.providerId) return "provider";
  return null;
}

/** Allowed next statuses from current, for consumer (cancel only). */
const CONSUMER_FROM: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ["cancelled"],
  matched: ["cancelled"],
};

/** Provider-driven workflow + cancel from inbox/active. */
const PROVIDER_FROM: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ["accepted", "cancelled"],
  matched: ["accepted", "cancelled"],
  accepted: ["on_the_way", "cancelled"],
  on_the_way: ["arrived", "cancelled"],
  arrived: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

export function isValidStatusTransition(
  current: BookingStatus,
  next: BookingStatus,
  party: "consumer" | "provider",
): boolean {
  if (current === "completed" || current === "cancelled") return false;
  if (party === "consumer") {
    const allowed = CONSUMER_FROM[current];
    return allowed?.includes(next) ?? false;
  }
  const allowed = PROVIDER_FROM[current];
  return allowed?.includes(next) ?? false;
}

export async function getProviderUserIdForBooking(booking: Booking): Promise<string | null> {
  const profile = await findProviderProfileById(booking.providerId);
  return profile?.userId ?? null;
}

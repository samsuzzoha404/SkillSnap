/**
 * Shared React Query options so consumer/provider screens stay fresh
 * while open (polling + reconnect). App foreground focus is wired in app/_layout.tsx.
 */

/** Default list/home polling while screen is mounted. */
export const LIVE_POLL_MS = 12_000;

/** Booking detail / match flows — slightly faster tick. */
export const LIVE_POLL_FAST_MS = 8_000;

export const liveListQueryOptions = {
  refetchInterval: LIVE_POLL_MS,
  refetchOnReconnect: true,
} as const;

export const liveFastQueryOptions = {
  refetchInterval: LIVE_POLL_FAST_MS,
  refetchOnReconnect: true,
} as const;

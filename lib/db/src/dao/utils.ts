export function mapMongoDoc<T extends { _id: unknown }>(doc: T): Omit<T, "_id"> & { id: string } {
  const { _id, ...rest } = doc as any;
  return { id: String(_id), ...(rest as any) };
}

export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return null;
}

export function coalesceNull<T>(value: T | undefined | null, fallback: T): T {
  return value == null ? fallback : value;
}


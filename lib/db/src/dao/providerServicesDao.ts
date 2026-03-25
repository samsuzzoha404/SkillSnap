import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";
import { newId } from "./id";
import type { CategoryDoc, Category } from "./categoriesDao";
import type { ProviderProfileDoc } from "./providerProfilesDao";

export type PriceType = "hourly" | "fixed";

export interface ProviderServiceDoc {
  _id: string;
  providerId: string;
  categoryId: string;
  basePrice: number;
  priceType: PriceType;
  isActive: boolean;
}

export type ProviderService = Omit<ProviderServiceDoc, "_id"> & { id: string };

export type ProviderServiceWithCategory = {
  service: ProviderService;
  category: Category;
};

export async function listServicesByProviderId(providerId: string): Promise<ProviderService[]> {
  const coll = await getCollection<ProviderServiceDoc>(collections.provider_services);
  const docs = await coll.find({ providerId }).toArray();
  return docs.map((d) => mapMongoDoc(d) as ProviderService);
}

export async function listServicesByProviderIdWithCategories(
  providerId: string,
): Promise<ProviderServiceWithCategory[]> {
  const servicesColl = await getCollection<ProviderServiceDoc>(collections.provider_services);
  const categoriesColl = await getCollection<CategoryDoc>(collections.categories);

  const services = await servicesColl.find({ providerId, isActive: true }).toArray();
  const categoryIds = [...new Set(services.map((s) => s.categoryId))];

  const categories = await categoriesColl
    .find({ _id: { $in: categoryIds } } as any)
    .toArray();
  const categoriesById = new Map<string, Category>();
  for (const c of categories) categoriesById.set(String((c as any)._id), mapMongoDoc(c) as Category);

  return services
    .map((s) => {
      const category = categoriesById.get(s.categoryId);
      if (!category) return null;
      return {
        service: mapMongoDoc(s) as ProviderService,
        category,
      };
    })
    .filter(Boolean) as ProviderServiceWithCategory[];
}

export async function createServicesForProvider(input: {
  providerId: string;
  services: Array<{
    categoryId: string;
    basePrice?: number;
    priceType?: PriceType;
    isActive?: boolean;
  }>;
}): Promise<void> {
  const coll = await getCollection<ProviderServiceDoc>(collections.provider_services);

  const categoryIds = input.services.map((s) => s.categoryId);
  const existing = await coll.find({ providerId: input.providerId, categoryId: { $in: categoryIds } } as any).toArray();
  const existingCategoryIds = new Set(existing.map((e) => e.categoryId));

  const now = new Date(); // not stored, but kept for consistency if you extend schema later
  void now;

  const docs: ProviderServiceDoc[] = [];
  for (const s of input.services) {
    if (existingCategoryIds.has(s.categoryId)) continue;
    docs.push({
      _id: newId(),
      providerId: input.providerId,
      categoryId: s.categoryId,
      basePrice: s.basePrice ?? 80,
      priceType: s.priceType ?? "hourly",
      isActive: s.isActive ?? true,
    });
  }

  if (docs.length === 0) return;
  await coll.insertMany(docs);
}


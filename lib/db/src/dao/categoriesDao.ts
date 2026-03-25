import { getCollection, collections } from "../mongo";
import { mapMongoDoc } from "./utils";

export interface CategoryDoc {
  _id: string;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
}

export type Category = Omit<CategoryDoc, "_id"> & { id: string };

export async function findCategoryById(id: string): Promise<Category | null> {
  const coll = await getCollection<CategoryDoc>(collections.categories);
  const doc = await coll.findOne({ _id: id });
  return doc ? (mapMongoDoc(doc) as Category) : null;
}

export async function listActiveCategories(): Promise<Category[]> {
  const coll = await getCollection<CategoryDoc>(collections.categories);
  const docs = await coll.find({ isActive: true }).toArray();
  return docs.map((d) => mapMongoDoc(d) as Category);
}


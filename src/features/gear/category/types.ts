import type { ListId, PackedItem } from "../types"

export type CategoryId = number;
export type CategoryOptions = Partial<Omit<Category, "id">>;
export type CategoryRecord = Record<CategoryId, Category>;
export interface Category {
  id: CategoryId;
  listId: ListId;
  name: string;
  packedItems: PackedItem[];
}

import type { Category, CategoryOptions, Item, ItemOptions, List, ListOptions, PackedItem, PackedItemOptions } from "../types";

export interface GearSnapshot {
  lists: List[];
  categories: Category[];
  items: Item[];
}

// The UI uses domain operations; storage, transport, and user identity stay behind this boundary.
export interface GearApi {
  readSnapshot: () => Promise<GearSnapshot>;
  createList: (opts: Pick<ListOptions, "name">) => Promise<List>;
  updateList: (list: Pick<List, "id" | "name">) => Promise<List>;
  deleteList: (id: number) => Promise<List>;
  moveCategory: (listId: number, categoryId: number, index: number) => Promise<List>;
  createCategory: (listId: number, opts: Pick<CategoryOptions, "name">) => Promise<Category>;
  updateCategory: (category: Pick<Category, "id" | "name"> & { listId?: number }) => Promise<Category>;
  deleteCategory: (id: number) => Promise<Category>;
  // Item weights are saved with at most two decimal places.
  createItem: (opts: ItemOptions) => Promise<Item>;
  // A unit-only edit converts the stored weight; an explicit weight uses the supplied unit.
  updateItem: (item: Partial<Item> & { id: number }) => Promise<Item>;
  deleteItem: (id: number) => Promise<{ deletedItem: Item; updatedCategories: Category[] }>;
  createPackedItem: (categoryId: number, item: ItemOptions, opts: PackedItemOptions) => Promise<{ item: Item; packedItem: PackedItem; category: Category }>;
  addPackedItem: (categoryId: number, itemId: number, opts: PackedItemOptions, index?: number) => Promise<{ packedItem: PackedItem; category: Category }>;
  updatePackedItem: (categoryId: number, item: Partial<PackedItem> & { id: string }) => Promise<Category>;
  deletePackedItem: (categoryId: number, id: string) => Promise<{ category: Category; removed: PackedItem }>;
  movePackedItem: (fromId: number, toId: number, id: string, index: number) => Promise<{ fromCategory: Category; toCategory: Category }>;
}

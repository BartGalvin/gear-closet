import type {
  List,
  ListId,
  Category,
  CategoryId,
  Item,
  ItemId,
  PackedItem,
  PackedItemOptions,
  ItemOptions,
  CategoryOptions,
  ListOptions,
  PackedItemId,
} from "../types";

export interface GearState {
  lists: Record<ListId, List>;
  categories: Record<CategoryId, Category>;
  items: Record<ItemId, Item>;
}

export interface GearContextType extends GearState {
  error: string | null;
  clearError: () => void;
  selectedListId: ListId | null;
  setSelectedListId: (listId: ListId | null) => void;
  createList: (opts: ListOptions) => Promise<void>;
  fetchLists: () => Promise<void>;
  getLists: () => List[];
  updateList: (list: Pick<List, "id" | "name">) => Promise<void>;
  deleteList: (listId: ListId) => Promise<void>;
  moveCategory: (listId: ListId, categoryId: CategoryId, toIndex: number) => Promise<void>;

  createCategory: (listId: ListId, opts: CategoryOptions) => Promise<void>;
  updateCategory: (cat: Pick<Category, "id" | "name"> & { listId?: ListId }) => Promise<void>;
  deleteCategory: (catId: CategoryId) => Promise<void>;
  getCategoriesForList: (listId: ListId) => Category[];
  fetchCategories: () => Promise<Category[]>;
  fetchCategoriesForList: (listId: ListId) => Promise<Category[]>;

  getItems: () => Item[];
  getItemsForCategory: (catId: CategoryId) => Item[];
  createItem: (opts: ItemOptions) => Promise<void>;
  fetchItems: () => Promise<void>;
  updateItem: (item: Partial<Item> & { id: ItemId }) => Promise<void>;
  deleteItem: (itemId: ItemId) => Promise<void>;

  addPackedItem: (
    catId: CategoryId,
    itemId: ItemId,
    opts: PackedItemOptions,
    index?: number,
  ) => Promise<void>;
  getPackedItemsForCategory: (catId: CategoryId) => PackedItem[];
  updatePackedItem: (catId: CategoryId, pi: Partial<PackedItem> & { id: PackedItemId }) => Promise<void>;
  deletePackedItem: (
    catId: CategoryId,
    packedItemId: PackedItemId,
  ) => Promise<void>;
  createPackedItem: (
    catId: CategoryId,
    itemOpts: ItemOptions,
    packedItemOpts: PackedItemOptions,
  ) => Promise<void>;
  movePackedItem: (
    fromCatId: CategoryId,
    toCatId: CategoryId,
    id: PackedItemId,
    toIndex: number,
  ) => Promise<void>;

  refresh: () => Promise<void>;
}

import type {
  Category,
  CategoryId,
  ItemId,
  PackedItem,
  PackedItemId,
  PackedItemOptions,
} from "../types";
import type { GearStore } from "../repositories/types.ts";
import { packedItemFromOpts } from "../packedItem/factories.ts";
import {
  addPackedItemLogic,
  deletePackedItemLogic,
  movePackedItemLogic,
  updatePackedItemLogic,
} from "../packedItem/packedItemLogic.ts";
import { assertContains } from "./utils.ts";
import { getCategoryOrThrow, setCategory, setCategories } from "./categoryService.ts";
import { memoryGearStore } from "./gearStore.ts";

export function createPackedItem(
  categoryId: CategoryId,
  itemId: ItemId,
  opts: PackedItemOptions = {},
  index?: number,
  store: GearStore = memoryGearStore,
): Promise<{ packedItem: PackedItem; category: Category }> {
  return store.mutate(async () => {
    await assertContains(store.items, itemId, "Item");
    const current = await getCategoryOrThrow(categoryId, store);
    const packedItem = packedItemFromOpts(opts, itemId);
    const category = addPackedItemLogic({ [categoryId]: current }, categoryId, packedItem, index)[categoryId];
    await setCategory(category, store);
    return { packedItem, category };
  });
}

function findPackedItem(category: Category, id: PackedItemId): PackedItem {
  const packedItem = category.packedItems.find((current) => current.id === id);
  if (!packedItem) throw new Error(`PackedItem ${id} not found in category ${category.id}`);
  return packedItem;
}

export async function getPackedItem(
  categoryId: CategoryId,
  id: PackedItemId,
  store: GearStore = memoryGearStore,
): Promise<PackedItem> {
  return findPackedItem(await getCategoryOrThrow(categoryId, store), id);
}

export async function getPackedItems(categoryId: CategoryId, store: GearStore = memoryGearStore): Promise<PackedItem[]> {
  return (await getCategoryOrThrow(categoryId, store)).packedItems;
}

export function updatePackedItem(
  categoryId: CategoryId,
  patch: Partial<PackedItem> & { id: PackedItemId },
  store: GearStore = memoryGearStore,
): Promise<Category> {
  return store.mutate(async () => {
    const category = await getCategoryOrThrow(categoryId, store);
    const current = findPackedItem(category, patch.id);
    if (patch.itemId !== undefined && patch.itemId !== current.itemId) {
      throw new Error("Changing a packed item's inventory item is not supported");
    }
    await assertContains(store.items, current.itemId, "Item");
    const packedItem = { ...current, ...patch, itemId: current.itemId };
    const updated = updatePackedItemLogic({ [categoryId]: category }, categoryId, packedItem);
    return setCategory(updated[categoryId], store);
  });
}

export function movePackedItem(
  fromCategoryId: CategoryId,
  toCategoryId: CategoryId,
  id: PackedItemId,
  toIndex: number,
  store: GearStore = memoryGearStore,
): Promise<{ fromCategory: Category; toCategory: Category }> {
  return store.mutate(async () => {
    const fromCategory = await getCategoryOrThrow(fromCategoryId, store);
    const toCategory = fromCategoryId === toCategoryId
      ? fromCategory
      : await getCategoryOrThrow(toCategoryId, store);
    findPackedItem(fromCategory, id);
    const updated = movePackedItemLogic(
      { [fromCategoryId]: fromCategory, [toCategoryId]: toCategory },
      fromCategoryId, toCategoryId, id, toIndex,
    );
    await setCategories(fromCategoryId === toCategoryId
      ? [updated[fromCategoryId]]
      : [updated[fromCategoryId], updated[toCategoryId]], store);
    return { fromCategory: updated[fromCategoryId], toCategory: updated[toCategoryId] };
  });
}

export function removePackedItem(
  categoryId: CategoryId,
  id: PackedItemId,
  store: GearStore = memoryGearStore,
): Promise<{ category: Category; removed: PackedItem }> {
  return store.mutate(async () => {
    const current = await getCategoryOrThrow(categoryId, store);
    const removed = findPackedItem(current, id);
    const category = deletePackedItemLogic({ [categoryId]: current }, categoryId, id)[categoryId];
    await setCategory(category, store);
    return { category, removed };
  });
}

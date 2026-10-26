import type {
  Item, ItemId, ItemOptions, Category, CategoryId, PackedItem, PackedItemOptions,
} from "../types";
import type { GearStore } from "../repositories/types.ts";
import { itemFromOpts } from "../item/factories.ts";
import { packedItemFromOpts } from "../packedItem/factories.ts";
import { addPackedItemLogic } from "../packedItem/packedItemLogic.ts";
import { getUniqueEntityName, getOrThrow, setEntity } from "./utils.ts";
import { getCategoryOrThrow, setCategory } from "./categoryService.ts";
import { memoryGearStore, resetMemorySequence } from "./gearStore.ts";
import { convertWeight } from "../utils/weightUnits.ts";
import { formatDecimal } from "../utils/decimal.ts";

export const resetItemSeq = () => resetMemorySequence("item");

export async function getUniqueItemName(
  baseName: string,
  store: GearStore = memoryGearStore,
): Promise<string> {
  return getUniqueEntityName(
    baseName || "New Item",
    store.items,
    (item) => item.name,
  );
}

async function setItem(item: Item, store: GearStore): Promise<Item> {
  return setEntity(store.items, { ...item, weight: Number(formatDecimal(item.weight, 2)) });
}

async function getItemOrThrow(itemId: ItemId, store: GearStore): Promise<Item> {
  return getOrThrow(store.items, itemId);
}

async function createItemRecord(opts: ItemOptions, store: GearStore): Promise<Item> {
  const name = await getUniqueItemName(opts.name ?? "", store);
  return setItem(itemFromOpts({ ...opts, name }, await store.nextId("item")), store);
}

export function createItem(opts: ItemOptions = {}, store: GearStore = memoryGearStore): Promise<Item> {
  return store.mutate(() => createItemRecord(opts, store));
}

export function createItemInCategory(
  categoryId: CategoryId,
  itemOpts: ItemOptions = {},
  packedOpts: PackedItemOptions = {},
  store: GearStore = memoryGearStore,
): Promise<{ item: Item; category: Category; packedItem: PackedItem }> {
  return store.mutate(async () => {
    const current = await getCategoryOrThrow(categoryId, store);
    const item = await createItemRecord(itemOpts, store);
    const packedItem = packedItemFromOpts(packedOpts, item.id);
    const category = addPackedItemLogic({ [categoryId]: current }, categoryId, packedItem)[categoryId];
    await setCategory(category, store);
    return { item, category, packedItem };
  });
}

export async function getItem(itemId: ItemId, store: GearStore = memoryGearStore): Promise<Item> {
  return getItemOrThrow(itemId, store);
}

export async function getItems(store: GearStore = memoryGearStore): Promise<Item[]> {
  return store.items.getAll();
}

export async function getItemsByCategory(categoryId: CategoryId, store: GearStore = memoryGearStore): Promise<Item[]> {
  const category = await getCategoryOrThrow(categoryId, store);
  return store.items.getArr(category.packedItems.map((packedItem) => packedItem.itemId));
}

export function updateItem(item: Partial<Item> & { id: ItemId }, store: GearStore = memoryGearStore): Promise<Item> {
  return store.mutate(async () => {
    const current = await getItemOrThrow(item.id, store);
    const updated = { ...current, ...item };
    if (item.unit !== undefined && item.weight === undefined) {
      updated.weight = convertWeight(current.weight, current.unit, item.unit) ?? current.weight;
    }
    return setItem(updated, store);
  });
}

export function deleteItem(
  itemId: ItemId,
  store: GearStore = memoryGearStore,
): Promise<{ deletedItem: Item; updatedCategories: Category[] }> {
  return store.mutate(async () => {
    const deletedItem = await getItemOrThrow(itemId, store);
    await store.items.delete(itemId);
    const updatedCategories: Category[] = [];
    for (const category of await store.categories.getAll()) {
      if (!category.packedItems.some((packedItem) => packedItem.itemId === itemId)) continue;
      const updated = {
        ...category,
        packedItems: category.packedItems.filter((packedItem) => packedItem.itemId !== itemId),
      };
      await setCategory(updated, store);
      updatedCategories.push(updated);
    }
    return { deletedItem, updatedCategories };
  });
}

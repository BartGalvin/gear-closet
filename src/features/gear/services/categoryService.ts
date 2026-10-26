import type {
  Category,
  CategoryId,
  CategoryOptions,
  ListId,
} from "../types";
import type { GearStore } from "../repositories/types.ts";
import { getUniqueEntityName, getOrThrow, setEntity } from "./utils.ts";
import { getListOrThrow, addCategoryToList, setList } from "./listService.ts";
import { memoryGearStore, resetMemorySequence } from "./gearStore.ts";

export const resetCatSeq = () => resetMemorySequence("category");

export async function getUniqueCategoryName(
  baseName: string,
  listId: ListId,
  store: GearStore = memoryGearStore,
): Promise<string> {
  const list = await getListOrThrow(listId, store);
  return getUniqueEntityName(
    baseName || "New Category",
    store.categories,
    (category) => category.name,
    list.categoryIds,
  );
}

export async function setCategory(category: Category, store: GearStore = memoryGearStore): Promise<Category> {
  return setEntity(store.categories, category);
}

export async function setCategories(records: Category[], store: GearStore = memoryGearStore): Promise<Category[]> {
  for (const category of records) {
    await setCategory(category, store);
  }
  return records;
}

export async function getCategoryOrThrow(categoryId: CategoryId, store: GearStore = memoryGearStore): Promise<Category> {
  return getOrThrow(store.categories, categoryId);
}

export function createCategory(
  listId: ListId,
  { name = "", packedItems = [] }: CategoryOptions,
  store: GearStore = memoryGearStore,
): Promise<Category> {
  return store.mutate(async () => {
    const list = await getListOrThrow(listId, store);
    const uniqueName = await getUniqueCategoryName(name, listId, store);
    const category: Category = { id: await store.nextId("category"), listId, name: uniqueName, packedItems };
    await setList(addCategoryToList(list, category.id), store);
    return setCategory(category, store);
  });
}

export async function getCategory(categoryId: CategoryId, store: GearStore = memoryGearStore): Promise<Category> {
  return getCategoryOrThrow(categoryId, store);
}

export async function getCategories(store: GearStore = memoryGearStore): Promise<Category[]> {
  return store.categories.getAll();
}

export async function getCategoriesByList(listId: ListId, store: GearStore = memoryGearStore): Promise<Category[]> {
  const list = await getListOrThrow(listId, store);
  return store.categories.getArr(list.categoryIds);
}

export function updateCategory(category: Pick<Category, "id" | "name"> & { listId?: ListId }, store: GearStore = memoryGearStore): Promise<Category> {
  return store.mutate(async () => {
    const current = await getCategoryOrThrow(category.id, store);
    if (category.listId !== undefined && category.listId !== current.listId) {
      throw new Error("Changing a category's list is not supported");
    }
    return setCategory({ ...current, name: category.name }, store);
  });
}

export function deleteCategory(categoryId: CategoryId, store: GearStore = memoryGearStore): Promise<Category> {
  return store.mutate(async () => {
    const category = await getCategoryOrThrow(categoryId, store);
    const list = await getListOrThrow(category.listId, store);
    await store.categories.delete(categoryId);
    await setList({
      ...list,
      categoryIds: list.categoryIds.filter((id) => id !== categoryId),
    }, store);
    return category;
  });
}

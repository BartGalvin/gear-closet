import type { GearStore } from "../repositories/types.ts";
import {
  assertIndexInBounds,
  getOrThrow,
  getUniqueEntityName,
  setEntity,
} from "./utils.ts";
import { memoryGearStore, resetMemorySequence } from "./gearStore.ts";

import type { CategoryId, List, ListId, ListOptions } from "../types";

export const resetListSeq = () => resetMemorySequence("list");

export async function getUniqueListName(baseName: string, store: GearStore = memoryGearStore): Promise<string> {
  return getUniqueEntityName(baseName || "New List", store.lists, (list) => list.name);
}

export async function setList(list: List, store: GearStore = memoryGearStore): Promise<List> {
  return setEntity(store.lists, list);
}

export async function getListOrThrow(listId: ListId, store: GearStore = memoryGearStore): Promise<List> {
  return getOrThrow(store.lists, listId);
}

export function createList({
  name = "",
  categoryIds = [],
}: ListOptions, store: GearStore = memoryGearStore): Promise<List> {
  return store.mutate(async () => {
    const uniqueName = await getUniqueListName(name, store);
    return setList({ id: await store.nextId("list"), name: uniqueName, categoryIds }, store);
  });
}

export async function getList(listId: ListId, store: GearStore = memoryGearStore): Promise<List> {
  return getListOrThrow(listId, store);
}

export async function getLists(store: GearStore = memoryGearStore): Promise<List[]> {
  return store.lists.getAll();
}

export function updateList(list: Pick<List, "id" | "name">, store: GearStore = memoryGearStore): Promise<List> {
  return store.mutate(async () => {
    const current = await getListOrThrow(list.id, store);
    return setList({ ...current, name: list.name }, store);
  });
}

export function deleteList(listId: ListId, store: GearStore = memoryGearStore): Promise<List> {
  return store.mutate(async () => {
    const list = await getListOrThrow(listId, store);
    await store.lists.delete(listId);
    for (const categoryId of list.categoryIds) {
      await store.categories.delete(categoryId);
    }
    return list;
  });
}

export function addCategoryToList(list: List, categoryId: CategoryId): List {
  if (list.categoryIds.includes(categoryId)) return list;
  return { ...list, categoryIds: [...list.categoryIds, categoryId] };
}

export function moveCategory(
  listId: ListId,
  categoryId: CategoryId,
  toIndex: number,
  store: GearStore = memoryGearStore,
): Promise<List> {
  return store.mutate(async () => {
    const list = await getListOrThrow(listId, store);
    const categoryIds = [...list.categoryIds];
    const currentIndex = categoryIds.indexOf(categoryId);
    assertIndexInBounds(categoryIds, currentIndex, `list ${listId}`);
    assertIndexInBounds(categoryIds, toIndex, `list ${listId}`);
    if (currentIndex === toIndex) return list;
    categoryIds.splice(currentIndex, 1);
    categoryIds.splice(toIndex, 0, categoryId);
    return setList({ ...list, categoryIds }, store);
  });
}

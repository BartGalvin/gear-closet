import { categories, items, lists } from "../repositories/inMemoryRepository.ts";
import type { GearSnapshot } from "../api/GearApi.ts";
import type { GearEntity, GearStore } from "../repositories/types.ts";
export type { GearSnapshot } from "../api/GearApi.ts";

const sequences: Record<GearEntity, number> = { list: 1, category: 1, item: 1 };

export function resetMemorySequence(entity: GearEntity) {
  sequences[entity] = 1;
}

let pending: Promise<void> = Promise.resolve();

function enqueue<T>(action: () => Promise<T>): Promise<T> {
  const result = pending.then(action);
  pending = result.then(() => undefined, () => undefined);
  return result;
}

async function readRepositories(): Promise<GearSnapshot> {
  const [listRecords, categoryRecords, itemRecords] = await Promise.all([
    lists.getAll(), categories.getAll(), items.getAll(),
  ]);
  return { lists: listRecords, categories: categoryRecords, items: itemRecords };
}

// Compound commands share this queue; nested queued commands would deadlock.
export function mutateGear<T>(action: () => Promise<T>): Promise<T> {
  return enqueue(async () => {
    const before = await readRepositories();
    try {
      return await action();
    } catch (error) {
      lists.replaceAll(before.lists);
      categories.replaceAll(before.categories);
      items.replaceAll(before.items);
      throw error;
    }
  });
}

export function readGearSnapshot(): Promise<GearSnapshot> {
  return enqueue(readRepositories);
}

export const memoryGearStore: GearStore = {
  lists, categories, items,
  nextId: (entity) => Promise.resolve(sequences[entity]++),
  mutate: mutateGear,
  readSnapshot: readGearSnapshot,
};

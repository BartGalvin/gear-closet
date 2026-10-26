import { defaultMockData, type MockData } from "./mockData";
import { createCategory, resetCatSeq } from "../services/categoryService";
import { createItem, resetItemSeq } from "../services/itemService";
import { createList, resetListSeq } from "../services/listService";
import { createPackedItem } from "../services/packedItemService";
import { mutateGear } from "../services/gearStore";
import { categories, items, lists } from "../repositories/inMemoryRepository";

export async function loadMockData(data: MockData = defaultMockData): Promise<void> {
  const idMap = new Map<string, number>();
  for (const item of data.items) {
    const created = await createItem({ name: item.name, weight: item.weight });
    idMap.set(item.id, created.id);
  }

  for (const list of data.lists) {
    const createdList = await createList({ name: list.name });
    for (const category of list.categories) {
      const createdCategory = await createCategory(createdList.id, { name: category.name });
      for (const itemId of category.itemIds) {
        const realId = idMap.get(itemId);
        if (realId !== undefined) {
          await createPackedItem(createdCategory.id, realId);
        }
      }
    }
  }
}

export function resetMockData(): Promise<void> {
  return mutateGear(async () => {
    await Promise.all([lists.clear(), categories.clear(), items.clear()]);
    resetListSeq();
    resetCatSeq();
    resetItemSeq();
  });
}

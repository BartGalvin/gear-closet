import type { Category, CategoryId, Item, ItemId } from "../types";

export function selectAllItems(items: Record<ItemId, Item>): Item[] {
  return Object.values(items);
}

export function selectItemById(items: Record<ItemId, Item>, id: ItemId): Item | undefined {
  return items[id];
}

export function selectItemsByCategory(
  items: Record<ItemId, Item>,
  categories: Record<CategoryId, Category>,
  categoryId: CategoryId,
): Item[] {
  const category = categories[categoryId];
  if (!category) return [];
  return category.packedItems
    .map((packedItem) => items[packedItem.itemId])
    .filter((item): item is Item => item !== undefined);
}

export function selectItemsBySearch(
  items: Record<ItemId, Item>,
  search: string
): Item[] {
  return Object.values(items).filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );
}

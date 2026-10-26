import type {
  Category,
  CategoryId,
  Item,
  ItemId,
  PackedItem,
} from "../types"

export function selectPackedItemsForCategory(
  categories: Record<CategoryId, Category>,
  categoryId: CategoryId
): PackedItem[] {
  const cat = categories[categoryId]
  if (!cat) return []
  return cat.packedItems
}

export function selectItemsForCategory(
  categories: Record<CategoryId, Category>,
  items: Record<ItemId, Item>,
  categoryId: CategoryId
): Item[] {
  const cat = categories[categoryId]
  if (!cat) return []
  return cat.packedItems.map(pi => items[pi.itemId]).filter(Boolean)
}

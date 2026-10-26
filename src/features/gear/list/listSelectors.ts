import type { List, ListId, CategoryId, Category } from "../types"

export function selectAllLists(lists: Record<ListId, List>): List[] {
  return Object.values(lists)
}

export function selectCategoriesForList(
  lists: Record<ListId, List>,
  categories: Record<CategoryId, Category>,
  listId: ListId
): Category[] {
  const list = lists[listId]
  if (!list) return []
  return list.categoryIds
    .map((cid) => categories[cid])
    .filter((c): c is Category => !!c)
}

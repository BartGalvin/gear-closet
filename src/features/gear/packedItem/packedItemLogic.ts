import type { Category, CategoryId, PackedItem, PackedItemId } from "../types";

function assertInsertionIndex(index: number, category: Category): void {
  if (!Number.isInteger(index) || index < 0 || index > category.packedItems.length) {
    throw new Error(`Index ${index} out of bounds for category ${category.id} packed items`);
  }
}

export function addPackedItemLogic(
  categories: Record<CategoryId, Category>,
  categoryId: CategoryId,
  packedItem: PackedItem,
  index?: number,
): Record<CategoryId, Category> {
  const category = categories[categoryId];
  if (!category) return categories;
  const insertionIndex = index ?? category.packedItems.length;
  assertInsertionIndex(insertionIndex, category);
  const packedItems = [...category.packedItems];
  packedItems.splice(insertionIndex, 0, packedItem);
  return { ...categories, [categoryId]: { ...category, packedItems } };
}

export function updatePackedItemLogic(
  categories: Record<CategoryId, Category>,
  categoryId: CategoryId,
  packedItem: PackedItem,
): Record<CategoryId, Category> {
  const category = categories[categoryId];
  if (!category) return categories;
  const packedItems = category.packedItems.map((current) =>
    current.id === packedItem.id ? { ...current, ...packedItem } : current,
  );
  return { ...categories, [categoryId]: { ...category, packedItems } };
}

export function deletePackedItemLogic(
  categories: Record<CategoryId, Category>,
  categoryId: CategoryId,
  packedItemId: PackedItemId,
): Record<CategoryId, Category> {
  const category = categories[categoryId];
  if (!category) return categories;
  const packedItems = category.packedItems.filter((packedItem) => packedItem.id !== packedItemId);
  return { ...categories, [categoryId]: { ...category, packedItems } };
}

export function movePackedItemLogic(
  categories: Record<CategoryId, Category>,
  fromCategoryId: CategoryId,
  toCategoryId: CategoryId,
  packedItemId: PackedItemId,
  toIndex: number,
): Record<CategoryId, Category> {
  const fromCategory = categories[fromCategoryId];
  const toCategory = categories[toCategoryId];
  if (!fromCategory || !toCategory) return categories;
  const fromIndex = fromCategory.packedItems.findIndex((packedItem) => packedItem.id === packedItemId);
  if (fromIndex === -1) return categories;
  assertInsertionIndex(toIndex, toCategory);
  const packedItems = [...fromCategory.packedItems];
  const [moved] = packedItems.splice(fromIndex, 1);
  if (fromCategoryId === toCategoryId) {
    packedItems.splice(toIndex, 0, moved);
    return { ...categories, [fromCategoryId]: { ...fromCategory, packedItems } };
  }
  const updated = { ...categories, [fromCategoryId]: { ...fromCategory, packedItems } };
  return addPackedItemLogic(updated, toCategoryId, moved, toIndex);
}

import type { Category, CategoryId, PackedItem } from "../types";

export function selectPackedItemsForCategory(
    categories: Record<CategoryId, Category>,
    categoryId: CategoryId
): PackedItem[] {
    const cat = categories[categoryId];
    return cat ? cat.packedItems : [];
}

export function selectPackedItemById(
    categories: Record<CategoryId, Category>,
    categoryId: CategoryId,
    packedItemId: string
): PackedItem | undefined {
    const cat = categories[categoryId];
    return cat?.packedItems.find(pi => pi.id === packedItemId);
}

export function selectPackedItemsByStar(
    categories: Record<CategoryId, Category>,
    categoryId: CategoryId,
    star: string
): PackedItem[] {
    const cat = categories[categoryId];
    return cat ? cat.packedItems.filter(pi => pi.star === star) : [];
}
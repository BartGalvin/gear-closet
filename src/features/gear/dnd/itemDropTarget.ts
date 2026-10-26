import type { Category, CategoryId, DragData } from "../types";

export interface ItemDropTarget {
  categoryId: CategoryId;
  // A gap in the destination's current rows, before removing the dragged placement.
  index: number;
}

export function getItemDropTarget(
  drag: DragData | undefined,
  over: DragData | undefined,
  categories: Record<CategoryId, Category>,
): ItemDropTarget | null {
  if (!drag || drag.type === "category" || (over?.type !== "category" && over?.type !== "packed-item")) {
    return null;
  }
  const category = categories[over.categoryId];
  if (!category) return null;
  let index = over.type === "packed-item"
    ? category.packedItems.findIndex((item) => item.id === over.packedItemId)
    : category.packedItems.length;
  if (index === -1) return null;

  if (drag.type === "packed-item") {
    const source = categories[drag.categoryId];
    const sourceIndex = source?.packedItems.findIndex((item) => item.id === drag.packedItemId) ?? -1;
    if (sourceIndex === -1) return null;
    if (source.id === category.id) {
      if (sourceIndex === index || (index === category.packedItems.length && sourceIndex === index - 1)) {
        return null;
      }
      // Reordering downward places the dragged item after the hovered row.
      if (over.type === "packed-item" && sourceIndex < index) index += 1;
    }
  }
  return { categoryId: category.id, index };
}

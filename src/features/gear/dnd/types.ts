import type { ItemId, PackedItemId, CategoryId } from "../types";

export interface SidebarItemDragData {
  type: "sidebar-item";
  itemId: ItemId;
}

export interface PackedItemDragData {
  type: "packed-item";
  itemId: ItemId;
  categoryId: CategoryId;
  packedItemId: PackedItemId;
}

export interface CategoryDropData {
  type: "category";
  categoryId: CategoryId;
}

export type DragData =
  | SidebarItemDragData
  | PackedItemDragData
  | CategoryDropData;

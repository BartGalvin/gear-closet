import type { ItemId } from "../item/types";

export type PackedItemId = string;
export type PackedItemOptions = Partial<Omit<PackedItem, "itemId">>;
export type Star = "red" | "yellow" | "green" | "none";
export interface PackedItem {
  id: PackedItemId;
  itemId: ItemId;
  quantity: number;
  worn: boolean;
  consumable: boolean;
  star: Star;
}
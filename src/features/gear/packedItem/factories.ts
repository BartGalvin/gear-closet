import type { ItemId, PackedItem, PackedItemId, PackedItemOptions } from "../types";
import { nanoid } from "nanoid";

export function packedItemFromOpts(
  opts: PackedItemOptions = {},
  itemId?: ItemId,
  packedItemId?: PackedItemId
): PackedItem {
  return {
    id: packedItemId ?? opts.id ?? nanoid(),
    itemId: itemId ?? 0,
    quantity: opts.quantity ?? 1,
    worn: opts.worn ?? false,
    consumable: opts.consumable ?? false,
    star: opts.star ?? "none",
  };
}

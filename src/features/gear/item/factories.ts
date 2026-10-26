import type { Item, ItemId, ItemOptions } from "./types";

export function itemFromOpts(
  opts: ItemOptions = {},
  id?: ItemId,
  name?: string,
): Item {
  return {
    id: id ?? 0,
    name: opts.name ?? name ?? "",
    description: opts.description ?? "",
    image: opts.image ?? "",
    url: opts.url ?? "",
    tags: opts.tags ?? [],
    weight: opts.weight ?? 0,
    unit: opts.unit ?? "g",
    price: opts.price ?? 0,
  };
}

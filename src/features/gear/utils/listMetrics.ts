import type { Category, Item, PackedItem } from "../types";
import { weightInGrams } from "./weightUnits";

export interface ListMetrics {
  // All weight totals are in grams, before display conversion.
  weight: number;
  baseWeight: number;
  wornWeight: number;
  consumableWeight: number;
  consumablePrice: number;
  price: number;
  itemCount: number;
  excludedWeights: number;
}

export interface CategoryMetric extends ListMetrics {
  categoryId: number;
  categoryName: string;
}

export type WeightBasis = "weight" | "baseWeight";

function emptyMetrics(): ListMetrics {
  return {
    weight: 0, baseWeight: 0,
    wornWeight: 0, consumableWeight: 0, consumablePrice: 0, price: 0, itemCount: 0, excludedWeights: 0,
  };
}

export function calculateItemMetrics(item: Item, packedItem: PackedItem): ListMetrics {
  const metrics = { ...emptyMetrics(), price: item.price * packedItem.quantity, itemCount: packedItem.quantity };
  if (packedItem.consumable) metrics.consumablePrice = metrics.price;
  if (packedItem.quantity === 0 || item.weight === 0) return metrics;
  const grams = weightInGrams(item.weight, item.unit);
  const weight = grams === null ? null : grams * packedItem.quantity;
  if (weight === null || !Number.isFinite(weight) || weight < 0) {
    metrics.excludedWeights = 1;
    return metrics;
  }
  metrics.weight = weight;
  if (!packedItem.worn && !packedItem.consumable) metrics.baseWeight = weight;
  if (packedItem.worn) metrics.wornWeight = weight;
  if (packedItem.consumable) metrics.consumableWeight = weight;
  return metrics;
}

export function calculateCategoryMetrics(
  categories: Category[],
  items: Record<number, Item>,
): CategoryMetric[] {
  return categories.map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    ...calculateTotalMetrics(category.packedItems.flatMap((packedItem) => {
      const item = items[packedItem.itemId];
      return item ? [calculateItemMetrics(item, packedItem)] : [];
    })),
  }));
}

export function calculateTotalMetrics(metrics: ListMetrics[]): ListMetrics {
  return metrics.reduce(
    (acc, metric) => ({
      weight: acc.weight + metric.weight,
      baseWeight: acc.baseWeight + metric.baseWeight,
      wornWeight: acc.wornWeight + metric.wornWeight,
      consumableWeight: acc.consumableWeight + metric.consumableWeight,
      consumablePrice: acc.consumablePrice + metric.consumablePrice,
      price: acc.price + metric.price,
      itemCount: acc.itemCount + metric.itemCount,
      excludedWeights: acc.excludedWeights + metric.excludedWeights,
    }),
    emptyMetrics(),
  );
}

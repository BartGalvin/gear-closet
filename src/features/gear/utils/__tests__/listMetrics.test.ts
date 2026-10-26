import { itemFromOpts } from "../../item/factories";
import { packedItemFromOpts } from "../../packedItem/factories";
import type { Category } from "../../types";
import { calculateCategoryMetrics, calculateTotalMetrics } from "../listMetrics";

it("combines mixed units and quantities with placement-specific worn and consumable exclusions", () => {
  const items = {
    1: itemFromOpts({ name: "Tent", weight: 1, unit: "kg", price: 100 }, 1),
    2: itemFromOpts({ name: "Fleece", weight: 16, unit: "oz" }, 2),
    3: itemFromOpts({ name: "Fuel", weight: 0.5, unit: "lb", price: 20 }, 3),
    4: itemFromOpts({ name: "Both flags", weight: 100, unit: "g", price: 5 }, 4),
  };
  const categories: Category[] = [
    { id: 1, listId: 1, name: "Shelter", packedItems: [
      packedItemFromOpts({ quantity: 2 }, 1),
      packedItemFromOpts({ worn: true }, 2),
    ] },
    { id: 2, listId: 1, name: "Other", packedItems: [
      packedItemFromOpts({ quantity: 2, consumable: true }, 3),
      packedItemFromOpts({ worn: true, consumable: true }, 4),
      packedItemFromOpts({ worn: true }, 1),
    ] },
  ];
  const metrics = calculateCategoryMetrics(categories, items);
  const totals = calculateTotalMetrics(metrics);
  expect(metrics[0].weight).toBeCloseTo(2453.59237, 8);
  expect(metrics[1].weight).toBeCloseTo(1553.59237, 8);
  expect(totals.weight).toBeCloseTo(4007.18474, 8);
  expect(totals.baseWeight).toBe(2000);
  expect(totals.wornWeight).toBeCloseTo(1553.59237, 8);
  expect(totals.consumableWeight).toBeCloseTo(553.59237, 8);
  expect(metrics[0].wornWeight).toBeCloseTo(453.59237, 8);
  expect(metrics[0].consumableWeight).toBe(0);
  expect(metrics[0].consumablePrice).toBe(0);
  expect(metrics[1].consumablePrice).toBe(45);
  expect(totals).toMatchObject({ price: 345, consumablePrice: 45, itemCount: 7, excludedWeights: 0 });
});

it("skips missing items and reports unconvertible entries without corrupting known totals", () => {
  const items = {
    1: itemFromOpts({ weight: 100, unit: "g" }, 1),
    2: itemFromOpts({ weight: 10, unit: "stone", price: 9 }, 2),
    3: itemFromOpts({ weight: 20, unit: "stone" }, 3),
    4: itemFromOpts({ weight: 0, unit: "g", price: 6 }, 4),
  };
  const categories: Category[] = [{ id: 1, listId: 1, name: "Gear", packedItems: [
    packedItemFromOpts({}, 1),
    packedItemFromOpts({ worn: true, consumable: true }, 2),
    packedItemFromOpts({ quantity: 0 }, 3),
    packedItemFromOpts({ quantity: 2, consumable: true }, 4),
    packedItemFromOpts({}, 999),
  ] }];
  expect(calculateTotalMetrics(calculateCategoryMetrics(categories, items))).toMatchObject({
    weight: 100, baseWeight: 100, wornWeight: 0, consumableWeight: 0,
    price: 21, consumablePrice: 21, excludedWeights: 1,
  });
});

it("returns finite zero totals for an empty list", () => {
  expect(calculateTotalMetrics(calculateCategoryMetrics([], {}))).toEqual({
    weight: 0, baseWeight: 0, wornWeight: 0, consumableWeight: 0,
    price: 0, consumablePrice: 0, itemCount: 0, excludedWeights: 0,
  });
});

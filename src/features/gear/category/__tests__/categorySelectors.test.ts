import {
  selectPackedItemsForCategory,
  selectItemsForCategory,
} from "../categorySelectors";

import type { CategoryId, Category } from "../types";

const categories: Record<CategoryId, Category> = {
  1: {
    id: 1,
    listId: 1,
    name: "A",
    packedItems: [
      { id: "p1", itemId: 21, quantity: 1, worn: false, consumable: false, star: "none" },
      { id: "p2", itemId: 22, quantity: 2, worn: true, consumable: false, star: "red" },
    ],
  },
  2: {
    id: 2,
    listId: 1,
    name: "B",
    packedItems: [],
  },
};

describe("categoriesSelectors", () => {
  it("selectPackedItemsForCategory returns packed items", () => {

    expect(selectPackedItemsForCategory(categories, 1)).toHaveLength(2);
    expect(selectPackedItemsForCategory(categories, 2)).toEqual([]);
  });

  it("selectItemsForCategory returns items for category", () => {

    const items = {
      21: { id: 21, name: "Tent", description: "", image: "", url: "", tags: [], weight: 0, unit: "g", price: 0 },
    };
    expect(selectItemsForCategory(categories, items, 1)[0].name).toBe("Tent");
    expect(selectItemsForCategory(categories, items, 2)).toEqual([]);
  });
  it("selectPackedItemsForCategory returns [] if category does not exist", () => {
    expect(selectPackedItemsForCategory(categories, 999)).toEqual([]);
  });

  it("selectItemsForCategory skips missing items", () => {
    const items = { 21: { id: 21, name: "Tent", description: "", image: "", url: "", tags: [], weight: 0, unit: "g", price: 0 } };
    expect(selectItemsForCategory(categories, items, 1)).toHaveLength(1);
  });
});
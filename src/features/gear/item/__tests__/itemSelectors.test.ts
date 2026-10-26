import {
    selectAllItems,
    selectItemById,
    selectItemsByCategory,
    selectItemsBySearch,
} from "../itemSelectors";

import type { Category, Item } from "../../types";

describe("itemSelectors", () => {
    const items: Record<number, Item> = {
        1: { id: 1, name: "Tent", description: "", image: "", url: "", tags: [], weight: 0, unit: "g", price: 0 },
        2: { id: 2, name: "Stove", description: "", image: "", url: "", tags: [], weight: 0, unit: "g", price: 0 },
    };
    const categories: Record<number, Category> = {
        1: {
            id: 1,
            listId: 1,
            name: "A",
            packedItems: [
                { id: "p1", itemId: 1, quantity: 1, worn: false, consumable: false, star: "none" },
                { id: "p2", itemId: 2, quantity: 2, worn: true, consumable: false, star: "red" },
            ],
        },
        2: {
            id: 2,
            listId: 1,
            name: "B",
            packedItems: [],
        },
    };

    it("selectAllItems returns all items", () => {
        expect(selectAllItems(items)).toHaveLength(2);
    });

    it("selectItemById returns the correct item", () => {
        expect(selectItemById(items, 1)?.name).toBe("Tent");
        expect(selectItemById(items, 999)).toBeUndefined();
    });

    it("selectItemsByCategory returns items for category", () => {
        expect(selectItemsByCategory(items, categories, 1)).toHaveLength(2);
        expect(selectItemsByCategory(items, categories, 2)).toEqual([]);
        expect(selectItemsByCategory(items, categories, 999)).toEqual([]);
    });

    it("selectItemsByCategory skips missing inventory records and preserves placement order", () => {
        const category = {
            ...categories[1],
            packedItems: [
                categories[1].packedItems[1],
                { ...categories[1].packedItems[0], itemId: 999 },
                categories[1].packedItems[0],
            ],
        };
        expect(selectItemsByCategory(items, { 1: category }, 1)).toEqual([items[2], items[1]]);
    });

    it("selectItemsBySearch filters items by name", () => {
        expect(selectItemsBySearch(items, "tent")).toHaveLength(1);
        expect(selectItemsBySearch(items, "nonexistent")).toEqual([]);
    });
});

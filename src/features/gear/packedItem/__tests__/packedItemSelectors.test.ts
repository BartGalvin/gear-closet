import {
    selectPackedItemsForCategory,
    selectPackedItemById,
    selectPackedItemsByStar,
} from "../packedItemSelectors";
import type { Category } from "../../types";

describe("packedItemSelectors", () => {
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

    it("selectPackedItemsForCategory returns all packed items for a category", () => {
        expect(selectPackedItemsForCategory(categories, 1)).toHaveLength(2);
        expect(selectPackedItemsForCategory(categories, 2)).toEqual([]);
        expect(selectPackedItemsForCategory(categories, 999)).toEqual([]);
    });

    it("selectPackedItemById returns the correct packed item", () => {
        expect(selectPackedItemById(categories, 1, "p1")?.itemId).toBe(1);
        expect(selectPackedItemById(categories, 1, "doesnotexist")).toBeUndefined();
        expect(selectPackedItemById(categories, 999, "p1")).toBeUndefined();
    });

    it("selectPackedItemsByStar returns packed items with the given star", () => {
        expect(selectPackedItemsByStar(categories, 1, "red")).toHaveLength(1);
        expect(selectPackedItemsByStar(categories, 1, "none")).toHaveLength(1);
        expect(selectPackedItemsByStar(categories, 1, "yellow")).toEqual([]);
        expect(selectPackedItemsByStar(categories, 999, "red")).toEqual([]);
    });
});
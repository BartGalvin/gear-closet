import {
    addPackedItemLogic,
    updatePackedItemLogic,
    deletePackedItemLogic,
    movePackedItemLogic,
} from "../packedItemLogic";
import type { Category, PackedItem } from "../../types";

describe("packedItemLogic", () => {
    const packedItem: PackedItem = { id: "p1", itemId: 1, quantity: 1, worn: false, consumable: false, star: "none" };
    const cat: Category = { id: 1, listId: 1, name: "A", packedItems: [] };

    it("addPackedItemLogic adds a packed item to the end", () => {
        const categories = { 1: { ...cat, packedItems: [] } };
        const result = addPackedItemLogic(categories, 1, packedItem);
        expect(result[1].packedItems).toContainEqual(packedItem);
    });

    it("addPackedItemLogic inserts at index", () => {
        const pi2 = { ...packedItem, id: "p2" };
        const categories = { 1: { ...cat, packedItems: [pi2] } };
        const result = addPackedItemLogic(categories, 1, packedItem, 0);
        expect(result[1].packedItems[0]).toEqual(packedItem);
        expect(result[1].packedItems[1]).toEqual(pi2);
    });

    it("updatePackedItemLogic updates a packed item", () => {
        const updated = { ...packedItem, quantity: 5 };
        const categories = { 1: { ...cat, packedItems: [packedItem] } };
        const result = updatePackedItemLogic(categories, 1, updated);
        expect(result[1].packedItems[0].quantity).toBe(5);
    });

    it("deletePackedItemLogic removes a packed item", () => {
        const categories = { 1: { ...cat, packedItems: [packedItem] } };
        const result = deletePackedItemLogic(categories, 1, "p1");
        expect(result[1].packedItems).toHaveLength(0);
    });

    it("movePackedItemLogic moves a packed item between categories", () => {
        const pi2 = { ...packedItem, id: "p2" };
        const categories = {
            1: { ...cat, packedItems: [packedItem] },
            2: { ...cat, id: 2, packedItems: [pi2] },
        };
        const result = movePackedItemLogic(categories, 1, 2, "p1", 1);
        expect(result[1].packedItems).toHaveLength(0);
        expect(result[2].packedItems[1]).toEqual(packedItem);
        expect(categories[1].packedItems).toEqual([packedItem]);
        expect(categories[2].packedItems).toEqual([pi2]);
    });

    it("movePackedItemLogic reorders within a category without mutating its input", () => {
        const pi2 = { ...packedItem, id: "p2" };
        const pi3 = { ...packedItem, id: "p3" };
        const category = { ...cat, packedItems: [packedItem, pi2, pi3] };
        Object.freeze(category.packedItems);
        Object.freeze(category);
        const categories = { 1: category };
        const result = movePackedItemLogic(categories, 1, 1, "p1", 3);
        expect(result[1].packedItems).toEqual([pi2, pi3, packedItem]);
        expect(categories[1].packedItems).toEqual([packedItem, pi2, pi3]);
    });

    it("movePackedItemLogic leaves the source intact when a destination is invalid", () => {
        const categories = {
            1: { ...cat, packedItems: [packedItem] },
            2: { ...cat, id: 2, packedItems: [] },
        };
        expect(() => movePackedItemLogic(categories, 1, 2, "p1", 1)).toThrow("out of bounds");
        expect(categories[1].packedItems).toEqual([packedItem]);
        expect(categories[2].packedItems).toEqual([]);
        expect(movePackedItemLogic(categories, 1, 999, "p1", 0)).toBe(categories);
    });
});

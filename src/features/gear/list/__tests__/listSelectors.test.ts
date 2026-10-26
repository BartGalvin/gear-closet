import {
    selectAllLists,
    selectCategoriesForList,
} from "../listSelectors";
import type { List } from "../types";
import type { Category } from "../../category/types";

describe("listSelectors", () => {
    const lists: Record<number, List> = {
        1: { id: 1, name: "Trip", categoryIds: [2, 3] },
        2: { id: 2, name: "Backup", categoryIds: [4] },
    };
    const categories: Record<number, Category> = {
        2: { id: 2, listId: 1, name: "A", packedItems: [] },
        3: { id: 3, listId: 1, name: "B", packedItems: [] },
        4: { id: 4, listId: 2, name: "C", packedItems: [] },
    };

    it("selectAllLists returns all lists", () => {
        expect(selectAllLists(lists)).toHaveLength(2);
    });

    it("selectCategoriesForList returns categories for a list", () => {
        expect(selectCategoriesForList(lists, categories, 1)).toHaveLength(2);
        expect(selectCategoriesForList(lists, categories, 2)).toHaveLength(1);
        expect(selectCategoriesForList(lists, categories, 999)).toEqual([]);
    });

    it("selectCategoriesForList skips missing categories", () => {
        const listsWithMissing = { 1: { id: 1, name: "Trip", categoryIds: [2, 99] } };
        expect(selectCategoriesForList(listsWithMissing, categories, 1)).toHaveLength(1);
    });
});
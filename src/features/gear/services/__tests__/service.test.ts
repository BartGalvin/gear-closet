import * as itemService from "../itemService";
import * as categoryService from "../categoryService";
import * as listService from "../listService";
import * as packedItemService from "../packedItemService";
import { resetItemSeq } from "../itemService";
import { resetCatSeq } from "../categoryService";
import { resetListSeq } from "../listService";
import { items, categories, lists } from "../../repositories/inMemoryRepository";

beforeEach(async () => {
    await items.clear();
    await categories.clear();
    await lists.clear();
    resetItemSeq();
    resetCatSeq();
    resetListSeq();
});

describe("itemService", () => {
    it("creates, gets, updates, and deletes an item", async () => {
        const item = await itemService.createItem({ name: "Tent" });
        expect(item.name).toBe("Tent");
        const fetched = await itemService.getItem(item.id);
        expect(fetched.id).toBe(item.id);

        const updated = await itemService.updateItem({ id: item.id, name: "Updated Tent" });
        expect(updated.name).toBe("Updated Tent");

        const { deletedItem } = await itemService.deleteItem(item.id);
        expect(deletedItem.id).toBe(item.id);
        await expect(itemService.getItem(item.id)).rejects.toThrow();
    });

    it("getItems returns all items", async () => {
        await itemService.createItem({ name: "A" });
        await itemService.createItem({ name: "B" });
        const all = await itemService.getItems();
        expect(all.length).toBe(2);
    });

    it("getUniqueItemName returns unique names", async () => {
        await itemService.createItem({ name: "Tent" });
        const unique = await itemService.getUniqueItemName("Tent");
        expect(unique).toMatch(/Tent \(\d+\)/);
    });
});

describe("listService", () => {
    it("creates, gets, updates, and deletes a list", async () => {
        const list = await listService.createList({ name: "Trip" });
        expect(list.name).toBe("Trip");
        const fetched = await listService.getList(list.id);
        expect(fetched.id).toBe(list.id);

        const updated = await listService.updateList({ ...list, name: "Updated Trip" });
        expect(updated.name).toBe("Updated Trip");

        const deleted = await listService.deleteList(list.id);
        expect(deleted.id).toBe(list.id);
        await expect(listService.getList(list.id)).rejects.toThrow();
    });

    it("getLists returns all lists", async () => {
        await listService.createList({ name: "A" });
        await listService.createList({ name: "B" });
        const all = await listService.getLists();
        expect(all.length).toBe(2);
    });

    it("moveCategory reorders categoryIds", async () => {
        const list = await listService.createList({ name: "Trip", categoryIds: [1, 2, 3] });
        const moved = await listService.moveCategory(list.id, 3, 0);
        expect(moved.categoryIds[0]).toBe(3);
    });
});

describe("categoryService", () => {
    it("creates, gets, updates, and deletes a category", async () => {
        const list = await listService.createList({ name: "Trip" });
        const cat = await categoryService.createCategory(list.id, { name: "Shelter" });
        expect(cat.name).toBe("Shelter");
        const fetched = await categoryService.getCategory(cat.id);
        expect(fetched.id).toBe(cat.id);

        const updated = await categoryService.updateCategory({ ...cat, name: "Updated Shelter" });
        expect(updated.name).toBe("Updated Shelter");

        const deleted = await categoryService.deleteCategory(cat.id);
        expect(deleted.id).toBe(cat.id);
        await expect(categoryService.getCategory(cat.id)).rejects.toThrow();
    });

    it("getCategories returns all categories", async () => {
        const list = await listService.createList({ name: "Trip" });
        await categoryService.createCategory(list.id, { name: "A" });
        await categoryService.createCategory(list.id, { name: "B" });
        const all = await categoryService.getCategories();
        expect(all.length).toBe(2);
    });

    it("getCategoriesByList returns only categories for the list", async () => {
        const list1 = await listService.createList({ name: "Trip1" });
        const list2 = await listService.createList({ name: "Trip2" });
        await categoryService.createCategory(list1.id, { name: "A" });
        await categoryService.createCategory(list2.id, { name: "B" });
        const cats1 = await categoryService.getCategoriesByList(list1.id);
        expect(cats1.length).toBe(1);
        expect(cats1[0].listId).toBe(list1.id);
    });

    it("getUniqueCategoryName returns unique names", async () => {
        const list = await listService.createList({ name: "Trip" });
        await categoryService.createCategory(list.id, { name: "Shelter" });
        const unique = await categoryService.getUniqueCategoryName("Shelter", list.id);
        expect(unique).toMatch(/Shelter \(\d+\)/);
    });
});

describe("packedItemService", () => {
    it("creates, gets, updates, moves, and deletes a packed item", async () => {
        const list = await listService.createList({ name: "Trip" });
        const cat1 = await categoryService.createCategory(list.id, { name: "A" });
        const cat2 = await categoryService.createCategory(list.id, { name: "B" });
        const item = await itemService.createItem({ name: "Tent" });

        const { packedItem } = await packedItemService.createPackedItem(cat1.id, item.id, { quantity: 2 });
        expect(packedItem.itemId).toBe(item.id);

        const fetched = await packedItemService.getPackedItem(cat1.id, packedItem.id);
        expect(fetched.id).toBe(packedItem.id);

        await packedItemService.updatePackedItem(cat1.id, { ...packedItem, quantity: 5 });
        const updated = await packedItemService.getPackedItem(cat1.id, packedItem.id);
        expect(updated.quantity).toBe(5);

        await packedItemService.movePackedItem(cat1.id, cat2.id, packedItem.id, 0);
        const inCat2 = await packedItemService.getPackedItem(cat2.id, packedItem.id);
        expect(inCat2.id).toBe(packedItem.id);

        const { removed } = await packedItemService.removePackedItem(cat2.id, packedItem.id);
        expect(removed.id).toBe(packedItem.id);
        await expect(packedItemService.getPackedItem(cat2.id, packedItem.id)).rejects.toThrow();
    });

    it("getPackedItems returns all packed items for a category", async () => {
        const list = await listService.createList({ name: "Trip" });
        const cat = await categoryService.createCategory(list.id, { name: "A" });
        const item1 = await itemService.createItem({ name: "Tent" });
        const item2 = await itemService.createItem({ name: "Stove" });
        await packedItemService.createPackedItem(cat.id, item1.id, {});
        await packedItemService.createPackedItem(cat.id, item2.id, {});
        const packed = await packedItemService.getPackedItems(cat.id);
        expect(packed.length).toBe(2);
    });
});
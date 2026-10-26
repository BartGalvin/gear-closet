import { vi } from "vitest";
import { categories, items, lists } from "../../repositories/inMemoryRepository";
import * as categoryService from "../categoryService";
import * as itemService from "../itemService";
import * as listService from "../listService";
import * as packedItemService from "../packedItemService";
import { readGearSnapshot } from "../gearStore";

beforeEach(async () => {
  await items.clear();
  await categories.clear();
  await lists.clear();
  itemService.resetItemSeq();
  categoryService.resetCatSeq();
  listService.resetListSeq();
});

afterEach(() => vi.restoreAllMocks());

async function createTrip() {
  const list = await listService.createList({ name: "Trip" });
  const from = await categoryService.createCategory(list.id, { name: "Shelter" });
  const to = await categoryService.createCategory(list.id, { name: "Clothing" });
  const item = await itemService.createItem({ name: "Tent" });
  return { list, from, to, item };
}

describe("serialized gear commands", () => {
  it("converts the latest saved weight on a unit-only edit, and accepts an explicit replacement measurement", async () => {
    const item = await itemService.createItem({ weight: 500.12345, unit: "g" });
    expect(item.weight).toBe(500.12);
    const [, converted] = await Promise.all([
      itemService.updateItem({ id: item.id, weight: 1250.23456 }),
      itemService.updateItem({ id: item.id, unit: "kg" }),
    ]);
    expect(converted).toMatchObject({ weight: 1.25, unit: "kg" });
    expect(await itemService.getItem(item.id)).toEqual(converted);

    expect(await itemService.updateItem({ id: item.id, weight: 2.3456, unit: "lb" }))
      .toMatchObject({ weight: 2.35, unit: "lb" });
    expect(await itemService.updateItem({ id: item.id, unit: "oz" }))
      .toMatchObject({ weight: 37.6, unit: "oz" });
    expect(await itemService.updateItem({ id: item.id, weight: 1.005 }))
      .toMatchObject({ weight: 1.01, unit: "oz" });
  });

  it("keeps defaults when creation options explicitly contain undefined", async () => {
    const list = await listService.createList({ name: "Trip" });
    const category = await categoryService.createCategory(list.id, { name: "Shelter" });
    const created = await itemService.createItemInCategory(
      category.id,
      { weight: undefined, tags: undefined, unit: undefined },
      { quantity: undefined, worn: undefined, star: undefined },
    );

    expect(created.item).toMatchObject({ weight: 0, tags: [], unit: "g" });
    expect(created.packedItem).toMatchObject({ quantity: 1, worn: false, star: "none" });
    expect(await itemService.getItem(created.item.id)).toEqual(created.item);
    expect(await packedItemService.getPackedItem(category.id, created.packedItem.id))
      .toEqual(created.packedItem);
  });

  it("keeps every concurrently created category and assigns unique names and IDs", async () => {
    const list = await listService.createList({ name: "Trip" });
    const created = await Promise.all(Array.from({ length: 3 }, () =>
      categoryService.createCategory(list.id, { name: "Gear" }),
    ));

    expect(new Set(created.map((category) => category.id)).size).toBe(3);
    expect(created.map((category) => category.name)).toEqual(["Gear", "Gear (1)", "Gear (2)"]);
    expect((await listService.getList(list.id)).categoryIds).toEqual(created.map((category) => category.id));
  });

  it("keeps every concurrent placement with its own ID", async () => {
    const { from, item } = await createTrip();
    const created = await Promise.all(Array.from({ length: 3 }, () =>
      packedItemService.createPackedItem(from.id, item.id),
    ));
    const placements = created.map(({ packedItem }) => packedItem);

    expect(new Set(placements.map((packedItem) => packedItem.id)).size).toBe(3);
    expect(await packedItemService.getPackedItems(from.id)).toEqual(placements);
  });

  it("creates an item and its placement together during concurrent commands", async () => {
    const { from } = await createTrip();
    const created = await Promise.all([
      itemService.createItemInCategory(from.id, { name: "Stove" }),
      itemService.createItemInCategory(from.id, { name: "Stove" }),
    ]);

    expect(created.map(({ item }) => item.name)).toEqual(["Stove", "Stove (1)"]);
    expect(await packedItemService.getPackedItems(from.id)).toEqual(created.map(({ packedItem }) => packedItem));
    expect((await itemService.getItemsByCategory(from.id)).map((item) => item.id))
      .toEqual(created.map(({ item }) => item.id));
  });

  it("keeps current relationships when a stale list or category is renamed", async () => {
    const list = await listService.createList({ name: "Trip" });
    const category = await categoryService.createCategory(list.id, { name: "Shelter" });
    const { packedItem } = await itemService.createItemInCategory(category.id, { name: "Tent" });

    const renamedList = await listService.updateList({ ...list, name: "Weekend" });
    const renamedCategory = await categoryService.updateCategory({ ...category, name: "Camp" });

    expect(renamedList).toEqual({ ...list, name: "Weekend", categoryIds: [category.id] });
    expect(renamedCategory).toEqual({ ...category, name: "Camp", packedItems: [packedItem] });
  });

  it("rejects category reassignment without disturbing either list", async () => {
    const { list, from } = await createTrip();
    const otherList = await listService.createList({ name: "Other" });
    const before = await readGearSnapshot();

    await expect(categoryService.updateCategory({ ...from, listId: otherList.id }))
      .rejects.toThrow("Changing a category's list");
    expect(await readGearSnapshot()).toEqual(before);
    expect((await listService.getList(list.id)).categoryIds).toContain(from.id);
  });

  it("merges concurrent edits to separate placement fields", async () => {
    const { from, item } = await createTrip();
    const { packedItem } = await packedItemService.createPackedItem(from.id, item.id);

    await Promise.all([
      packedItemService.updatePackedItem(from.id, { id: packedItem.id, quantity: 3 }),
      packedItemService.updatePackedItem(from.id, { id: packedItem.id, worn: true }),
    ]);

    expect(await packedItemService.getPackedItem(from.id, packedItem.id))
      .toEqual({ ...packedItem, quantity: 3, worn: true });
  });

  it("rejects a placement's inventory-item reassignment", async () => {
    const { from, item } = await createTrip();
    const other = await itemService.createItem({ name: "Stove" });
    const { packedItem } = await packedItemService.createPackedItem(from.id, item.id);

    await expect(packedItemService.updatePackedItem(from.id, { id: packedItem.id, itemId: other.id }))
      .rejects.toThrow("Changing a packed item's inventory item");
    expect(await packedItemService.getPackedItem(from.id, packedItem.id)).toEqual(packedItem);
  });

  it("returns categories in the list's current order", async () => {
    const { list, from, to } = await createTrip();
    await listService.moveCategory(list.id, to.id, 0);
    expect((await categoryService.getCategoriesByList(list.id)).map((category) => category.id))
      .toEqual([to.id, from.id]);
  });

  it("deletes a category from its owning list while preserving other lists and shared inventory", async () => {
    const { list, from, to, item } = await createTrip();
    const last = await categoryService.createCategory(list.id, { name: "Kitchen" });
    const otherList = await listService.createList({ name: "Weekend" });
    const otherCategory = await categoryService.createCategory(otherList.id, { name: "Shelter" });
    await packedItemService.createPackedItem(to.id, item.id);
    const { packedItem } = await packedItemService.createPackedItem(otherCategory.id, item.id);

    await categoryService.deleteCategory(to.id);

    expect((await listService.getList(list.id)).categoryIds).toEqual([from.id, last.id]);
    expect((await listService.getList(otherList.id)).categoryIds).toEqual([otherCategory.id]);
    expect(await categoryService.getCategory(otherCategory.id))
      .toEqual({ ...otherCategory, packedItems: [packedItem] });
    await expect(categoryService.getCategory(to.id)).rejects.toThrow("not found");
    expect(await itemService.getItem(item.id)).toEqual(item);
  });

  it("restores both categories after a move's second write fails, then runs later commands", async () => {
    const { from, to, item } = await createTrip();
    const { packedItem } = await packedItemService.createPackedItem(from.id, item.id);
    const before = await readGearSnapshot();
    const save = categories.save.bind(categories);
    vi.spyOn(categories, "save")
      .mockImplementationOnce(save)
      .mockRejectedValueOnce(new Error("Destination write failed"));

    const failedMove = packedItemService.movePackedItem(from.id, to.id, packedItem.id, 0);
    const laterEdit = itemService.updateItem({ id: item.id, name: "Renamed Tent" });
    const snapshot = readGearSnapshot();
    const results = await Promise.allSettled([failedMove, laterEdit]);

    expect(results[0]).toMatchObject({ status: "rejected", reason: new Error("Destination write failed") });
    expect(results[1].status).toBe("fulfilled");
    expect(await snapshot).toEqual({
      ...before,
      items: [{ ...item, name: "Renamed Tent" }],
    });
  });

  it("does not leave an orphan item when placement creation fails", async () => {
    const { from } = await createTrip();
    const before = await readGearSnapshot();
    vi.spyOn(categories, "save").mockRejectedValueOnce(new Error("Placement write failed"));

    await expect(itemService.createItemInCategory(from.id, { name: "Stove" }))
      .rejects.toThrow("Placement write failed");
    expect(await readGearSnapshot()).toEqual(before);

    const created = await itemService.createItemInCategory(from.id, { name: "Stove" });
    expect(created.item.name).toBe("Stove");
    expect(await itemService.getItemsByCategory(from.id)).toEqual([created.item]);
  });

  it("restores the parent list when category creation fails", async () => {
    const list = await listService.createList({ name: "Trip" });
    vi.spyOn(categories, "save").mockRejectedValueOnce(new Error("Category write failed"));

    await expect(categoryService.createCategory(list.id, { name: "Shelter" }))
      .rejects.toThrow("Category write failed");
    expect(await listService.getList(list.id)).toEqual(list);
    expect(await categoryService.getCategories()).toEqual([]);
  });
});

describe("placement commands", () => {
  it("preserves a placement's ID and attributes across same- and cross-category moves", async () => {
    const { from, to, item } = await createTrip();
    const first = (await packedItemService.createPackedItem(from.id, item.id, { quantity: 3, worn: true })).packedItem;
    const second = (await packedItemService.createPackedItem(from.id, item.id)).packedItem;

    await packedItemService.movePackedItem(from.id, from.id, first.id, 2);
    expect(await packedItemService.getPackedItems(from.id)).toEqual([second, first]);
    await packedItemService.movePackedItem(from.id, to.id, first.id, 0);
    expect(await packedItemService.getPackedItems(from.id)).toEqual([second]);
    expect(await packedItemService.getPackedItems(to.id)).toEqual([first]);
  });

  it("accepts insertion into an empty category and at the current length", async () => {
    const { from, item } = await createTrip();
    const first = (await packedItemService.createPackedItem(from.id, item.id, {}, 0)).packedItem;
    const second = (await packedItemService.createPackedItem(from.id, item.id, {}, 1)).packedItem;
    expect(await packedItemService.getPackedItems(from.id)).toEqual([first, second]);
  });

  it.each([-1, 1, 0.5, NaN])("preserves the source when destination index %s is invalid", async (index) => {
    const { from, to, item } = await createTrip();
    await packedItemService.createPackedItem(from.id, item.id);
    const [packedItem] = await packedItemService.getPackedItems(from.id);
    const before = await readGearSnapshot();

    await expect(packedItemService.movePackedItem(from.id, to.id, packedItem.id, index))
      .rejects.toThrow("out of bounds");
    expect(await readGearSnapshot()).toEqual(before);
  });

  it("preserves the source when the target category is absent", async () => {
    const { from, item } = await createTrip();
    const { packedItem } = await packedItemService.createPackedItem(from.id, item.id);
    const before = await readGearSnapshot();

    await expect(packedItemService.movePackedItem(from.id, 999, packedItem.id, 0)).rejects.toThrow("not found");
    expect(await readGearSnapshot()).toEqual(before);
  });

  it("removes one placement without deleting shared inventory", async () => {
    const { from, to, item } = await createTrip();
    const first = await packedItemService.createPackedItem(from.id, item.id);
    const second = await packedItemService.createPackedItem(to.id, item.id);

    await packedItemService.removePackedItem(from.id, first.packedItem.id);

    expect(await packedItemService.getPackedItems(from.id)).toEqual([]);
    expect(await packedItemService.getPackedItems(to.id)).toEqual([second.packedItem]);
    expect(await itemService.getItem(item.id)).toEqual(item);
  });

  it("returns every affected category when inventory is explicitly deleted", async () => {
    const { from, to, item } = await createTrip();
    await packedItemService.createPackedItem(from.id, item.id);
    await packedItemService.createPackedItem(to.id, item.id);

    const deleted = await itemService.deleteItem(item.id);
    expect(deleted.updatedCategories).toEqual([from, to]);
    expect(await categoryService.getCategories()).toEqual([from, to]);
    await expect(itemService.getItem(item.id)).rejects.toThrow("not found");
  });
});

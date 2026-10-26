import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import { GearProvider as ApiGearProvider } from "../GearProvider";
import { memoryGearApi } from "../../fixtures/memoryGearApi";
import { useGear } from "../../hooks/useGear";
import { resetMockData } from "../../fixtures/mockService";
import { createList } from "../../services/listService";
import { createCategory } from "../../services/categoryService";
import { createItem, createItemInCategory } from "../../services/itemService";
import { readGearSnapshot } from "../../services/gearStore";
import { categories, items } from "../../repositories/inMemoryRepository";

beforeEach(resetMockData);
afterEach(() => vi.restoreAllMocks());

it("reads only from the injected backend, independently of the memory repositories", async () => {
  await createList({ name: "Memory-only list" });
  const snapshot = { lists: [{ id: 99, name: "External backend", categoryIds: [] }], categories: [], items: [] };
  const api = { ...memoryGearApi, readSnapshot: vi.fn().mockResolvedValue(snapshot) };
  const { result } = renderHook(useGear, {
    wrapper: ({ children }) => <ApiGearProvider api={api}>{children}</ApiGearProvider>,
  });
  await act(() => result.current.refresh());
  expect(result.current.getLists()).toEqual(snapshot.lists);
  expect(api.readSnapshot).toHaveBeenCalledOnce();
});

it("keeps both successful concurrent creates in the UI and storage", async () => {
  const list = await createList({ name: "Trip" });
  const first = await createCategory(list.id, { name: "Shelter" });
  const second = await createCategory(list.id, { name: "Carry" });
  const { result } = renderHook(useGear, { wrapper: GearProvider });
  await act(async () => {
    await Promise.all([
      result.current.createPackedItem(first.id, { name: "Tent" }, {}),
      result.current.createPackedItem(second.id, { name: "Pack" }, {}),
    ]);
  });

  expect(result.current.getItems().map((item) => item.name)).toEqual(["Tent", "Pack"]);
  expect(result.current.categories[first.id].packedItems).toHaveLength(1);
  expect(result.current.categories[second.id].packedItems).toHaveLength(1);
  expect(Object.values(result.current.items)).toEqual((await readGearSnapshot()).items);
});

it("a failed edit preserves another successful edit", async () => {
  const first = await createItem({ name: "Tent" });
  const second = await createItem({ name: "Pack" });
  const { result } = renderHook(useGear, { wrapper: GearProvider });
  await act(() => result.current.refresh());
  const save = items.save.bind(items);
  vi.spyOn(items, "save").mockImplementation(async (item) => {
    if (item.id === first.id) throw new Error("Save failed");
    await save(item);
  });

  await act(async () => {
    const outcomes = await Promise.allSettled([
      result.current.updateItem({ id: second.id, name: "Updated Pack" }),
      result.current.updateItem({ id: first.id, name: "Updated Tent" }),
    ]);
    expect(outcomes.map((outcome) => outcome.status)).toEqual(["fulfilled", "rejected"]);
  });
  expect(result.current.items[first.id].name).toBe("Tent");
  expect(result.current.items[second.id].name).toBe("Updated Pack");
  expect(Object.values(result.current.items)).toEqual((await readGearSnapshot()).items);
});

it("failed item-and-placement creation leaves no orphan item or UI change", async () => {
  const list = await createList({ name: "Trip" });
  const category = await createCategory(list.id, { name: "Shelter" });
  const { result } = renderHook(useGear, { wrapper: GearProvider });
  await act(() => result.current.refresh());
  const before = await readGearSnapshot();
  vi.spyOn(categories, "save").mockRejectedValueOnce(new Error("Save failed"));

  await act(async () => {
    await expect(result.current.createPackedItem(category.id, { name: "Tent" }, {}))
      .rejects.toThrow("Save failed");
  });
  expect(result.current.getItems()).toEqual(before.items);
  expect(result.current.categories[category.id].packedItems).toEqual([]);
  expect(await readGearSnapshot()).toEqual(before);
});

it("moves a placement with its identity and inventory item intact", async () => {
  const list = await createList({ name: "Trip" });
  const source = await createCategory(list.id, { name: "Shelter" });
  const target = await createCategory(list.id, { name: "Carry" });
  const { item, packedItem } = await createItemInCategory(source.id, { name: "Tent" }, { quantity: 2 });
  const { result } = renderHook(useGear, { wrapper: GearProvider });
  await act(() => result.current.refresh());
  const originalCategory = result.current.categories[source.id];

  await act(() => result.current.movePackedItem(source.id, target.id, packedItem.id, 0));
  expect(result.current.categories[source.id].packedItems).toEqual([]);
  expect(result.current.categories[target.id].packedItems).toEqual([packedItem]);
  expect(result.current.items[item.id]).toEqual(item);
  expect(originalCategory.packedItems).toEqual([packedItem]);
});

it("deleting a selected list removes its categories and selects another list", async () => {
  const first = await createList({ name: "Trip" });
  const second = await createList({ name: "Weekend" });
  const category = await createCategory(first.id, { name: "Shelter" });
  const { result } = renderHook(useGear, { wrapper: GearProvider });
  await act(() => result.current.refresh());
  expect(result.current.selectedListId).toBe(first.id);

  await act(() => result.current.deleteList(first.id));
  expect(result.current.selectedListId).toBe(second.id);
  expect(result.current.categories[category.id]).toBeUndefined();
  await act(() => result.current.deleteList(second.id));
  expect(result.current.selectedListId).toBeNull();
  expect(result.current.getLists()).toEqual([]);
});

it("keeps the user's list selection when unrelated data changes", async () => {
  await createList({ name: "Trip" });
  const second = await createList({ name: "Weekend" });
  const { result } = renderHook(useGear, { wrapper: GearProvider });
  await act(() => result.current.refresh());
  act(() => result.current.setSelectedListId(second.id));
  await act(() => result.current.createItem({ name: "Tent" }));
  expect(result.current.selectedListId).toBe(second.id);
});

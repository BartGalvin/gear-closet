import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { usePackedItems } from "../usePackedItem";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import { resetMockData } from "../../fixtures/mockService";
import { createList } from "../../services/listService";
import { createCategory } from "../../services/categoryService";
import { createItem } from "../../services/itemService";
import { getPackedItems } from "../../services/packedItemService";

beforeEach(resetMockData);

it("creates an item and placement, then patches and removes only its placement", async () => {
  const list = await createList({ name: "Trip" });
  const category = await createCategory(list.id, { name: "Shelter" });
  const { result } = renderHook(usePackedItems, { wrapper: GearProvider });
  await act(() => result.current.createPackedItem(category.id, { name: "Tent" }, { quantity: 2 }));
  const [placement] = result.current.getPackedItemsForCategory(category.id);
  expect(placement.quantity).toBe(2);
  await act(() => result.current.updatePackedItem(category.id, { id: placement.id, worn: true }));
  expect(result.current.getPackedItemsForCategory(category.id)[0]).toMatchObject({ quantity: 2, worn: true });
  await act(() => result.current.deletePackedItem(category.id, placement.id));
  expect(result.current.getPackedItemsForCategory(category.id)).toEqual([]);
  expect(await getPackedItems(category.id)).toEqual([]);
});

it("adds existing inventory and moves its placement with the same identity", async () => {
  const list = await createList({ name: "Trip" });
  const first = await createCategory(list.id, { name: "Shelter" });
  const second = await createCategory(list.id, { name: "Carry" });
  const item = await createItem({ name: "Tent" });
  const { result } = renderHook(usePackedItems, { wrapper: GearProvider });
  await act(() => result.current.addPackedItem(first.id, item.id, { quantity: 2 }, 0));
  const [placement] = result.current.getPackedItemsForCategory(first.id);
  await act(() => result.current.movePackedItem(first.id, second.id, placement.id, 0));
  expect(result.current.getPackedItemsForCategory(first.id)).toEqual([]);
  expect(result.current.getPackedItemsForCategory(second.id)).toEqual([placement]);
  expect(await getPackedItems(second.id)).toEqual([placement]);
});

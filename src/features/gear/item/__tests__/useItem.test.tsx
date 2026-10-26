import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { useItems } from "../useItem";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import { resetMockData } from "../../fixtures/mockService";
import { createItem, getItem } from "../../services/itemService";

beforeEach(resetMockData);

it("loads inventory items from storage", async () => {
  const item = await createItem({ name: "Tent" });
  const { result } = renderHook(useItems, { wrapper: GearProvider });
  await act(() => result.current.fetchItems());
  expect(result.current.getItems()).toEqual([item]);
});

it("creates, patches, and deletes an item", async () => {
  const { result } = renderHook(useItems, { wrapper: GearProvider });
  await act(() => result.current.createItem({ name: "Tent", weight: 1000 }));
  const [item] = result.current.getItems();
  await act(() => result.current.updateItem({ id: item.id, name: "Updated Tent" }));
  expect(result.current.items[item.id]).toMatchObject({ name: "Updated Tent", weight: 1000 });
  expect(await getItem(item.id)).toEqual(result.current.items[item.id]);
  await act(() => result.current.deleteItem(item.id));
  expect(result.current.getItems()).toEqual([]);
  await expect(getItem(item.id)).rejects.toThrow();
});

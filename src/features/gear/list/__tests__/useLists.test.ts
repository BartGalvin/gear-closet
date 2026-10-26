import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { useLists } from "../useLists";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import { resetMockData } from "../../fixtures/mockService";
import { createList, getList } from "../../services/listService";
import { createCategory } from "../../services/categoryService";

beforeEach(resetMockData);

it("loads lists from storage", async () => {
  const list = await createList({ name: "Trip" });
  const { result } = renderHook(useLists, { wrapper: GearProvider });
  await act(() => result.current.fetchLists());
  expect(result.current.getLists()).toEqual([list]);
  expect(result.current.selectedListId).toBe(list.id);
});

it("creates, renames, and deletes a list", async () => {
  const { result } = renderHook(useLists, { wrapper: GearProvider });
  await act(() => result.current.createList({ name: "Trip" }));
  const [list] = result.current.getLists();
  await act(() => result.current.updateList({ id: list.id, name: "Weekend" }));
  expect(result.current.lists[list.id].name).toBe("Weekend");
  expect((await getList(list.id)).name).toBe("Weekend");
  await act(() => result.current.deleteList(list.id));
  expect(result.current.getLists()).toEqual([]);
});

it("reorders actual categories in the UI and storage", async () => {
  const list = await createList({ name: "Trip" });
  const first = await createCategory(list.id, { name: "Shelter" });
  const second = await createCategory(list.id, { name: "Kitchen" });
  const { result } = renderHook(useLists, { wrapper: GearProvider });
  await act(() => result.current.moveCategory(list.id, second.id, 0));
  expect(result.current.lists[list.id].categoryIds).toEqual([second.id, first.id]);
  expect((await getList(list.id)).categoryIds).toEqual([second.id, first.id]);
});

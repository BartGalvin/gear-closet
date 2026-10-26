import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { useCategories } from "../useCategory";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import { resetMockData } from "../../fixtures/mockService";
import { createList, getList } from "../../services/listService";
import { createCategory, getCategory } from "../../services/categoryService";

beforeEach(resetMockData);

it("loads categories from storage", async () => {
  const list = await createList({ name: "Trip" });
  const category = await createCategory(list.id, { name: "Shelter" });
  const { result } = renderHook(useCategories, { wrapper: GearProvider });
  await act(() => result.current.fetchCategories());
  expect(result.current.categories[category.id]).toEqual(category);
});

it("creates and renames a category, then removes its list membership on delete", async () => {
  const list = await createList({ name: "Trip" });
  const { result } = renderHook(useCategories, { wrapper: GearProvider });
  await act(() => result.current.createCategory(list.id, { name: "Shelter" }));
  const [category] = Object.values(result.current.categories);
  expect((await getList(list.id)).categoryIds).toEqual([category.id]);
  await act(() => result.current.updateCategory({ id: category.id, name: "Sleep" }));
  expect(result.current.categories[category.id].name).toBe("Sleep");
  expect((await getCategory(category.id)).name).toBe("Sleep");
  await act(() => result.current.deleteCategory(category.id));
  expect(result.current.categories[category.id]).toBeUndefined();
  expect((await getList(list.id)).categoryIds).toEqual([]);
});

it("rejects category creation for a missing list", async () => {
  const { result } = renderHook(useCategories, { wrapper: GearProvider });
  await act(async () => {
    await expect(result.current.createCategory(999, { name: "Shelter" })).rejects.toThrow();
  });
  expect(result.current.categories).toEqual({});
});

import type { DndContextProps } from "@dnd-kit/core";
import { vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import type { GearContextType } from "../../context/types";
import { resetMockData } from "../../fixtures/mockService";
import { useGear } from "../../hooks/useGear";
import { categories } from "../../repositories/inMemoryRepository";
import * as services from "../../services";
import type { DragData, PackedItem } from "../../types";
import GearDnDContext from "../GearDnDContext";

const dnd = vi.hoisted(() => ({
  onDragEnd: undefined as DndContextProps["onDragEnd"],
}));

// Exercise the real commands while supplying drop metadata without browser geometry.
vi.mock("@dnd-kit/core", async (importOriginal) => ({
  ...await importOriginal<typeof import("@dnd-kit/core")>(),
  DndContext: (props: DndContextProps) => {
    dnd.onDragEnd = (event) => props.onDragEnd?.(event);
    return props.children;
  },
}));

let gear: GearContextType;

function CaptureGear() {
  gear = useGear();
  return null;
}

async function renderBoard() {
  render(
    <GearProvider>
      <CaptureGear />
      <GearDnDContext><div>Board</div></GearDnDContext>
    </GearProvider>,
  );
  await act(() => gear.refresh());
}

function endDrag(drag: DragData, drop: DragData) {
  dnd.onDragEnd?.({
    activatorEvent: new Event("pointerup"),
    active: {
      id: "drag",
      data: { current: drag },
      rect: { current: { initial: null, translated: null } },
    },
    over: {
      id: "drop",
      data: { current: drop },
      rect: { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 },
      disabled: false,
    },
    collisions: null,
    delta: { x: 0, y: 0 },
  });
}

function placementData(categoryId: number, packedItem: PackedItem): DragData {
  return { type: "packed-item", categoryId, packedItemId: packedItem.id, itemId: packedItem.itemId };
}

beforeEach(async () => {
  await resetMockData();
});

afterEach(() => vi.restoreAllMocks());

async function seedBoard() {
  const list = await services.createList({ name: "Trip" });
  const source = await services.createCategory(list.id, { name: "Shelter" });
  const target = await services.createCategory(list.id, { name: "Clothing" });
  const item = await services.createItem({ name: "Tarp" });
  const first = (await services.createPackedItem(source.id, item.id, {
    quantity: 2, worn: true, consumable: true, star: "red",
  })).packedItem;
  const second = (await services.createPackedItem(source.id, item.id)).packedItem;
  return { list, source, target, item, first, second };
}

it("reorders and moves the existing placement without changing its ID or attributes", async () => {
  const { source, target, first, second } = await seedBoard();
  await renderBoard();

  act(() => endDrag(placementData(source.id, first), placementData(source.id, second)));
  await waitFor(() => expect(gear.categories[source.id].packedItems).toEqual([second, first]));

  act(() => endDrag(placementData(source.id, first), { type: "category", categoryId: target.id }));
  await waitFor(() => {
    expect(gear.categories[source.id].packedItems).toEqual([second]);
    expect(gear.categories[target.id].packedItems).toEqual([first]);
  });
  const stored = await services.readGearSnapshot();
  expect(stored.categories.find((category) => category.id === target.id)?.packedItems).toEqual([first]);
});

it("inserts a new placement from the sidebar at the target row", async () => {
  const { source, item, first, second } = await seedBoard();
  await renderBoard();
  act(() => endDrag({ type: "sidebar-item", itemId: item.id }, placementData(source.id, second)));

  await waitFor(() => expect(gear.categories[source.id].packedItems).toHaveLength(3));
  const packedItems = gear.categories[source.id].packedItems;
  expect(packedItems[0]).toEqual(first);
  expect(packedItems[2]).toEqual(second);
  expect(packedItems[1]).toMatchObject({ itemId: item.id, quantity: 1 });
  expect(packedItems[1].id).not.toBe(first.id);
  expect(packedItems[1].id).not.toBe(second.id);
  expect((await services.readGearSnapshot()).items).toEqual([item]);
});

it("commits the previewed gaps when reordering upward and appending within a category", async () => {
  const { source, item, first, second } = await seedBoard();
  const third = (await services.createPackedItem(source.id, item.id)).packedItem;
  await renderBoard();

  act(() => endDrag(placementData(source.id, third), placementData(source.id, first)));
  await waitFor(() => expect(gear.categories[source.id].packedItems).toEqual([third, first, second]));
  act(() => endDrag(placementData(source.id, third), { type: "category", categoryId: source.id }));
  await waitFor(() => expect(gear.categories[source.id].packedItems).toEqual([first, second, third]));
  expect((await services.readGearSnapshot()).categories[0].packedItems).toEqual([first, second, third]);
});

it("reorders categories using the selected list", async () => {
  const { list, source, target } = await seedBoard();
  await renderBoard();
  act(() => endDrag({ type: "category", categoryId: source.id }, { type: "category", categoryId: target.id }));
  await waitFor(() => expect(gear.lists[list.id].categoryIds).toEqual([target.id, source.id]));
  expect((await services.readGearSnapshot()).lists[0].categoryIds).toEqual([target.id, source.id]);
});

it("keeps both categories intact when a cross-category move fails", async () => {
  const { source, target, first, second } = await seedBoard();
  await renderBoard();
  const error = new Error("Save failed");
  const reportError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const save = categories.save.bind(categories);
  vi.spyOn(categories, "save").mockImplementation(async (category) => {
    if (category.id === target.id) throw error;
    await save(category);
  });

  act(() => endDrag(placementData(source.id, first), { type: "category", categoryId: target.id }));
  await waitFor(() => expect(reportError).toHaveBeenCalledWith("Failed to move packed item:", error));
  expect(gear.categories[source.id].packedItems).toEqual([first, second]);
  expect(gear.categories[target.id].packedItems).toEqual([]);
  const stored = await services.readGearSnapshot();
  expect(stored.categories.find((category) => category.id === source.id)?.packedItems).toEqual([first, second]);
  expect(stored.categories.find((category) => category.id === target.id)?.packedItems).toEqual([]);
});

import { describe, expect, it } from "vitest";
import type { Category, DragData, PackedItem } from "../../types";
import { getItemDropTarget } from "../itemDropTarget";

const first: PackedItem = { id: "first", itemId: 1, quantity: 1, worn: false, consumable: false, star: "none" };
const second: PackedItem = { ...first, id: "second", itemId: 2 };
const third: PackedItem = { ...first, id: "third", itemId: 3 };
const categories: Record<number, Category> = {
  1: { id: 1, listId: 1, name: "Shelter", packedItems: [first, second, third] },
  2: { id: 2, listId: 1, name: "Kitchen", packedItems: [] },
};
const fromSidebar: DragData = { type: "sidebar-item", itemId: 4 };
const row = (packedItem: PackedItem): DragData => ({
  type: "packed-item", categoryId: 1, packedItemId: packedItem.id, itemId: packedItem.itemId,
});
const body = (categoryId: number): DragData => ({ type: "category", categoryId });

describe("item drop targets", () => {
  it("previews a catalog copy before the hovered row or at the end of a category", () => {
    expect(getItemDropTarget(fromSidebar, row(first), categories)).toEqual({ categoryId: 1, index: 0 });
    expect(getItemDropTarget(fromSidebar, row(second), categories)).toEqual({ categoryId: 1, index: 1 });
    expect(getItemDropTarget(fromSidebar, body(1), categories)).toEqual({ categoryId: 1, index: 3 });
  });

  it("provides the first slot in an empty category for both copies and moves", () => {
    expect(getItemDropTarget(fromSidebar, body(2), categories)).toEqual({ categoryId: 2, index: 0 });
    expect(getItemDropTarget(row(first), body(2), categories)).toEqual({ categoryId: 2, index: 0 });
    expect(categories[1].packedItems).toEqual([first, second, third]);
    expect(categories[2].packedItems).toEqual([]);
  });

  it("shows the correct gap for downward and upward reordering", () => {
    expect(getItemDropTarget(row(first), row(second), categories)).toEqual({ categoryId: 1, index: 2 });
    expect(getItemDropTarget(row(third), row(first), categories)).toEqual({ categoryId: 1, index: 0 });
    expect(getItemDropTarget(row(first), body(1), categories)).toEqual({ categoryId: 1, index: 3 });
  });

  it("does not suggest a move onto itself or an unchanged last position", () => {
    expect(getItemDropTarget(row(first), row(first), categories)).toBeNull();
    expect(getItemDropTarget(row(third), body(1), categories)).toBeNull();
  });

  it("clears the preview outside a target and ignores invalid or category drags", () => {
    expect(getItemDropTarget(fromSidebar, undefined, categories)).toBeNull();
    expect(getItemDropTarget(undefined, body(2), categories)).toBeNull();
    expect(getItemDropTarget(body(1), body(2), categories)).toBeNull();
    expect(getItemDropTarget(fromSidebar, body(999), categories)).toBeNull();
    expect(getItemDropTarget(fromSidebar, row({ ...first, id: "missing" }), categories)).toBeNull();
    expect(getItemDropTarget(row({ ...first, id: "missing" }), body(2), categories)).toBeNull();
  });
});

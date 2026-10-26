import { StrictMode } from "react";
import { vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../../App";
import { memoryGearApi } from "../../fixtures/memoryGearApi";
import { MemoryGearProvider as GearProvider } from "../../fixtures/MemoryGearProvider";
import type { GearContextType } from "../../context/types";
import { loadMockData, resetMockData } from "../../fixtures/mockService";
import { useGear } from "../../hooks/useGear";
import * as services from "../../services";
import GearDashboard from "../layout/GearDashboard";

let gear: GearContextType;

function CaptureGear() {
  gear = useGear();
  return null;
}

function renderDashboard() {
  return render(
    <GearProvider>
      <CaptureGear />
      <GearDashboard />
    </GearProvider>,
  );
}

beforeEach(async () => {
  await resetMockData();
});

it("loads existing data through the API under StrictMode without reseeding", async () => {
  await loadMockData();
  render(<StrictMode><App api={memoryGearApi} /></StrictMode>);
  expect(await screen.findByRole("heading", { name: "Backpacking Trip" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("Tent")).toBeInTheDocument();
  const stored = await services.readGearSnapshot();
  expect(stored.lists).toHaveLength(2);
  expect(stored.categories).toHaveLength(4);
  expect(stored.items).toHaveLength(5);
});

it("shows connection failures and restores the saved workspace when retried", async () => {
  await loadMockData();
  const api = { ...memoryGearApi, readSnapshot: vi.fn().mockRejectedValueOnce(new Error("Server unavailable"))
    .mockImplementation(memoryGearApi.readSnapshot) };
  render(<App api={api} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Reload data" }));
  expect(await screen.findByRole("heading", { name: "Backpacking Trip" })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("renders a populated list after the dashboard starts empty", async () => {
  renderDashboard();
  expect(screen.getByRole("heading", { name: "A little planning. A better trip." })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Create your first list" }));
  expect(await screen.findByRole("heading", { name: "New List" })).toBeInTheDocument();

  fireEvent.click(screen.getByTitle("Create new category"));
  expect(await screen.findByRole("heading", { name: "New Category" })).toBeInTheDocument();
  expect((await services.readGearSnapshot()).categories).toHaveLength(1);
});

it("shows a full read-only category ghost without registering duplicate draggable rows", async () => {
  const list = await services.createList({ name: "Trip" });
  const category = await services.createCategory(list.id, { name: "Shelter" });
  const item = await services.createItem({ name: "Tent", description: "Weatherproof", weight: 48 });
  await services.createPackedItem(category.id, item.id, { quantity: 2, worn: true });
  const view = renderDashboard();
  await act(() => gear.refresh());
  const section = screen.getByRole("heading", { name: "Shelter" }).closest("section")!;
  const handle = within(section).getAllByRole("button", { name: "Drag" })[0];
  const sortableCount = view.container.querySelectorAll('[aria-roledescription="sortable"]').length;

  await act(() => {
    fireEvent.keyDown(handle, { key: " ", code: "Space" });
    return Promise.resolve();
  });
  const preview = view.container.querySelector<HTMLElement>("[data-category-drag-preview]");
  expect(preview).toBeInTheDocument();
  expect(within(preview!).getByText("Shelter")).toBeInTheDocument();
  expect(within(preview!).getByText("Tent")).toBeInTheDocument();
  expect(within(preview!).getByText("Weatherproof")).toBeInTheDocument();
  expect(within(preview!).getByText("48.0")).toBeInTheDocument();
  expect(within(preview!).getByText("2")).toBeInTheDocument();
  expect(preview!.querySelectorAll('input, select, button, [role="button"]')).toHaveLength(0);
  expect(view.container.querySelectorAll('[aria-roledescription="sortable"]')).toHaveLength(sortableCount);

  await act(() => {
    fireEvent.keyDown(handle, { key: "Escape", code: "Escape" });
    return Promise.resolve();
  });
  await waitFor(() => {
    expect(view.container.querySelector("[data-category-drag-preview]")).not.toBeInTheDocument();
  });
  expect(gear.lists[list.id].categoryIds).toEqual([category.id]);
});

it("keeps a read-only row preview in its gap and commits that position on drop", async () => {
  const list = await services.createList({ name: "Trip" });
  const source = await services.createCategory(list.id, { name: "Shelter" });
  const target = await services.createCategory(list.id, { name: "Kitchen" });
  const tent = await services.createItem({ name: "Tent", description: "Weatherproof", weight: 48 });
  const stove = await services.createItem({ name: "Stove" });
  const placement = (await services.createPackedItem(source.id, tent.id, {
    quantity: 2, worn: true, consumable: true, star: "red",
  })).packedItem;
  await services.createPackedItem(target.id, stove.id);

  // Model headers and row positions for collision detection in JSDOM.
  const rects = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const section = this.closest("section") ?? this.querySelector(":scope > section");
    if (!section) return new DOMRect(0, 0, 800, 40);
    const headerHeight = 90;
    const rowHeight = 45;
    const footerHeight = 40;
    const categoryGap = 24;
    const sourceSection = Array.from(this.ownerDocument.querySelectorAll("section"))
      .find((candidate) => candidate.querySelector("h2")?.textContent === "Shelter");
    const sourceRows = sourceSection?.querySelectorAll("ul > li").length ?? 0;
    const top = section.querySelector("h2")?.textContent === "Shelter"
      ? 0 : headerHeight + sourceRows * rowHeight + footerHeight + categoryGap;
    const rows = Array.from(section.querySelectorAll("ul > li"));
    const row = this.closest("li");
    return row
      ? new DOMRect(0, top + headerHeight + rows.indexOf(row) * rowHeight, 800, rowHeight)
      : new DOMRect(0, top, 800, headerHeight + rows.length * rowHeight + footerHeight);
  });

  try {
    const view = renderDashboard();
    await act(() => gear.refresh());
    const sourceSection = screen.getByRole("heading", { name: "Shelter" }).closest("section")!;
    const targetSection = screen.getByRole("heading", { name: "Kitchen" }).closest("section")!;
    const handle = within(sourceSection).getAllByRole("button", { name: "Drag" })[1];
    const sortableCount = view.container.querySelectorAll('[aria-roledescription="sortable"]').length;

    await act(async () => {
      fireEvent.keyDown(handle, { key: " ", code: "Space" });
      await Promise.resolve();
    });
    // The keyboard sensor attaches its move listener after drag activation commits.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    for (let step = 0; step < 12; step++) {
      await act(async () => {
        fireEvent.keyDown(handle, { key: "ArrowDown", code: "ArrowDown" });
        await Promise.resolve();
      });
    }

    const preview = targetSection.querySelector<HTMLElement>("[data-item-drop-preview]");
    expect(preview).toBeInTheDocument();
    expect(preview).toBe(targetSection.querySelector("ul")!.firstElementChild);
    expect(within(preview!).getByText("Tent")).toBeInTheDocument();
    expect(within(preview!).getByText("Weatherproof")).toBeInTheDocument();
    expect(within(preview!).getByText("48.0")).toBeInTheDocument();
    expect(within(preview!).getByText("2")).toBeInTheDocument();
    expect(within(preview!).getByText("Red")).toBeInTheDocument();
    expect(within(preview!).getAllByText("☑")).toHaveLength(2);
    expect(preview!.querySelectorAll('input, select, button, [role="button"]')).toHaveLength(0);
    expect(view.container.querySelectorAll('[aria-roledescription="sortable"]')).toHaveLength(sortableCount);
    expect(gear.categories[source.id].packedItems).toEqual([placement]);
    expect(gear.categories[target.id].packedItems.map((pi) => pi.itemId)).toEqual([stove.id]);

    await act(async () => {
      fireEvent.keyDown(handle, { key: " ", code: "Space" });
      await services.readGearSnapshot();
    });
    await waitFor(() => {
      expect(gear.categories[source.id].packedItems).toEqual([]);
      expect(gear.categories[target.id].packedItems.map((pi) => pi.itemId)).toEqual([tent.id, stove.id]);
    });
    expect(gear.categories[target.id].packedItems[0]).toEqual(placement);
    expect(view.container.querySelector("[data-item-drop-preview]")).not.toBeInTheDocument();
  } finally {
    rects.mockRestore();
  }
});

it("deletes only the selected placement of a shared default item", async () => {
  const list = await services.createList({ name: "Trip" });
  const first = await services.createCategory(list.id, { name: "First" });
  const second = await services.createCategory(list.id, { name: "Second" });
  const item = await services.createItem();
  await services.createPackedItem(first.id, item.id);
  const otherPlacement = await services.createPackedItem(second.id, item.id);
  renderDashboard();
  await act(() => gear.refresh());

  const row = screen.getAllByPlaceholderText("Name")[0].closest("li")!;
  fireEvent.mouseEnter(row.firstElementChild!);
  fireEvent.click(within(row).getByTitle("Delete"));

  await waitFor(() => expect(screen.getAllByPlaceholderText("Name")).toHaveLength(1));
  const stored = await services.readGearSnapshot();
  expect(stored.items).toEqual([item]);
  expect(stored.categories.find((category) => category.id === first.id)?.packedItems).toEqual([]);
  expect(stored.categories.find((category) => category.id === second.id)?.packedItems)
    .toEqual([otherPlacement.packedItem]);
});

it("preserves edits to different fields submitted before a rerender", async () => {
  const list = await services.createList({ name: "Trip" });
  const category = await services.createCategory(list.id, { name: "Shelter" });
  const item = await services.createItem({ name: "Tent" });
  await services.createPackedItem(category.id, item.id);
  renderDashboard();
  await act(() => gear.refresh());
  const row = screen.getByPlaceholderText("Name").closest("li")!;
  const fields = within(row);
  const textFields = fields.getAllByRole("textbox");
  const quantity = textFields[textFields.length - 1];

  await act(async () => {
    fireEvent.change(fields.getByPlaceholderText("Name"), { target: { value: "Tarp" } });
    fireEvent.change(fields.getByPlaceholderText("Description"), { target: { value: "Silpoly" } });
    fireEvent.click(fields.getAllByRole("checkbox")[0]);
    fireEvent.change(quantity, { target: { value: "2" } });
    fireEvent.blur(quantity);
    await services.readGearSnapshot();
  });

  await waitFor(() => {
    expect(gear.items[item.id]).toMatchObject({ name: "Tarp", description: "Silpoly" });
    expect(gear.categories[category.id].packedItems[0]).toMatchObject({ worn: true, quantity: 2 });
  });
  const stored = await services.readGearSnapshot();
  expect(stored.items[0]).toMatchObject({ name: "Tarp", description: "Silpoly" });
  expect(stored.categories[0].packedItems[0]).toMatchObject({ worn: true, quantity: 2 });
});

it.each(["list", "category", "inventory"] as const)("discards a canceled %s rename before reopening", async (kind) => {
  const list = await services.createList({ name: "Trip" });
  await services.createCategory(list.id, { name: "Shelter" });
  await services.createItem({ name: "Tent" });
  const before = await services.readGearSnapshot();
  renderDashboard();
  await act(() => gear.refresh());

  const originalName = kind === "list" ? "Trip" : kind === "category" ? "Shelter" : "Tent";
  const section = kind === "category"
    ? screen.getByRole("heading", { name: "Shelter" }).closest("section")!
    : screen.getByRole("region", { name: kind === "list" ? "Your lists" : "Gear library" });
  const openEditor = () => {
    const button = within(section).getByRole("button", { name: originalName });
    if (kind === "list") fireEvent.doubleClick(button);
    else fireEvent.click(button);
  };

  openEditor();
  const name = within(section).getByRole("textbox", { name: "Name" });
  fireEvent.change(name, { target: { value: "Canceled name" } });
  fireEvent.keyDown(name, { key: "Escape" });
  expect(within(section).queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();

  openEditor();
  expect(within(section).getByRole("textbox", { name: "Name" })).toHaveValue(originalName);
  fireEvent.keyDown(within(section).getByRole("textbox", { name: "Name" }), { key: "Escape" });
  expect(await services.readGearSnapshot()).toEqual(before);
});

it("opens the inventory rename editor with a shared item's latest name", async () => {
  const list = await services.createList({ name: "Trip" });
  const category = await services.createCategory(list.id, { name: "Shelter" });
  const item = await services.createItem({ name: "Tent" });
  await services.createPackedItem(category.id, item.id);
  renderDashboard();
  await act(() => gear.refresh());

  const row = screen.getByDisplayValue("Tent").closest("li")!;
  fireEvent.change(within(row).getByPlaceholderText("Name"), { target: { value: "Tarp" } });
  const library = screen.getByRole("region", { name: "Gear library" });
  fireEvent.click(await within(library).findByRole("button", { name: "Tarp" }));
  expect(within(library).getByRole("textbox", { name: "Name" })).toHaveValue("Tarp");
  fireEvent.keyDown(within(library).getByRole("textbox", { name: "Name" }), { key: "Escape" });
  expect((await services.readGearSnapshot()).items[0].name).toBe("Tarp");
});

it("keeps blank new rows out of inventory and discards canceled drafts", async () => {
  const list = await services.createList({ name: "Trip" });
  await services.createCategory(list.id, { name: "Shelter" });
  renderDashboard();
  await act(() => gear.refresh());
  const before = await services.readGearSnapshot();
  fireEvent.click(screen.getByRole("button", { name: "Add item" }));
  const draft = screen.getByRole("form", { name: "New item" });
  expect(within(draft).getByRole("button", { name: "Add item" })).toBeDisabled();
  fireEvent.submit(draft);
  fireEvent.change(within(draft).getByLabelText("New item name"), { target: { value: "   " } });
  fireEvent.blur(within(draft).getByLabelText("New item name"), { relatedTarget: null });
  expect(within(draft).getByRole("button", { name: "Add item" })).toBeDisabled();
  expect(await services.readGearSnapshot()).toEqual(before);
  fireEvent.change(within(draft).getByLabelText("New item name"), { target: { value: "Tarp" } });
  fireEvent.blur(within(draft).getByLabelText("New item name"), { relatedTarget: within(draft).getByRole("button", { name: "Cancel" }) });
  fireEvent.click(within(draft).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("form", { name: "New item" })).not.toBeInTheDocument();
  expect(await services.readGearSnapshot()).toEqual(before);
});

it("creates an item only after meaningful draft input and saves a rapid double submission once", async () => {
  const list = await services.createList({ name: "Trip" });
  await services.createCategory(list.id, { name: "Shelter" });
  renderDashboard();
  await act(() => gear.refresh());
  fireEvent.click(screen.getByRole("button", { name: "Add item" }));
  const draft = screen.getByRole("form", { name: "New item" });
  const weight = within(draft).getByLabelText("New item weight");
  const unit = within(draft).getByLabelText("New item weight unit");
  fireEvent.change(unit, { target: { value: "kg" } });
  expect(weight).toHaveValue(null);
  expect(within(draft).getByRole("button", { name: "Add item" })).toBeDisabled();
  fireEvent.change(weight, { target: { value: "1.23456" } });
  expect(weight).toHaveValue(1.23);
  fireEvent.change(unit, { target: { value: "g" } });
  expect(weight).toHaveValue(1230);
  fireEvent.change(unit, { target: { value: "kg" } });
  expect(weight).toHaveValue(1.23);
  fireEvent.change(unit, { target: { value: "oz" } });
  expect(weight).toHaveValue(43.39);
  fireEvent.change(unit, { target: { value: "kg" } });
  expect(weight).toHaveValue(1.23);
  fireEvent.change(within(draft).getByLabelText("New item quantity"), { target: { value: "2" } });
  fireEvent.click(within(draft).getByLabelText("New item consumable"));
  expect((await services.readGearSnapshot()).items).toHaveLength(0);
  expect(within(draft).getByRole("button", { name: "Add item" })).toBeEnabled();
  fireEvent.submit(draft);
  fireEvent.submit(draft);
  await waitFor(() => expect(screen.queryByRole("form", { name: "New item" })).not.toBeInTheDocument());
  const stored = await services.readGearSnapshot();
  expect(stored.items).toHaveLength(1);
  expect(stored.items[0]).toMatchObject({ weight: 1.23, unit: "kg" });
  expect(stored.categories[0].packedItems).toHaveLength(1);
  expect(stored.categories[0].packedItems[0]).toMatchObject({ quantity: 2, consumable: true });
});

it("saves a valid draft when focus leaves the row, while keeping field changes local", async () => {
  const list = await services.createList({ name: "Trip" });
  await services.createCategory(list.id, { name: "Shelter" });
  renderDashboard();
  await act(() => gear.refresh());
  fireEvent.click(screen.getByRole("button", { name: "Add item" }));
  const draft = screen.getByRole("form", { name: "New item" });
  const name = within(draft).getByLabelText("New item name");
  const weight = within(draft).getByLabelText("New item weight");
  const quantity = within(draft).getByLabelText("New item quantity");
  fireEvent.change(name, { target: { value: "Tarp" } });
  fireEvent.blur(name, { relatedTarget: weight });
  fireEvent.change(within(draft).getByLabelText("New item weight unit"), { target: { value: "kg" } });
  fireEvent.change(weight, { target: { value: "0.45" } });
  expect((await services.readGearSnapshot()).items).toHaveLength(0);

  fireEvent.change(quantity, { target: { value: "" } });
  fireEvent.blur(quantity, { relatedTarget: null });
  expect(draft).toBeInTheDocument();
  expect((await services.readGearSnapshot()).items).toHaveLength(0);

  fireEvent.change(quantity, { target: { value: "2" } });
  fireEvent.blur(quantity, { relatedTarget: screen.getByTitle("Create new category") });
  await waitFor(() => expect(screen.queryByRole("form", { name: "New item" })).not.toBeInTheDocument());
  const stored = await services.readGearSnapshot();
  expect(stored.items).toHaveLength(1);
  expect(stored.items[0]).toMatchObject({ name: "Tarp", weight: 0.45, unit: "kg" });
  expect(stored.categories[0].packedItems).toHaveLength(1);
  expect(stored.categories[0].packedItems[0].quantity).toBe(2);
});

it("retains a failed draft for retry without creating an inventory placeholder", async () => {
  const list = await services.createList({ name: "Trip" });
  await services.createCategory(list.id, { name: "Shelter" });
  const api = { ...memoryGearApi, createPackedItem: vi.fn().mockRejectedValueOnce(new Error("Save failed"))
    .mockImplementation(memoryGearApi.createPackedItem) };
  render(<App api={api} />);
  await screen.findByRole("heading", { name: "Shelter" });
  fireEvent.click(screen.getByRole("button", { name: "Add item" }));
  const draft = screen.getByRole("form", { name: "New item" });
  fireEvent.change(within(draft).getByLabelText("New item name"), { target: { value: "Tarp" } });
  fireEvent.blur(within(draft).getByLabelText("New item name"), { relatedTarget: null });
  expect(await screen.findByRole("alert")).toHaveTextContent("Save failed");
  expect(within(draft).getByLabelText("New item name")).toHaveValue("Tarp");
  expect((await services.readGearSnapshot()).items).toHaveLength(0);
  await waitFor(() => expect(within(draft).getByRole("button", { name: "Add item" })).toBeEnabled());
  fireEvent.submit(draft);
  await waitFor(() => expect(screen.queryByRole("form", { name: "New item" })).not.toBeInTheDocument());
  expect((await services.readGearSnapshot()).items).toHaveLength(1);
});

it("saves weight and unit edits together and converts the selectable breakdown without rewriting item units", async () => {
  const list = await services.createList({ name: "Trip" });
  const category = await services.createCategory(list.id, { name: "Gear" });
  const first = await services.createItem({ name: "Tent", weight: 500, unit: "g" });
  const worn = await services.createItem({ name: "Fleece", weight: 1, unit: "kg" });
  const fuel = await services.createItem({ name: "Fuel", weight: 16, unit: "oz" });
  await services.createPackedItem(category.id, first.id);
  await services.createPackedItem(category.id, worn.id, { worn: true });
  await services.createPackedItem(category.id, fuel.id, { quantity: 2, consumable: true });
  renderDashboard();
  await act(() => gear.refresh());
  const row = screen.getByDisplayValue("Tent").closest("li")!;
  await act(async () => {
    const weight = within(row).getByRole("textbox", { name: "Weight" });
    fireEvent.change(weight, { target: { value: "1250" } });
    fireEvent.blur(weight);
    fireEvent.change(within(row).getByRole("combobox", { name: "Weight unit" }), { target: { value: "kg" } });
    await services.readGearSnapshot();
  });
  await waitFor(() => expect(gear.items[first.id]).toMatchObject({ weight: 1.25, unit: "kg" }));
  const stored = await services.readGearSnapshot();
  const summary = screen.getByRole("region", { name: "List weight summary" });
  fireEvent.change(within(summary).getByRole("combobox", { name: "Overall weight unit" }), { target: { value: "kg" } });
  const subtotals = within(within(summary).getByRole("rowgroup", { name: "Weight subtotals" }));
  const subtotalWeight = (label: string) => within(subtotals.getByRole("rowheader", { name: label }).closest("tr")!).getAllByRole("cell")[1];
  expect(subtotalWeight("Total")).toHaveTextContent("3.2");
  expect(subtotalWeight("Base weight")).toHaveTextContent("1.3");
  expect(subtotalWeight("Worn")).toHaveTextContent("1.0");
  expect(subtotalWeight("Consumables")).toHaveTextContent("0.9");
  fireEvent.click(within(summary).getByRole("button", { name: /^Base weight/ }));
  expect(within(summary).getByRole("button", { name: /^Base weight/ })).toHaveAttribute("aria-pressed", "true");
  const breakdown = within(summary).getByRole("table", { name: "Base weight by category" });
  const categoryRow = within(within(breakdown).getByRole("rowgroup", { name: "Category breakdown" })).getByRole("row");
  expect(within(categoryRow).getByRole("rowheader")).toHaveTextContent("Gear");
  expect(within(categoryRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["$0.00", "1.3", "kg"]);
  expect(await services.readGearSnapshot()).toEqual(stored);
});

it("displays one weight decimal, edits at most two, and saves converted weights to two decimals", async () => {
  const list = await services.createList({ name: "Trip" });
  const category = await services.createCategory(list.id, { name: "Gear" });
  const item = await services.createItem({ name: "Tent", weight: 1234.567, unit: "g" });
  await services.createPackedItem(category.id, item.id);
  renderDashboard();
  await act(() => gear.refresh());
  const row = screen.getByDisplayValue("Tent").closest("li")!;
  const weight = within(row).getByRole("textbox", { name: "Weight" });
  expect(weight).toHaveValue("1234.6");
  fireEvent.focus(weight);
  expect(weight).toHaveValue("1234.57");
  fireEvent.change(weight, { target: { value: "1256.789" } });
  expect(weight).toHaveValue("1256.79");
  fireEvent.blur(weight);
  await waitFor(() => expect(gear.items[item.id].weight).toBe(1256.79));
  expect(weight).toHaveValue("1256.8");
  fireEvent.change(within(row).getByRole("combobox", { name: "Weight unit" }), { target: { value: "kg" } });
  await waitFor(() => expect(gear.items[item.id]).toMatchObject({ weight: 1.26, unit: "kg" }));
  expect(weight).toHaveValue("1.3");
  fireEvent.focus(weight);
  expect(weight).toHaveValue("1.26");
  await act(async () => {
    fireEvent.blur(weight);
    await services.readGearSnapshot();
  });
  expect((await services.readGearSnapshot()).items[0]).toMatchObject({ weight: 1.26, unit: "kg" });
});

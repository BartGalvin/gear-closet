import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { itemFromOpts } from "../../item/factories";
import { packedItemFromOpts } from "../../packedItem/factories";
import type { Category } from "../../types";
import WeightSummary from "../layout/WeightSummary";

const items = {
  1: itemFromOpts({ name: "Tent", weight: 0.5, unit: "kg", price: 125 }, 1),
  2: itemFromOpts({ name: "Fleece", weight: 250, unit: "g" }, 2),
  3: itemFromOpts({ name: "Fuel", weight: 16, unit: "oz", price: 5 }, 3),
  4: itemFromOpts({ name: "Stove", weight: 100, unit: "g", price: 25.5 }, 4),
};
const categories: Category[] = [
  { id: 1, listId: 1, name: "Empty", packedItems: [] },
  { id: 2, listId: 1, name: "Shelter", packedItems: [
    packedItemFromOpts({ quantity: 2 }, 1),
    packedItemFromOpts({ worn: true }, 2),
    packedItemFromOpts({ consumable: true }, 3),
  ] },
  { id: 3, listId: 1, name: "Kitchen", packedItems: [packedItemFromOpts({}, 4)] },
];

it("opens item slices from a category slice and keeps the selected unit and weight basis on return", () => {
  const view = render(<WeightSummary categories={categories} items={items} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Overall weight unit" }), { target: { value: "kg" } });
  const firstSlice = view.container.querySelector(".recharts-pie-sector")!;
  expect(firstSlice).toBeInTheDocument();
  fireEvent.click(firstSlice);

  expect(screen.getByRole("heading", { name: "Shelter" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Total weight by item in Shelter: 1.7 kg" })).toBeInTheDocument();
  const breakdown = screen.getByRole("rowgroup", { name: "Item breakdown" });
  expect(within(breakdown).getAllByRole("row").map((row) => ({
    name: within(row).getByRole("rowheader").textContent,
    cells: within(row).getAllByRole("cell").map((cell) => cell.textContent),
  }))).toEqual([
    { name: "Tent", cells: ["$250.00", "1.0", "kg"] },
    { name: "Fleece", cells: ["$0.00", "0.3", "kg"] },
    { name: "Fuel", cells: ["$5.00", "0.5", "kg"] },
  ]);
  expect(view.container.querySelectorAll(".recharts-pie-sector")).toHaveLength(3);

  fireEvent.click(screen.getByRole("button", { name: /^Base weight/ }));
  expect(screen.getByRole("img", { name: "Base weight by item in Shelter: 1.0 kg" })).toBeInTheDocument();
  expect(view.container.querySelectorAll(".recharts-pie-sector")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Back to categories" }));
  expect(screen.getByRole("heading", { name: "Weight overview" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Base weight by category: 1.1 kg" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Overall weight unit" })).toHaveValue("kg");
});

it("opens categories through the table and falls back to the overview if the selected category disappears", () => {
  const view = render(<WeightSummary categories={categories} items={items} />);
  fireEvent.click(screen.getByRole("button", { name: "Show items in Empty" }));
  expect(screen.getByRole("img", { name: "Total weight by item in Empty: 0.0 g" })).toBeInTheDocument();
  expect(screen.getByText("Add item weights to see the category breakdown.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to categories" }));
  fireEvent.click(screen.getByRole("button", { name: "Show items in Shelter" }));

  const updated = { ...items, 1: { ...items[1], weight: 1 } };
  view.rerender(<WeightSummary categories={categories} items={updated} />);
  expect(screen.getByRole("img", { name: "Total weight by item in Shelter: 2,703.6 g" })).toBeInTheDocument();
  const remaining = categories.filter((category) => category.id !== 2);
  view.rerender(<WeightSummary categories={remaining} items={updated} />);
  expect(screen.getByRole("heading", { name: "Weight overview" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Back to categories" })).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Total weight by category: 100.0 g" })).toBeInTheDocument();
});

it("returns to categories on an outside click or Escape, keeping controls inside the summary usable", () => {
  const outsideClick = vi.fn();
  render(<>
    <button type="button" onClick={(event) => { event.stopPropagation(); outsideClick(); }}>Outside the summary</button>
    <WeightSummary categories={categories} items={items} />
  </>);
  fireEvent.click(screen.getByRole("button", { name: "Show items in Shelter" }));
  const unit = screen.getByRole("combobox", { name: "Overall weight unit" });
  fireEvent.click(unit);
  fireEvent.change(unit, { target: { value: "kg" } });
  const baseWeight = screen.getByRole("button", { name: /^Base weight/ });
  fireEvent.click(baseWeight);
  const chart = screen.getByRole("img", { name: "Base weight by item in Shelter: 1.0 kg" });
  fireEvent.click(chart.querySelector(".recharts-pie-sector")!);
  expect(screen.getByRole("heading", { name: "Shelter" })).toBeInTheDocument();

  const outside = screen.getByRole("button", { name: "Outside the summary" });
  fireEvent.click(outside);
  expect(outsideClick).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("img", { name: "Base weight by category: 1.1 kg" })).toBeInTheDocument();
  expect(unit).toHaveValue("kg");
  expect(screen.getByRole("button", { name: /^Base weight/ })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: "Show items in Shelter" }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.getByRole("heading", { name: "Weight overview" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Back to categories" })).not.toBeInTheDocument();
});

it.each([
  ["panel background", "region", "List weight summary"],
  ["breakdown table", "table", "Total weight by item in Shelter"],
  ["chart background", "img", "Total weight by item in Shelter: 1,703.6 g"],
])("returns to categories when clicking the %s beside the item slices", (_, role, name) => {
  render(<WeightSummary categories={categories} items={items} />);
  fireEvent.click(screen.getByRole("button", { name: "Show items in Shelter" }));
  fireEvent.click(screen.getByRole(role, { name }));
  expect(screen.getByRole("heading", { name: "Weight overview" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /Total weight by category:/ })).toBeInTheDocument();
});

it("shows all weight and price subtotals for the list and selected category, independently of the chart filter", () => {
  render(<WeightSummary categories={categories} items={items} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Overall weight unit" }), { target: { value: "kg" } });
  const subtotal = (label: string) => {
    const row = within(screen.getByRole("rowgroup", { name: "Weight subtotals" })).getByRole("rowheader", { name: label }).closest("tr")!;
    const [price, weight, unit] = within(row).getAllByRole("cell");
    return { price: price.textContent, weight: `${weight.textContent} ${unit.textContent}` };
  };
  const filters = within(screen.getByRole("group", { name: "Weight breakdown" })).getAllByRole("button");
  expect(filters.map((button) => button.getAttribute("aria-label"))).toEqual(["Total weight", "Base weight"]);
  expect(within(screen.getByRole("rowgroup", { name: "Weight subtotals" })).getAllByRole("row")).toHaveLength(4);
  expect(subtotal("Total")).toEqual({ price: "$280.50", weight: "1.8 kg" });
  expect(subtotal("Base weight").weight).toBe("1.1 kg");
  expect(subtotal("Worn").weight).toBe("0.3 kg");
  expect(subtotal("Consumables")).toEqual({ price: "$5.00", weight: "0.5 kg" });
  fireEvent.click(screen.getByRole("button", { name: "Base weight" }));
  expect(subtotal("Total")).toEqual({ price: "$280.50", weight: "1.8 kg" });
  fireEvent.click(screen.getByRole("button", { name: "Show items in Shelter" }));
  expect(subtotal("Total")).toEqual({ price: "$255.00", weight: "1.7 kg" });
  expect(subtotal("Base weight").weight).toBe("1.0 kg");
  expect(subtotal("Worn").weight).toBe("0.3 kg");
  expect(subtotal("Consumables")).toEqual({ price: "$5.00", weight: "0.5 kg" });
});

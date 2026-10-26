import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import type { Category, Item } from "../../types";
import { calculateCategoryMetrics, calculateItemMetrics, calculateTotalMetrics, type WeightBasis } from "../../utils/listMetrics";
import { formatWeight, formatWeightValue, WEIGHT_UNITS, type WeightUnit } from "../../utils/weightUnits";

const bases = [
  { key: "weight", label: "Total weight", shortLabel: "Total", description: "All items" },
  { key: "baseWeight", label: "Base weight", shortLabel: "Base", description: "Excludes worn and consumables" },
] as const;

const subtotals = [
  { key: "weight", label: "Total", description: "All items" },
  { key: "consumableWeight", label: "Consumables", description: "Items marked consumable" },
  { key: "wornWeight", label: "Worn", description: "Items marked worn" },
  ...bases.slice(1),
] as const;

const colors = ["#506947", "#ad8553", "#6c8e99", "#8c7999", "#b36e5b", "#889953", "#6e7a8e", "#b39f76"];
const priceFormatter = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

export default function WeightSummary({ categories, items }: { categories: Category[]; items: Record<number, Item> }) {
  const [unit, setUnit] = useState<WeightUnit>("g");
  const [basis, setBasis] = useState<WeightBasis>("weight");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const category = categories.find((value) => value.id === categoryId);

  useEffect(() => {
    if (!category) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(".recharts-pie-sector, .weight-metric, .summary-unit-label, .summary-back-button")) setCategoryId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoryId(null);
    };
    // Capture avoids handling the click that opens the item view.
    document.addEventListener("click", handleOutsideClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleOutsideClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [category]);

  const metrics = useMemo(() => calculateCategoryMetrics(categories, items), [categories, items]);
  const totals = metrics.find((value) => value.categoryId === category?.id) ?? calculateTotalMetrics(metrics);
  const selected = bases.find((value) => value.key === basis)!;
  const grouping = category ? `item in ${category.name}` : "category";
  const data = category
    ? category.packedItems.flatMap((packedItem) => {
      const item = items[packedItem.itemId];
      if (!item) return [];
      const itemMetrics = calculateItemMetrics(item, packedItem);
      return [{
        id: packedItem.id,
        name: item.name || "Unnamed item",
        value: itemMetrics[basis],
        price: itemMetrics.price,
        color: colors[(item.id - 1) % colors.length],
      }];
    })
    : metrics.map((value) => ({
      id: value.categoryId,
      name: value.categoryName,
      value: value[basis],
      price: value.price,
      color: colors[(value.categoryId - 1) % colors.length],
    }));
  const slices = data.filter((category) => category.value > 0);
  // Reserve the same table height for category and item views.
  const tableRows = Math.min(12, Math.max(3, categories.length, ...categories.map((value) => value.packedItems.length)));

  return (
    <section className="weight-summary" aria-label="List weight summary">
      <div className="weight-summary-heading">
        <h2 title={category?.name}>{category?.name ?? "Weight overview"}</h2>
        <label className="summary-unit-label">
          Show in
          <select
            className="summary-unit-select"
            value={unit}
            aria-label="Overall weight unit"
            onChange={(event) => setUnit(event.target.value as WeightUnit)}
          >
            {WEIGHT_UNITS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <div className="weight-summary-content">
        <div className="weight-chart-area">
          <div className="weight-chart" role="img" aria-label={`${selected.label} by ${grouping}: ${formatWeight(totals[basis], unit)}`}>
            {slices.length ? (
              <PieChart key={category?.id ?? "categories"} width={256} height={256}>
                <Pie
                  className={category ? undefined : "cursor-pointer"}
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={116}
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                  onClick={category ? undefined : (_, index) => setCategoryId(Number(slices[index].id))}
                >
                  {slices.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [formatWeight(Number(value), unit), name]} wrapperStyle={{ zIndex: 1 }} isAnimationActive={false} />
              </PieChart>
            ) : <div className="weight-chart-empty" />}
          </div>
          <div className="weight-chart-navigation">
            {category && <button type="button" className="summary-back-button" onClick={() => setCategoryId(null)}>Back to categories</button>}
          </div>
        </div>
        <div className="weight-summary-details">
          <div className="weight-metrics" role="group" aria-label="Weight breakdown">
            {bases.map((value) => (
              <button key={value.key} type="button" className="weight-metric" aria-label={value.label} title={value.description} aria-pressed={basis === value.key} onClick={() => setBasis(value.key)}>
                {value.shortLabel}
              </button>
            ))}
          </div>
          <div className="weight-table-scroll" style={{ height: `calc(${(tableRows + subtotals.length) * 2}rem + 2px)` }}>
            <table className="weight-breakdown-table" aria-label={`${selected.label} by ${grouping}`}>
              <colgroup>
                <col />
                <col className="weight-price-column" />
                <col className="weight-value-column" />
                <col className="weight-unit-column" />
              </colgroup>
              <thead className="sr-only">
                <tr><th scope="col">{category ? "Item" : "Category"}</th><th scope="col">Price</th><th scope="col">Weight</th><th scope="col">Unit</th></tr>
              </thead>
              <tbody aria-label={category ? "Item breakdown" : "Category breakdown"}>
                {data.map((entry) => (
                  <tr key={entry.id}>
                    <th scope="row">
                      <span className="weight-entry-label">
                        <span className="weight-table-swatch" style={{ background: entry.color }} aria-hidden="true" />
                        {category ? <span className="weight-entry-name" title={entry.name}>{entry.name}</span> : (
                          <button type="button" className="weight-entry-name text-left hover:underline" title={entry.name} aria-label={`Show items in ${entry.name}`} onClick={() => setCategoryId(Number(entry.id))}>
                            {entry.name}
                          </button>
                        )}
                      </span>
                    </th>
                    <td className="weight-price-cell">{priceFormatter.format(entry.price)}</td>
                    <td>{formatWeightValue(entry.value, unit)}</td>
                    <td className="weight-unit-cell">{unit}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot aria-label="Weight subtotals">
                {subtotals.map((value) => (
                  <tr key={value.key} className={basis === value.key ? "weight-selected-subtotal" : undefined}>
                    <th scope="row" title={value.description}>{value.label}</th>
                    <td className="weight-price-cell">{value.key === "weight" ? priceFormatter.format(totals.price) : value.key === "consumableWeight" ? priceFormatter.format(totals.consumablePrice) : null}</td>
                    <td>{formatWeightValue(totals[value.key], unit)}</td>
                    <td className="weight-unit-cell">{unit}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
            {!slices.length && <p className="weight-summary-note">{totals.weight ? "No items contribute to this breakdown." : "Add item weights to see the category breakdown."}</p>}
            {totals.excludedWeights > 0 && (
              <p className="weight-summary-note" role="status">
                {totals.excludedWeights} {totals.excludedWeights === 1 ? "entry has" : "entries have"} an unrecognized unit or invalid weight
                {totals.excludedWeights === 1 ? " and is" : " and are"} excluded from these totals.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

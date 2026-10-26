interface PackedItemsGridProps {
  children: React.ReactNode;
  isHeader?: boolean;
}

// Shared columns align headers, rows, and drag previews.
export function PackedItemsGrid({ children, isHeader = false }: PackedItemsGridProps) {
  return (
    <div
      className={`packed-items-grid${isHeader ? " packed-items-header" : ""}`}
    >
      {children}
    </div>
  );
}

export function PackedItemsHeader() {
  return (
    <PackedItemsGrid isHeader>
      <div></div>
      <div>Name</div>
      <div>Description</div>
      <div>Worn</div>
      <div title="Consumable">Cons.</div>
      <div>Flag</div>
      <div className="text-right">Price</div>
      <div className="text-right">Weight</div>
      <div className="text-right">Qty</div>
      <div></div>
    </PackedItemsGrid>
  );
}

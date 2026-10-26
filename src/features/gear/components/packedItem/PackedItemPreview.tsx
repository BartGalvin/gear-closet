import type { Item, PackedItemOptions } from "../../types";
import { PackedItemsGrid } from "./PackedItemsGrid";
import { formatDecimal } from "../../utils/decimal";

interface PackedItemPreviewProps {
  item: Item;
  packedItem?: PackedItemOptions;
}

// Static cells can be reused by drag previews without adding controls or sortable rows.
export default function PackedItemPreview({ item, packedItem }: PackedItemPreviewProps) {
  const { quantity = 1, worn = false, consumable = false, star = "none" } = packedItem ?? {};
  const fieldClass = "gear-field truncate";

  return (
    <PackedItemsGrid>
      <span className="drag-handle">⠿</span>
      <span className={fieldClass}>{item.name}</span>
      <span className={fieldClass}>{item.description}</span>
      <span>{worn ? "☑" : "☐"}</span>
      <span>{consumable ? "☑" : "☐"}</span>
      <span className={fieldClass}>{star.charAt(0).toUpperCase() + star.slice(1)}</span>
      <span className={`${fieldClass} text-right tabular-nums`}>{item.price}</span>
      <div className="item-weight-field">
        <span className={`${fieldClass} text-right tabular-nums`}>{formatDecimal(item.weight, 1)}</span>
        <span className={`${fieldClass} weight-unit`}>{item.unit}</span>
      </div>
      <span className={`${fieldClass} text-right tabular-nums`}>{quantity}</span>
      <span></span>
    </PackedItemsGrid>
  );
}

import type { Category, Item, ItemId } from "../../types";
import { PackedItemsHeader } from "../packedItem/PackedItemsGrid";
import PackedItemPreview from "../packedItem/PackedItemPreview";

interface CategoryDragPreviewProps {
  category: Category;
  items: Record<ItemId, Item>;
}

// Plain markup avoids registering another set of sortable rows inside the overlay.
export default function CategoryDragPreview({ category, items }: CategoryDragPreviewProps) {
  return (
    <section
      aria-hidden="true"
      inert
      data-category-drag-preview
      className="category-section category-drag-preview"
    >
      <div className="category-heading">
        <span className="drag-handle">⠿</span>
        <h2 className="px-1 py-1">{category.name}</h2>
        <span className="category-count">{category.packedItems.length} {category.packedItems.length === 1 ? "item" : "items"}</span>
        <span className="delete-button">×</span>
      </div>
      <div className="category-table-scroll">
        <PackedItemsHeader />
        <ul className="list-none p-0 m-0">
          {category.packedItems.map((packedItem) => {
            const item = items[packedItem.itemId];
            if (!item) return null;
            return (
              <li key={packedItem.id}>
                <PackedItemPreview item={item} packedItem={packedItem} />
              </li>
            );
          })}
        </ul>
        <div className="add-item-button"><span>+</span> Add item</div>
      </div>
    </section>
  );
}

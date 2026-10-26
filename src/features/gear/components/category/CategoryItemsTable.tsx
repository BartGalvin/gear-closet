import { Fragment, useLayoutEffect } from "react";
import type { CategoryId, DragData, Item, PackedItem } from "../../types";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useGear } from "../../hooks/useGear";
import PackedItemRow from "../packedItem/PackedItemRow";
import PackedItemPreview from "../packedItem/PackedItemPreview";
import { PackedItemsHeader } from "../packedItem/PackedItemsGrid";
import { SortableContext } from "@dnd-kit/sortable";
import { getItemDropTarget } from "../../dnd/itemDropTarget";

interface ItemDropPreviewProps {
  categoryId: CategoryId;
  dropData: DragData;
  item: Item;
  packedItem?: PackedItem;
}

function ItemDropPreview({ categoryId, dropData, item, packedItem }: ItemDropPreviewProps) {
  // Hovering the space opened by the preview keeps the same destination.
  const { setNodeRef } = useDroppable({
    id: `item-drop-preview-${categoryId}`,
    data: dropData,
  });

  return (
    <li
      ref={setNodeRef}
      aria-hidden="true"
      inert
      data-item-drop-preview
      className="drop-preview"
    >
      <PackedItemPreview item={item} packedItem={packedItem} />
    </li>
  );
}

interface CategoryItemsTableProps {
  categoryId: CategoryId;
  isOver: boolean;
  setNodeRef: (element: HTMLElement | null) => void;
}

export default function CategoryItemsTable({
  categoryId,
  isOver,
  setNodeRef,
}: CategoryItemsTableProps) {
  const { items, categories } = useGear();
  // dnd-kit returns a React callback, despite declaring its type as a method.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { active, over, measureDroppableContainers } = useDndContext();
  const drag = active?.data.current as DragData | undefined;
  const dropData = over?.data.current as DragData | undefined;
  const target = getItemDropTarget(drag, dropData, categories);
  const dropIndex = target?.categoryId === categoryId ? target.index : null;
  // Measure after the gap moves, including removal, while the table stays mounted.
  useLayoutEffect(() => {
    measureDroppableContainers([]);
  }, [dropIndex, measureDroppableContainers]);

  const category = categories[categoryId];
  if (!category) return null;
  const item = drag && drag.type !== "category" ? items[drag.itemId] : undefined;
  const packedItem = drag?.type === "packed-item"
    ? categories[drag.categoryId]?.packedItems.find((pi) => pi.id === drag.packedItemId)
    : undefined;
  const preview = dropIndex !== null && item && dropData ? (
    <ItemDropPreview
      categoryId={categoryId}
      dropData={dropData}
      item={item}
      packedItem={packedItem}
    />
  ) : null;

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "category-drop-target" : undefined}
    >
      <PackedItemsHeader />

      <SortableContext items={category.packedItems.map((pi) => `packed-item-${pi.id}`)}>
        <ul className="list-none p-0 m-0">
          {category.packedItems.map((pi, index) => {
            if (!items[pi.itemId]) return null;
            return (
              <Fragment key={pi.id}>
                {dropIndex === index && preview}
                <li>
                  <PackedItemRow
                    categoryId={category.id}
                    item={items[pi.itemId]}
                    packedItem={pi}
                  />
                </li>
              </Fragment>
            );
          })}
          {dropIndex === category.packedItems.length && preview}
        </ul>
      </SortableContext>
    </div>
  );
}

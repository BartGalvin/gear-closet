import type { CategoryId, CategoryDropData } from "../../types";
import { useGear } from "../../hooks/useGear";
import CategoryItem from "./CategoryItem";
import CategoryItemsTable from "./CategoryItemsTable";
import CreatePackedItemRow from "../packedItem/CreatePackedItemRow";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  categoryId: CategoryId;
}

export default function CategorySection({ categoryId }: Props) {
  const { categories, updateCategory, deleteCategory } = useGear();
  const { active } = useDndContext();
  const category = categories[categoryId];

  const isDraggingCategory = active?.data.current?.type === "category";

  const { attributes, listeners, setNodeRef: setDragRef, transform, transition, isDragging } = useSortable({
    id: categoryId,
    data: {
      type: "category",
      categoryId,
    } satisfies CategoryDropData,
  });

  // Nested item targets must not compete with category drags.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `category-${categoryId}`,
    data: {
      type: "category",
      categoryId,
    } satisfies CategoryDropData,
    disabled: isDraggingCategory,
  });

  if (!category) return null;

  return (
    <div
      ref={setDragRef}
      className="category-slot"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <CategoryItem
        category={category}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
        dragAttributes={attributes}
        dragListeners={listeners}
      >
        <CategoryItemsTable categoryId={categoryId} isOver={isOver} setNodeRef={setDropRef} />
        <CreatePackedItemRow categoryId={categoryId} />
      </CategoryItem>
    </div>
  );
}

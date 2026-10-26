import {
  DndContext,
  useDndContext,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";

import type { DragData } from "../types";
import { useGear } from "../hooks/useGear";
import CategoryDragPreview from "../components/category/CategoryDragPreview";
import { getItemDropTarget } from "./itemDropTarget";

function GearDragOverlay() {
  const { active } = useDndContext();
  const activeDrag = active?.data.current as DragData | undefined;
  const { items, categories } = useGear();

  return (
    <DragOverlay dropAnimation={null} style={{ pointerEvents: "none" }}>
      {activeDrag?.type === "category" ? (
        categories[activeDrag.categoryId] && (
          <CategoryDragPreview category={categories[activeDrag.categoryId]} items={items} />
        )
      ) : activeDrag ? (
        <div
          className="drag-label"
          style={{ pointerEvents: "none", transition: "none" }}
        >
          <span>{items[activeDrag.itemId]?.name}</span>
        </div>
      ) : null}
    </DragOverlay>
  );
}

export default function GearDnDContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    categories,
    lists,
    selectedListId,
    addPackedItem,
    movePackedItem,
    moveCategory,
  } = useGear();
  const handleDragEnd = (e: DragEndEvent): void => {
    const dragData = e.active.data.current as DragData | undefined;
    const dropData = e.over?.data.current as DragData | undefined;
    if (
      !dragData ||
      (dropData?.type !== "category" && dropData?.type !== "packed-item")
    ) {
      return;
    }

    const dropCategory = categories[dropData.categoryId];
    if (!dropCategory) return;

    if (dragData.type === "category" && selectedListId !== null) {
      const list = lists[selectedListId];
      const toIndex = list?.categoryIds.indexOf(dropData.categoryId) ?? -1;
      if (
        list?.categoryIds.includes(dragData.categoryId) &&
        toIndex !== -1 &&
        dragData.categoryId !== dropData.categoryId
      ) {
        moveCategory(selectedListId, dragData.categoryId, toIndex).catch((err) => {
          console.error("Failed to move category:", err);
        });
      }
      return;
    }

    const target = getItemDropTarget(dragData, dropData, categories);
    if (!target) return;

    if (dragData.type === "sidebar-item") {
      addPackedItem(target.categoryId, dragData.itemId, {}, target.index).catch((err) => {
        console.error("Failed to add packed item:", err);
      });
    } else if (dragData.type === "packed-item") {
      const sourceCategory = categories[dragData.categoryId];
      const sourceIndex = sourceCategory.packedItems.findIndex((pi) => pi.id === dragData.packedItemId);
      const dropIndex = target.index - (sourceCategory.id === target.categoryId && sourceIndex < target.index ? 1 : 0);

      movePackedItem(
        sourceCategory.id,
        target.categoryId,
        dragData.packedItemId,
        dropIndex,
      ).catch((err) => {
        console.error("Failed to move packed item:", err);
      });
    }
  };

  const customCollisionDetection: CollisionDetection = (args) => {
    const dragData = args.active.data.current as DragData | undefined;

    // Category sections use numeric IDs; nested item drop areas must not compete.
    if (dragData?.type === "category") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((container) =>
          typeof container.id === "number" && container.data.current?.type === "category",
        ),
      });
    }

    const collisions = pointerWithin({
      ...args,
      pointerCoordinates: args.pointerCoordinates ?? {
        x: args.collisionRect.left + args.collisionRect.width / 2,
        y: args.collisionRect.top + args.collisionRect.height / 2,
      },
    });
    // The preview occupies a real row-sized gap and retains its intended target.
    const preview = collisions.find((collision) => String(collision.id).startsWith("item-drop-preview-"));
    if (preview) return [preview];

    // A row and its containing category overlap; prefer the more precise row target.
    const row = collisions.find((collision) => args.droppableContainers.some((container) =>
      container.id === collision.id && container.data.current?.type === "packed-item",
    ));
    return row ? [row] : collisions;
  };

  return (
    <DndContext
      collisionDetection={customCollisionDetection}
      onDragEnd={handleDragEnd}
    >
      {children}
      <GearDragOverlay />
    </DndContext>
  );
}

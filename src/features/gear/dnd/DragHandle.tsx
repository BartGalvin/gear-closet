import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";

export interface DragHandleProps {
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
}

export default function DragHandle({ listeners, attributes }: DragHandleProps) {
  return (
    <span
      {...attributes}
      {...listeners}
      className="drag-handle"
      aria-label="Drag"
      tabIndex={0}
    >
      ⠿
    </span>
  );
}


import { useGear } from "../../hooks/useGear";
import type { Item } from "../../types";
import EditableListItem from "../editable/EditableListItem";
import { DescriptionText } from "../common/DescriptionText";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SidebarItemDragData } from "../../types";
import DragHandle from "../../dnd/DragHandle";

interface SidebarItemProps {
  item: Item;
}

export default function SidebarItem({ item }: SidebarItemProps) {
  const { updateItem, deleteItem } = useGear();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: `sidebar-item-${item.id}`,
      data: {
        type: "sidebar-item",
        itemId: item.id,
      } as SidebarItemDragData,
    });

  return (
    <li
      ref={setNodeRef}
      className={`sidebar-library-item${isDragging ? " drag-source" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
      }}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      <EditableListItem
        item={item}
        displayName={item.name ?? "[Name]"}
        onUpdate={(i, newName) => updateItem({ id: i.id, name: newName })}
        onDelete={deleteItem}
        showDelete={!isDragging}
      >
        {item.description && (
          <DescriptionText>{item.description}</DescriptionText>
        )}
      </EditableListItem>
    </li>
  );
}

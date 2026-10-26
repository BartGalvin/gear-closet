import type { List } from "../../types";
import EditableListItem from "../editable/EditableListItem";

interface SidebarListItemProps {
  list: List;
  isSelected: boolean;
  onSelect: (list: List) => void;
  onUpdate: (list: Pick<List, "id" | "name">) => Promise<void>;
  onDelete: (listId: number) => Promise<void>;
}

export default function SidebarListItem({
  list,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: SidebarListItemProps) {
  return (
    <li>
      <EditableListItem
        item={list}
        displayName={list.name}
        isSelected={isSelected}
        onSelect={onSelect}
        onUpdate={(l, newName) => onUpdate({ id: l.id, name: newName })}
        onDelete={onDelete}
      />
    </li>
  );
}

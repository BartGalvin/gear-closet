import type { ReactNode } from "react";
import { useEditableItem } from "../../hooks/useEditableItem";
import { EditInput } from "./EditInput";
import { EditableText } from "./EditableText";
import { DeleteButton } from "../common/DeleteButton";

interface EditableListItemProps<T extends { id: number | string }> {
  item: T;
  displayName: string;
  isSelected?: boolean;
  onSelect?: (item: T) => void;
  onUpdate: (item: T, newName: string) => Promise<void>;
  onDelete: (id: T["id"]) => Promise<void>;
  children?: ReactNode;
  showDelete?: boolean;
}

export default function EditableListItem<T extends { id: number | string }>({
  item,
  displayName,
  isSelected = false,
  onSelect,
  onUpdate,
  onDelete,
  children,
  showDelete = true,
}: EditableListItemProps<T>) {
  const { isEditing, startEditing, cancelEditing, editName, setEditName, isDeleting, handleSave, handleDelete } = useEditableItem({
    item,
    getDisplayName: () => displayName,
    onUpdate,
    onDelete,
  });

  if (isEditing) {
    return (
      <div className="sidebar-entry">
        <EditInput
          value={editName}
          onChange={setEditName}
          onSave={handleSave}
          onCancel={cancelEditing}
          autoFocus
        />
        {showDelete && <DeleteButton onClick={handleDelete} disabled={isDeleting} />}
      </div>
    );
  }

  return (
    <div className={`sidebar-entry${isSelected ? " sidebar-entry--selected" : ""}`}>
      <div className="min-w-0 flex-1">
        <EditableText
          text={displayName}
          onClick={onSelect ? () => onSelect(item) : startEditing}
          onEdit={startEditing}
          isSelected={isSelected}
          title={onSelect ? "Click to select, double-click to rename" : "Click to rename"}
        />
        {children}
      </div>
      {showDelete && <DeleteButton onClick={handleDelete} disabled={isDeleting} />}
    </div>
  );
}

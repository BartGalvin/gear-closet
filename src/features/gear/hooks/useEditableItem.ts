import { useState } from "react";

interface UseEditableItemConfig<T extends { id: number | string }> {
  item: T;
  getDisplayName: (item: T) => string;
  onUpdate: (item: T, newName: string) => Promise<void>;
  onDelete: (id: T["id"]) => Promise<void>;
}

export function useEditableItem<T extends { id: number | string }>({
  item,
  getDisplayName,
  onUpdate,
  onDelete,
}: UseEditableItemConfig<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(getDisplayName(item));
  const [isDeleting, setIsDeleting] = useState(false);

  const startEditing = () => {
    setEditName(getDisplayName(item));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditName(getDisplayName(item));
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      cancelEditing();
      return;
    }

    try {
      await onUpdate(item, trimmedName);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update item:", error);
      cancelEditing();
    }
  };

  const handleDelete = async () => {
    const itemName = getDisplayName(item);
    if (!confirm(`Delete "${itemName}"?`)) return;

    try {
      setIsDeleting(true);
      await onDelete(item.id);
    } catch (error) {
      console.error("Failed to delete item:", error);
      setIsDeleting(false);
    }
  };

  return {
    isEditing,
    startEditing,
    cancelEditing,
    editName,
    setEditName,
    isDeleting,
    handleSave,
    handleDelete,
  };
}

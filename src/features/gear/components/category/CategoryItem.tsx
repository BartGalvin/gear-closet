import type { Category } from "../../types";
import { useEditableItem } from "../../hooks/useEditableItem";
import { EditInput } from "../editable/EditInput";
import { DeleteButton } from "../common/DeleteButton";
import DragHandle, { type DragHandleProps } from "../../dnd/DragHandle";

interface CategoryItemProps {
  category: Category;
  onUpdate: (category: Pick<Category, "id" | "name">) => Promise<void>;
  onDelete: (categoryId: number) => Promise<void>;
  children?: React.ReactNode;
  dragAttributes?: DragHandleProps["attributes"];
  dragListeners?: DragHandleProps["listeners"];
}

export default function CategoryItem({
  category,
  onUpdate,
  onDelete,
  children,
  dragAttributes,
  dragListeners,
}: CategoryItemProps) {
  const {
    isEditing,
    startEditing,
    cancelEditing,
    editName,
    setEditName,
    isDeleting,
    handleSave,
    handleDelete,
  } = useEditableItem({
    item: category,
    getDisplayName: (c) => c.name,
    onUpdate: (c, newName) => onUpdate({ id: c.id, name: newName }),
    onDelete,
  });

  return (
    <section className="category-section">
      <div className="category-heading">
        {dragAttributes && dragListeners && (
          <DragHandle listeners={dragListeners} attributes={dragAttributes} />
        )}
        {isEditing ? (
          <EditInput
            value={editName}
            onChange={setEditName}
            onSave={handleSave}
            onCancel={cancelEditing}
            autoFocus
          />
        ) : (
          <h2>
            <button type="button" className="category-name" onClick={startEditing} title="Rename category">
              {category.name}
            </button>
          </h2>
        )}
        <span className="category-count">{category.packedItems.length} {category.packedItems.length === 1 ? "item" : "items"}</span>
        <DeleteButton onClick={handleDelete} disabled={isDeleting} />
      </div>
      <div className="category-table-scroll">{children}</div>
    </section>
  );
}

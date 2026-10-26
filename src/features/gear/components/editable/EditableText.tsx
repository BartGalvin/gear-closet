interface EditableTextProps {
  text: string;
  onEdit: () => void;
  onClick?: () => void;
  isSelected?: boolean;
  title?: string;
}

export function EditableText({
  text,
  onEdit,
  onClick,
  isSelected = false,
  title = "Click to select, double-click to edit",
}: EditableTextProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onEdit}
      className={`editable-text ${
        isSelected ? "font-bold" : "font-normal"
      }`}
      title={title}
      aria-current={isSelected ? "page" : undefined}
    >
      {text}
    </button>
  );
}

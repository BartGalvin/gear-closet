interface DeleteButtonProps {
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  title?: string;
}

export function DeleteButton({
  onClick,
  disabled = false,
  title = "Delete",
}: DeleteButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={() => void onClick()}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="delete-button"
    >
      ×
    </button>
  );
}

interface CreateButtonProps {
  onClick: () => Promise<void> | void;
  label: string;
  title?: string;
}

export function CreateButton({ onClick, label, title }: CreateButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      title={title}
      aria-label={label || title}
      className={`create-button${label ? "" : " create-button--icon"}`}
    >
      <span aria-hidden="true">+</span>
      {label && <span>{label}</span>}
    </button>
  );
}

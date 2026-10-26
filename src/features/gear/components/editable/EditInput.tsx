interface EditInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
}

export function EditInput({
  value,
  onChange,
  onSave,
  onCancel,
  autoFocus = true,
}: EditInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void onSave();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => void onSave()}
      onKeyDown={handleKeyDown}
      autoFocus={autoFocus}
      aria-label="Name"
      className="edit-input"
    />
  );
}

import { useState } from "react";
import { formatDecimal, limitDecimals } from "../../utils/decimal";

export interface EditableFieldProps {
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  placeholder?: string;
  type?: "text" | "number" | "checkbox" | "select";
  options?: { value: string; label: string }[];
  label?: string;
  displayDecimals?: number;
  maxDecimals?: number;
}

export default function EditableField({
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  label,
  displayDecimals,
  maxDecimals,
}: EditableFieldProps) {
  // Preserve incomplete numeric input until blur commits a valid number.
  const [localValue, setLocalValue] = useState<string | null>(null);
  const formattedValue = type === "number" && displayDecimals !== undefined ? formatDecimal(Number(value), displayDecimals) : value;
  const displayValue = type === "number" && localValue !== null ? localValue : formattedValue;

  if (type === "checkbox") {
    return (
      <label className="flex items-center justify-center">
        <input
          type="checkbox"
          aria-label={label}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  if (type === "select" && options) {
    return (
      <select
        aria-label={label}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="gear-field"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === "number") {
    return (
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={displayValue as string | number}
        onFocus={() => {
          if (maxDecimals !== undefined) setLocalValue(String(Number(formatDecimal(Number(value), maxDecimals))));
        }}
        onChange={(e) => {
          setLocalValue(maxDecimals === undefined ? e.target.value : limitDecimals(e.target.value, maxDecimals));
        }}
        onBlur={(e) => {
          const numValue = Number(e.target.value);
          if (!isNaN(numValue) && e.target.value.trim() !== "") {
            onChange(maxDecimals === undefined ? numValue : Number(formatDecimal(numValue, maxDecimals)));
          }
          setLocalValue(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        className="gear-field text-right tabular-nums"
      />
    );
  }

  return (
    <input
      type={type}
      value={displayValue as string | number}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      aria-label={label ?? placeholder}
      className="gear-field"
    />
  );
}

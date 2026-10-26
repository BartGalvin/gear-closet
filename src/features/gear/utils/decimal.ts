export function formatDecimal(value: number, places: number): string {
  if (!Number.isFinite(value)) return String(value);
  return new Intl.NumberFormat("en-US", {
    useGrouping: false,
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(value);
}

export function limitDecimals(value: string, places: number): string {
  const number = Number(value);
  if (!Number.isFinite(number) || value.trim() === "") return value;
  const rounded = Number(formatDecimal(number, places));
  return rounded !== number || (value.split(".")[1]?.length ?? 0) > places ? String(rounded) : value;
}

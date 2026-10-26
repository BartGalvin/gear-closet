export const WEIGHT_UNITS = ["g", "kg", "oz", "lb"] as const;
export type WeightUnit = typeof WEIGHT_UNITS[number];

// Avoirdupois units: one pound is exactly 453.59237 grams, and one ounce is 1/16 pound.
const gramsPerUnit: Record<WeightUnit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
};

export function isWeightUnit(unit: string): unit is WeightUnit {
  return WEIGHT_UNITS.some((value) => value === unit);
}

export function convertWeight(weight: number, fromUnit: string, toUnit: string): number | null {
  if (!isWeightUnit(fromUnit) || !isWeightUnit(toUnit) || !Number.isFinite(weight) || weight < 0) return null;
  const converted = weight * (gramsPerUnit[fromUnit] / gramsPerUnit[toUnit]);
  return Number.isFinite(converted) ? converted : null;
}

export function weightInGrams(weight: number, unit: string): number | null {
  return convertWeight(weight, unit, "g");
}

export function formatWeightValue(grams: number, unit: WeightUnit): string {
  const value = grams / gramsPerUnit[unit];
  if (value > 0 && value < 0.1) return "<0.1";
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

export function formatWeight(grams: number, unit: WeightUnit): string {
  return `${formatWeightValue(grams, unit)} ${unit}`;
}

import { convertWeight, formatWeight, weightInGrams } from "../weightUnits";

it.each([
  [1000, "g", "kg", 1],
  [1, "kg", "g", 1000],
  [16, "oz", "lb", 1],
  [1, "lb", "oz", 16],
  [453.59237, "g", "lb", 1],
  [28.349523125, "g", "oz", 1],
  [0, "kg", "oz", 0],
])("converts %s %s to %s while preserving the measurement", (weight, from, to, expected) => {
  const converted = convertWeight(weight, from, to)!;
  expect(converted).toBeCloseTo(expected, 10);
  expect(convertWeight(converted, to, from)).toBeCloseTo(weight, 10);
});

it("does not guess conversions for unknown units or invalid weights", () => {
  expect(convertWeight(1, "stone", "kg")).toBeNull();
  expect(convertWeight(1, "kg", "stone")).toBeNull();
  expect(convertWeight(-1, "g", "kg")).toBeNull();
  expect(convertWeight(Infinity, "g", "kg")).toBeNull();
  expect(convertWeight(NaN, "g", "kg")).toBeNull();
  expect(convertWeight(Number.MAX_VALUE, "kg", "g")).toBeNull();
});

it.each([
  [1000, "g", 1000],
  [1, "kg", 1000],
  [16, "oz", 453.59237],
  [1, "lb", 453.59237],
])("converts %s %s to grams", (weight, unit, grams) => {
  expect(weightInGrams(weight, unit)).toBeCloseTo(grams, 10);
});

it("rejects unknown units and invalid amounts instead of treating them as grams", () => {
  expect(weightInGrams(1, "stone")).toBeNull();
  expect(weightInGrams(-1, "g")).toBeNull();
  expect(weightInGrams(Infinity, "kg")).toBeNull();
  expect(weightInGrams(NaN, "oz")).toBeNull();
  expect(weightInGrams(Number.MAX_VALUE, "lb")).toBeNull();
});

it("formats a gram total in any supported unit without rounding tiny nonzero totals to zero", () => {
  expect(formatWeight(1000, "kg")).toBe("1.0 kg");
  expect(formatWeight(453.59237, "lb")).toBe("1.0 lb");
  expect(formatWeight(28.349523125, "oz")).toBe("1.0 oz");
  expect(formatWeight(1250, "kg")).toBe("1.3 kg");
  expect(formatWeight(0.1, "kg")).toBe("<0.1 kg");
  expect(formatWeight(0, "g")).toBe("0.0 g");
});

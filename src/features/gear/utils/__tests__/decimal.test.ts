import { formatDecimal, limitDecimals } from "../decimal";

it("rounds decimal values consistently for display and saving", () => {
  expect(formatDecimal(1.25, 1)).toBe("1.3");
  expect(formatDecimal(0.15, 1)).toBe("0.2");
  expect(formatDecimal(0, 1)).toBe("0.0");
  expect(formatDecimal(1.005, 2)).toBe("1.01");
  expect(formatDecimal(10.075, 2)).toBe("10.08");
});

it("limits entered decimals while preserving incomplete input", () => {
  expect(limitDecimals("1.239", 2)).toBe("1.24");
  expect(limitDecimals("1.2300", 2)).toBe("1.23");
  expect(limitDecimals("0.001", 2)).toBe("0");
  for (const value of ["", ".", "1.", "1e-"]) expect(limitDecimals(value, 2)).toBe(value);
});

import { packedItemFromOpts } from "../factories";
import { vi } from "vitest";

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-123"),
}));

describe("packedItemFromOpts", () => {
  it("applies default values", () => {
    const pi = packedItemFromOpts();

    expect(pi.id).toBe("test-id-123");
    expect(pi.itemId).toBe(0);
    expect(pi.quantity).toBe(1);
    expect(pi.worn).toBe(false);
    expect(pi.consumable).toBe(false);
    expect(pi.star).toBe("none");
  });

  it("uses provided itemId", () => {
    const pi = packedItemFromOpts({}, 42);

    expect(pi.itemId).toBe(42);
    expect(pi.id).toBe("test-id-123");
  });

  it("uses provided packedItemId over nanoid", () => {
    const pi = packedItemFromOpts({}, 42, "custom-id");

    expect(pi.id).toBe("custom-id");
    expect(pi.itemId).toBe(42);
  });

  it("uses provided options over defaults", () => {
    const pi = packedItemFromOpts(
      { quantity: 5, worn: true, consumable: true, star: "yellow" },
      10,
      "id-1"
    );

    expect(pi.quantity).toBe(5);
    expect(pi.worn).toBe(true);
    expect(pi.consumable).toBe(true);
    expect(pi.star).toBe("yellow");
    expect(pi.itemId).toBe(10);
    expect(pi.id).toBe("id-1");
  });

  it("generates IDs via nanoid when no packedItemId provided", () => {
    const pi1 = packedItemFromOpts({}, 1);
    const pi2 = packedItemFromOpts({}, 2);

    expect(pi1.id).toBe("test-id-123");
    expect(pi2.id).toBe("test-id-123");
    expect(pi1.itemId).toBe(1);
    expect(pi2.itemId).toBe(2);
  });

  it("spreads additional options", () => {
    const pi = packedItemFromOpts(
      { quantity: 3, star: "red" },
      5,
      "pack-1"
    );

    expect(pi.quantity).toBe(3);
    expect(pi.star).toBe("red");
    expect(pi.id).toBe("pack-1");
  });

  it("allows partial options", () => {
    const pi = packedItemFromOpts({ worn: true });

    expect(pi.worn).toBe(true);
    expect(pi.quantity).toBe(1);
    expect(pi.consumable).toBe(false);
    expect(pi.star).toBe("none");
  });

  it("handles 0 as valid itemId", () => {
    const pi = packedItemFromOpts({}, 0);

    expect(pi.itemId).toBe(0);
  });

  it("handles empty string as valid id", () => {
    const pi = packedItemFromOpts({}, 1, "");

    expect(pi.id).toBe("");
  });
});

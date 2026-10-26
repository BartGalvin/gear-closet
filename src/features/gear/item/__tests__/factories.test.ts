import { itemFromOpts } from "../factories";

describe("itemFromOpts", () => {
  it("applies default values for all fields", () => {
    const item = itemFromOpts({}, 1);

    expect(item.id).toBe(1);
    expect(item.name).toBe("");
    expect(item.description).toBe("");
    expect(item.image).toBe("");
    expect(item.url).toBe("");
    expect(item.tags).toEqual([]);
    expect(item.weight).toBe(0);
    expect(item.unit).toBe("g");
    expect(item.price).toBe(0);
  });

  it("uses provided options over defaults", () => {
    const item = itemFromOpts(
      { name: "Tent", weight: 500, unit: "oz", price: 100, tags: ["shelter"] },
      123
    );

    expect(item.id).toBe(123);
    expect(item.name).toBe("Tent");
    expect(item.weight).toBe(500);
    expect(item.unit).toBe("oz");
    expect(item.price).toBe(100);
    expect(item.tags).toEqual(["shelter"]);
  });

  it("uses name parameter when opts.name not provided", () => {
    const item = itemFromOpts({}, 1, "Default Name");

    expect(item.name).toBe("Default Name");
  });

  it("prefers opts.name over name parameter", () => {
    const item = itemFromOpts({ name: "From Opts" }, 1, "Default Name");

    expect(item.name).toBe("From Opts");
  });

  it("prefers opts.name over name parameter even if opts is empty", () => {
    const item = itemFromOpts({ name: "" }, 1, "Default Name");

    expect(item.name).toBe("");
  });

  it("spreads additional options", () => {
    const item = itemFromOpts(
      { name: "Backpack", description: "A great pack", image: "backpack.png" },
      5
    );

    expect(item.name).toBe("Backpack");
    expect(item.description).toBe("A great pack");
    expect(item.image).toBe("backpack.png");
  });

  it("handles missing id parameter", () => {
    const item = itemFromOpts({ name: "Test" });

    expect(item.id).toBe(0);
    expect(item.name).toBe("Test");
  });

  it("creates immutable defaults for arrays", () => {
    const item1 = itemFromOpts({}, 1);
    const item2 = itemFromOpts({}, 2);

    expect(item1.tags).not.toBe(item2.tags);
    expect(item1.tags).toEqual(item2.tags);
  });
});

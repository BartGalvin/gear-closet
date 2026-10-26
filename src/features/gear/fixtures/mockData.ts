const mock = {
  items: [
    { id: "tent", name: "Tent", weight: 48 },
    { id: "bivy", name: "Bivy", weight: 24 },
    { id: "stove", name: "Stove", weight: 12 },
    { id: "spoon", name: "Spoon", weight: 5 },
    { id: "jar", name: "Cold-Soak Jar", weight: 1 },
  ],
  lists: [
    {
      name: "Backpacking Trip",
      categories: [
        { name: "Shelter", itemIds: ["tent"] },
        { name: "Kitchen", itemIds: ["stove", "spoon"] },
      ],
    },
    {
      name: "Ultralight Trip",
      categories: [
        { name: "Shelter", itemIds: ["bivy"] },
        { name: "Kitchen", itemIds: ["jar"] },
      ],
    },
  ],
};

export interface MockItem { id: string; name: string; weight: number };
export interface MockCategory { name: string; itemIds: string[] };
export interface MockList { name: string; categories: MockCategory[] };
export interface MockData { items: MockItem[]; lists: MockList[] };
export const defaultMockData: MockData = mock;
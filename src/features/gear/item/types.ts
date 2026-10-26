export type ItemId = number;
export type ItemOptions = Partial<Omit<Item, "id">>;
export interface Item {
  id: ItemId;
  name: string;
  description: string;
  image: string;
  url: string;
  tags: string[];
  weight: number;
  unit: string;
  price: number;
}
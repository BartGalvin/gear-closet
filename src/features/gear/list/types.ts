import type { CategoryId } from "../types";

export type ListId = number;
export type ListRecord = Record<ListId, List>;
export type ListOptions = Partial<Omit<List, "id">>;
export interface List {
  id: ListId;
  name: string;
  categoryIds: CategoryId[];
}

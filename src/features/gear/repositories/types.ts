import type { Category, Item, List } from "../types";
import type { GearSnapshot } from "../api/GearApi";

export interface Repository<K, V> {
  get(id: K): Promise<V | undefined>;
  getArr(ids: K[]): Promise<V[]>;
  getAll(): Promise<V[]>;
  save(entity: V): Promise<void>;
  delete(id: K): Promise<void>;
  getAllIds(): Promise<K[]>;
  clear(): Promise<void>;
  has(id: K): Promise<boolean>;
  count(): Promise<number>;
}

export type GearEntity = "list" | "category" | "item";

export interface GearStore {
  lists: Repository<number, List>;
  categories: Repository<number, Category>;
  items: Repository<number, Item>;
  nextId: (entity: GearEntity) => Promise<number>;
  mutate: <T>(action: () => Promise<T>) => Promise<T>;
  readSnapshot: () => Promise<GearSnapshot>;
}

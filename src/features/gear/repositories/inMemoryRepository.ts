import type { Repository } from "./types";

import type { Category, Item, List } from "../types";

// Copies keep callers from changing stored records without a service command.
export class InMemoryRepository<K, V extends { id: K }>
  implements Repository<K, V> {
  private map = new Map<K, V>();

  get(id: K): Promise<V | undefined> {
    const entity = this.map.get(id);
    return Promise.resolve(entity === undefined ? undefined : structuredClone(entity));
  }

  getArr(ids: K[]): Promise<V[]> {
    return Promise.resolve(
      structuredClone(ids
        .map((id) => this.map.get(id))
        .filter((item): item is V => item !== undefined)),
    );
  }

  getAll(): Promise<V[]> {
    return Promise.resolve(structuredClone(Array.from(this.map.values())));
  }

  save(entity: V): Promise<void> {
    this.map.set(entity.id, structuredClone(entity));
    return Promise.resolve();
  }

  replaceAll(entities: V[]): void {
    this.map = new Map(entities.map((entity) => [entity.id, structuredClone(entity)]));
  }

  delete(id: K): Promise<void> {
    this.map.delete(id);
    return Promise.resolve();
  }

  getAllIds(): Promise<K[]> {
    return Promise.resolve(Array.from(this.map.keys()));
  }

  clear(): Promise<void> {
    this.map.clear();
    return Promise.resolve();
  }

  has(id: K): Promise<boolean> {
    return Promise.resolve(this.map.has(id));
  }

  count(): Promise<number> {
    return Promise.resolve(this.map.size);
  }
}

export const categories = new InMemoryRepository<number, Category>();
export const lists = new InMemoryRepository<number, List>();
export const items = new InMemoryRepository<number, Item>();

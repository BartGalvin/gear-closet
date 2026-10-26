import type { Repository } from "../repositories/types";

export function assertIndexInBounds<T>(
  arr: T[],
  index: number,
  context: string,
) {
  if (!Number.isInteger(index) || index < 0 || index >= arr.length) {
    throw new Error(`Index ${index} out of bounds for ${context}`);
  }
}

export async function assertContains<K, V>(
  repo: Repository<K, V>,
  key: K,
  entityName = "Entity",
): Promise<void> {
  if (!(await repo.has(key))) {
    throw new Error(`${entityName} ${String(key)} not found`);
  }
}

export async function getUniqueEntityName<T>(
  baseName: string,
  repository: Repository<number, T>,
  getName: (entity: T) => string,
  ids?: number[],
): Promise<string> {
  const entities: T[] = ids
    ? await repository.getArr(ids)
    : await repository.getAll();
  const existingNames = getEntityNames(entities, getName);
  let name = baseName;
  let counter = 1;
  while (existingNames.has(name)) {
    name = `${baseName} (${counter++})`;
  }
  return name;
}

export async function getOrThrow<K, V extends { id: K }>(
  repo: Repository<K, V>,
  key: K,
): Promise<V> {
  const value: V | undefined = await repo.get(key);
  if (!value) throw new Error(`Entity with key ${String(key)} not found`);
  return value;
}

export function getEntityNames<T>(
  entities: T[],
  getName: (entity: T) => string,
): Set<string> {
  return new Set(
    entities
      .filter((entity): entity is T => entity !== undefined)
      .map((entity) => getName(entity))
      .filter((name): name is string => !!name),
  );
}
export async function setEntity<K, V>(
  repo: Repository<K, V>,
  value: V,
): Promise<V> {
  await repo.save(value);
  return value;
}

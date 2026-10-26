export function keyBy<T extends { id: number }>(arr: T[]): Record<number, T> {
  const map: Record<number, T> = {};
  arr.forEach((e) => (map[e.id] = e));
  return map;
}

export function forEachRecord<K extends number, V>(
  record: Record<K, V>,
  fn: (value: V, key: K) => void,
) {
  Object.entries(record).forEach(([key, value]) => {
    fn(value as V, Number(key) as K);
  });
}

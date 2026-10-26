// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteGearDatabase } from "../sqliteGearStore.ts";
import { createGearApi } from "../../src/features/gear/services/createGearApi.ts";

let database: SqliteGearDatabase;
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "gear-db-test-"));
  database = new SqliteGearDatabase(join(directory, "gear.sqlite"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await database.close();
  await rm(directory, { recursive: true, force: true });
});

it("persists every item field, ordering, and placement attribute across a database restart", async () => {
  let api = createGearApi(database.forUser("local"));
  const list = await api.createList({ name: "Weekend" });
  const shelter = await api.createCategory(list.id, { name: "Shelter" });
  const carry = await api.createCategory(list.id, { name: "Carry" });
  const first = await api.createPackedItem(shelter.id, {
    name: "Tent", description: "Two person", weight: 48.1234, unit: "oz", price: 300,
    url: "https://example.com/tent", image: "tent.jpg", tags: ["shelter", "shared"],
  }, { quantity: 2, worn: true, consumable: true, star: "red" });
  await api.createPackedItem(carry.id, { name: "Pack" }, {});
  await api.moveCategory(list.id, carry.id, 0);
  await api.movePackedItem(shelter.id, carry.id, first.packedItem.id, 0);
  await api.updateItem({ id: first.item.id, unit: "lb" });
  const before = await api.readSnapshot();
  expect(before.items.find((item) => item.id === first.item.id)).toMatchObject({ weight: 3.01, unit: "lb" });

  await database.close();
  database = new SqliteGearDatabase(join(directory, "gear.sqlite"));
  api = createGearApi(database.forUser("local"));
  expect(await api.readSnapshot()).toEqual(before);
  expect(before.lists[0].categoryIds).toEqual([carry.id, shelter.id]);
  expect(before.categories.find((category) => category.id === carry.id)?.packedItems[0]).toEqual(first.packedItem);
});

it("does not reuse committed IDs after deleting records and restarting", async () => {
  let api = createGearApi(database.forUser("local"));
  const item = await api.createItem({ name: "Old item" });
  await api.deleteItem(item.id);
  await database.close();
  database = new SqliteGearDatabase(join(directory, "gear.sqlite"));
  api = createGearApi(database.forUser("local"));
  expect((await api.createItem({ name: "New item" })).id).toBeGreaterThan(item.id);
});

it("rejects a newer schema without overwriting its contents", () => {
  const path = join(directory, "future.sqlite");
  const future = new DatabaseSync(path);
  future.exec("CREATE TABLE retained (value TEXT); INSERT INTO retained VALUES ('keep'); PRAGMA user_version = 2;");
  future.close();
  expect(() => new SqliteGearDatabase(path)).toThrow("Unsupported gear database version 2");
  const retained = new DatabaseSync(path);
  expect(retained.prepare("SELECT value FROM retained").get()?.value).toBe("keep");
  retained.close();
});

it("isolates users and rejects cross-user updates, moves, and item references", async () => {
  const alice = createGearApi(database.forUser("alice"));
  const bobStore = database.forUser("bob");
  const bob = createGearApi(bobStore);
  const aliceList = await alice.createList({ name: "Trip" });
  const aliceCategory = await alice.createCategory(aliceList.id, { name: "Shelter" });
  const { item, packedItem } = await alice.createPackedItem(aliceCategory.id, { name: "Tent" }, {});
  const bobList = await bob.createList({ name: "Trip" });
  const bobCategory = await bob.createCategory(bobList.id, { name: "Shelter" });
  const aliceBefore = await alice.readSnapshot();
  const bobBefore = await bob.readSnapshot();

  await expect(bob.updateItem({ id: item.id, name: "Stolen" })).rejects.toThrow("not found");
  await expect(bob.deleteList(aliceList.id)).rejects.toThrow("not found");
  await expect(bob.movePackedItem(aliceCategory.id, bobCategory.id, packedItem.id, 0)).rejects.toThrow("not found");
  await expect(bob.addPackedItem(bobCategory.id, item.id, {})).rejects.toThrow("not found");
  // Even bypassing the service checks cannot create a relationship to another owner.
  await expect(bobStore.mutate(() => bobStore.categories.save({
    ...bobCategory, packedItems: [{ ...packedItem, id: "forged-placement" }],
  }))).rejects.toThrow(/FOREIGN KEY/);
  expect(await bob.readSnapshot()).toEqual(bobBefore);
  expect(await alice.readSnapshot()).toEqual(aliceBefore);
});

it("rolls back inventory creation when the placement write fails, then accepts the next command", async () => {
  const store = database.forUser("local");
  const api = createGearApi(store);
  const list = await api.createList({ name: "Trip" });
  const category = await api.createCategory(list.id, { name: "Shelter" });
  const before = await api.readSnapshot();
  vi.spyOn(store.categories, "save").mockRejectedValueOnce(new Error("Disk write failed"));

  await expect(api.createPackedItem(category.id, { name: "Tent" }, {})).rejects.toThrow("Disk write failed");
  expect(await api.readSnapshot()).toEqual(before);
  await api.createPackedItem(category.id, { name: "Pack" }, {});
  expect((await api.readSnapshot()).items.map((item) => item.name)).toEqual(["Pack"]);
});

it("deletes one placement independently and removes shared placements when inventory is deleted", async () => {
  const api = createGearApi(database.forUser("local"));
  const list = await api.createList({ name: "Trip" });
  const first = await api.createCategory(list.id, { name: "First" });
  const second = await api.createCategory(list.id, { name: "Second" });
  const { item, packedItem } = await api.createPackedItem(first.id, { name: "Tent" }, {});
  const other = await api.addPackedItem(second.id, item.id, { quantity: 2 });
  await api.deletePackedItem(first.id, packedItem.id);
  expect((await api.readSnapshot()).items).toEqual([item]);
  expect((await api.readSnapshot()).categories[1].packedItems).toEqual([other.packedItem]);
  const deleted = await api.deleteItem(item.id);
  expect(deleted.updatedCategories).toHaveLength(1);
  expect((await api.readSnapshot()).categories.every((category) => category.packedItems.length === 0)).toBe(true);
  await api.deleteList(list.id);
  expect(await api.readSnapshot()).toEqual({ lists: [], categories: [], items: [] });
});

it("serializes concurrent commands and consistently snapshots only the requested user", async () => {
  const api = createGearApi(database.forUser("local"));
  const items = await Promise.all(Array.from({ length: 8 }, () => api.createItem({ name: "Tent" })));
  expect(new Set(items.map((item) => item.id)).size).toBe(8);
  expect(new Set(items.map((item) => item.name)).size).toBe(8);
  expect((await api.readSnapshot()).items).toEqual(items);
  expect(await createGearApi(database.forUser("other")).readSnapshot()).toEqual({ lists: [], categories: [], items: [] });
});

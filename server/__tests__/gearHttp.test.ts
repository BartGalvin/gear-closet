// @vitest-environment node
import { afterEach, beforeEach, expect, it } from "vitest";
import { createServer, get, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SqliteGearDatabase } from "../sqliteGearStore.ts";
import { createGearApi } from "../../src/features/gear/services/createGearApi.ts";
import { createGearHandler, type RemoteSimulation } from "../gearHttp.ts";
import { createHttpGearApi } from "../../src/features/gear/api/httpGearApi.ts";

let database: SqliteGearDatabase;
let server: Server;
let url: string;

async function startServer(simulation: RemoteSimulation = {}) {
  const handler = createGearHandler(createGearApi(database.forUser("local")), simulation);
  server = createServer((request, response) => handler(request, response, () => {
    response.writeHead(404); response.end();
  }));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/gear`;
}

async function stopServer() {
  if (server.listening) {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

beforeEach(async () => {
  database = new SqliteGearDatabase(":memory:");
  await startServer();
});

afterEach(async () => {
  await stopServer();
  await database.close();
});

it("delays requests while preserving client command and snapshot order", async () => {
  await stopServer();
  await startServer({ delayMs: 40 });
  const api = createHttpGearApi(url);
  const started = performance.now();
  const first = api.createItem({ name: "Tent" });
  const snapshot = api.readSnapshot();
  const second = api.createItem({ name: "Pack" });
  expect((await snapshot).items).toEqual([await first]);
  await second;
  expect(performance.now() - started).toBeGreaterThanOrEqual(100);
  expect((await api.readSnapshot()).items.map((item) => item.name)).toEqual(["Tent", "Pack"]);
});

it("simulates failures before a write and accepts later requests without changing saved data", async () => {
  await stopServer();
  await startServer({ failEvery: 3 });
  const api = createHttpGearApi(url);
  const saved = await api.createItem({ name: "Tent" });
  expect((await api.readSnapshot()).items).toEqual([saved]);
  await expect(api.createItem({ name: "Rejected" })).rejects.toThrow("Simulated remote backend failure");
  expect((await api.readSnapshot()).items).toEqual([saved]);
  expect((await api.createItem({ name: "Pack" })).name).toBe("Pack");
  await expect(api.readSnapshot()).rejects.toThrow("Simulated remote backend failure");
  expect((await api.readSnapshot()).items.map((item) => item.name)).toEqual(["Tent", "Pack"]);
});

it("runs the same domain contract over HTTP and recovers after a failed command", async () => {
  const api = createHttpGearApi(url);
  const list = await api.createList({ name: "Trip" });
  const category = await api.createCategory(list.id, { name: "Shelter" });
  const { item, packedItem } = await api.createPackedItem(category.id, { name: "Tent" }, { quantity: 2 });
  await api.addPackedItem(category.id, item.id, {});
  await expect(api.movePackedItem(category.id, 999, packedItem.id, 0)).rejects.toThrow("not found");
  await api.updateItem({ id: item.id, description: "Weatherproof" });
  const snapshot = await api.readSnapshot();
  expect(snapshot.items[0].description).toBe("Weatherproof");
  expect(snapshot.categories[0].packedItems.map((value) => value.quantity)).toEqual([2, 1]);
});

it("keeps concurrent client requests and their snapshots in order", async () => {
  const api = createHttpGearApi(url);
  const first = api.createItem({ name: "First" });
  const snapshot = api.readSnapshot();
  const second = api.createItem({ name: "Second" });
  expect((await snapshot).items).toEqual([await first]);
  await second;
  expect((await api.readSnapshot()).items.map((item) => item.name)).toEqual(["First", "Second"]);
});

it.each([
  ["updateItem", [{ id: 1, owner_id: "other" }], 400],
  ["createItem", [{ weight: "heavy" }], 400],
  ["movePackedItem", [1, 2, "placement", -1], 400],
  ["createList", [{ name: "Trip" }, "extra argument"], 400],
  ["toString", [], 404],
])("rejects invalid %s requests before changing data", async (operation, args, expectedStatus) => {
  const response = await fetch(`${url}/${String(operation)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  expect(response.status).toBe(expectedStatus);
  expect(await createHttpGearApi(url).readSnapshot()).toEqual({ lists: [], categories: [], items: [] });
});

it("rejects requests from another origin and does not accept an owner from client headers", async () => {
  const rejected = await fetch(`${url}/createItem`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.com" }, body: '[{"name":"Injected"}]',
  });
  expect(rejected.status).toBe(403);
  const accepted = await fetch(`${url}/createItem`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "other" }, body: '[{"name":"Local item"}]',
  });
  expect(accepted.status).toBe(200);
  expect((await createHttpGearApi(url).readSnapshot()).items.map((item) => item.name)).toEqual(["Local item"]);
  expect((await createGearApi(database.forUser("other")).readSnapshot()).items).toEqual([]);
});

it("rejects a nonlocal Host header before serving data", async () => {
  const status = await new Promise<number | undefined>((resolve, reject) => {
    get(url, { headers: { Host: "example.com" } }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on("error", reject);
  });
  expect(status).toBe(403);
});

import type { IncomingMessage, ServerResponse } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import type { GearApi } from "../src/features/gear/api/GearApi.ts";

export interface RemoteSimulation {
  delayMs?: number;
  failEvery?: number;
}

type Rule = (value: unknown) => boolean;
const text: Rule = (value) => typeof value === "string";
const id: Rule = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const index: Rule = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const amount: Rule = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const boolean: Rule = (value) => typeof value === "boolean";
const star: Rule = (value) => typeof value === "string" && ["none", "red", "yellow", "green"].includes(value);
const tags: Rule = (value) => Array.isArray(value) && value.every((tag: unknown) => typeof tag === "string");

function object(fields: Record<string, Rule>, required: string[] = []): Rule {
  return (value) => value !== null && typeof value === "object" && !Array.isArray(value)
    && required.every((key) => Object.hasOwn(value, key))
    && Object.entries(value).every(([key, entry]) => Object.hasOwn(fields, key) && fields[key](entry));
}

const itemFields = { name: text, description: text, image: text, url: text, tags, weight: amount, unit: text, price: amount };
const packedFields = { id: text, quantity: amount, worn: boolean, consumable: boolean, star };
const requests: Record<Exclude<keyof GearApi, "readSnapshot">, Rule[]> = {
  createList: [object({ name: text })],
  updateList: [object({ id, name: text }, ["id", "name"])],
  deleteList: [id],
  moveCategory: [id, id, index],
  createCategory: [id, object({ name: text })],
  updateCategory: [object({ id, name: text, listId: id }, ["id", "name"])],
  deleteCategory: [id],
  createItem: [object(itemFields)],
  updateItem: [object({ ...itemFields, id }, ["id"])],
  deleteItem: [id],
  createPackedItem: [id, object(itemFields), object(packedFields)],
  addPackedItem: [id, id, object(packedFields), (value) => value === undefined || index(value)],
  updatePackedItem: [id, object({ ...packedFields, itemId: id }, ["id"])],
  deletePackedItem: [id, text],
  movePackedItem: [id, id, text, index],
};

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > 1024 * 1024) throw new HttpError(413, "Gear request is too large");
  }
  try { return JSON.parse(body) as unknown; }
  catch { throw new HttpError(400, "Invalid JSON request"); }
}

function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

// Identity is already bound to api by the server. The client cannot select an owner.
export function createGearHandler(api: GearApi, { delayMs = 0, failEvery = 0 }: RemoteSimulation = {}) {
  let requestCount = 0;
  const simulateRemote = async () => {
    const shouldFail = failEvery > 0 && ++requestCount % failEvery === 0;
    if (delayMs > 0) await delay(delayMs);
    // Reject before executing a command so a simulated failure never changes saved data.
    if (shouldFail) throw new HttpError(503, "Simulated remote backend failure. Try again.");
  };

  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = (request.url ?? "").split("?")[0];
    if (path !== "/api/gear" && !path.startsWith("/api/gear/")) { next(); return; }

    const handle = async () => {
      const host = `http://${request.headers.host ?? ""}`;
      if (!URL.canParse(host) || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(host).hostname)) {
        throw new HttpError(403, "Host not allowed");
      }
      if (request.method === "GET" && path === "/api/gear") {
        await simulateRemote();
        send(response, 200, await api.readSnapshot());
        return;
      }
      if (request.method !== "POST") throw new HttpError(405, "Method not allowed");
      const origin = request.headers.origin;
      if (origin && (!URL.canParse(origin) || new URL(origin).host !== request.headers.host)) throw new HttpError(403, "Origin not allowed");
      if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
        throw new HttpError(415, "Expected an application/json request");
      }
      const method = path.slice("/api/gear/".length);
      if (!Object.hasOwn(requests, method)) throw new HttpError(404, "Unknown gear operation");
      const operation = method as Exclude<keyof GearApi, "readSnapshot">;
      const args = await readBody(request);
      const rules = requests[operation];
      if (!Array.isArray(args) || args.length > rules.length || !rules.every((rule, i) => rule(args[i]))) {
        throw new HttpError(400, "Invalid arguments for gear operation");
      }
      // Every operation and argument has been checked against the explicit contract above.
      const action = api[operation] as (...args: unknown[]) => Promise<unknown>;
      const validatedArgs: unknown[] = args;
      await simulateRemote();
      send(response, 200, await action(...validatedArgs));
    };

    void handle().catch((error: unknown) => {
      if (error instanceof HttpError) { send(response, error.status, { error: error.message }); return; }
      const message = error instanceof Error ? error.message : "";
      if (/not found|not available/.test(message)) send(response, 404, { error: message });
      else if (/out of bounds|not supported/.test(message)) send(response, 400, { error: message });
      else { console.error("Gear request failed:", error); send(response, 500, { error: "Could not complete the gear request." }); }
    });
  };
}

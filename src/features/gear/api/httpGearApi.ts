import type { GearApi } from "./GearApi";

export function createHttpGearApi(baseUrl = "/api/gear"): GearApi {
  let pending: Promise<void> = Promise.resolve();

  function request<T>(method: keyof GearApi, args: unknown[] = []): Promise<T> {
    while (args.length && args[args.length - 1] === undefined) args.pop();
    // Preserve request order, including snapshot reads, across network delays and failures.
    const result = pending.then(async () => {
      let response: Response;
      try {
        response = await fetch(method === "readSnapshot" ? baseUrl : `${baseUrl}/${method}`, {
          method: method === "readSnapshot" ? "GET" : "POST",
          headers: { "Content-Type": "application/json" },
          ...(method === "readSnapshot" ? {} : { body: JSON.stringify(args) }),
        });
      } catch {
        throw new Error("Could not connect to saved gear. Check that the local server is running.");
      }
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error : "The gear request failed.";
        throw new Error(message);
      }
      return body as T;
    });
    pending = result.then(() => undefined, () => undefined);
    return result;
  }

  return {
    readSnapshot: () => request("readSnapshot"),
    createList: (...args) => request("createList", args),
    updateList: (...args) => request("updateList", args),
    deleteList: (...args) => request("deleteList", args),
    moveCategory: (...args) => request("moveCategory", args),
    createCategory: (...args) => request("createCategory", args),
    updateCategory: (...args) => request("updateCategory", args),
    deleteCategory: (...args) => request("deleteCategory", args),
    createItem: (...args) => request("createItem", args),
    updateItem: (...args) => request("updateItem", args),
    deleteItem: (...args) => request("deleteItem", args),
    createPackedItem: (...args) => request("createPackedItem", args),
    addPackedItem: (...args) => request("addPackedItem", args),
    updatePackedItem: (...args) => request("updatePackedItem", args),
    deletePackedItem: (...args) => request("deletePackedItem", args),
    movePackedItem: (...args) => request("movePackedItem", args),
  };
}

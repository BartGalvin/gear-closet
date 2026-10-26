import type { Plugin } from "vite";
import { resolve } from "node:path";
import { SqliteGearDatabase } from "./sqliteGearStore.ts";
import { createGearApi } from "../src/features/gear/services/createGearApi.ts";
import { createGearHandler } from "./gearHttp.ts";

export function gearPlugin(): Plugin {
  return {
    name: "local-gear-api",
    configureServer(server) {
      const path = process.env.GEAR_DB_PATH ?? resolve(server.config.root, "data/gear.sqlite");
      const delayMs = Number(process.env.GEAR_API_DELAY_MS ?? 0);
      const failEvery = Number(process.env.GEAR_API_FAIL_EVERY ?? 0);
      if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 60_000) {
        throw new Error("GEAR_API_DELAY_MS must be an integer between 0 and 60000");
      }
      if (!Number.isSafeInteger(failEvery) || failEvery < 0) {
        throw new Error("GEAR_API_FAIL_EVERY must be a nonnegative integer");
      }
      const database = new SqliteGearDatabase(path);
      server.middlewares.use(createGearHandler(createGearApi(database.forUser("local")), { delayMs, failEvery }));
      server.httpServer?.once("close", () => { void database.close(); });
      server.config.logger.info(`Gear database: ${path}`);
      if (delayMs || failEvery) {
        server.config.logger.info(`Gear API simulation: ${delayMs} ms delay; ${failEvery ? `every ${failEvery} requests fails` : "failures disabled"}`);
      }
    },
  };
}

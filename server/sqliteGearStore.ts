import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Category, Item, List, PackedItem } from "../src/features/gear/types.ts";
import type { GearStore, Repository } from "../src/features/gear/repositories/types.ts";

type Row = Record<string, SQLOutputValue>;
type Table = "items" | "lists" | "categories";

export class SqliteGearDatabase {
  private readonly db: DatabaseSync;
  private pending: Promise<void> = Promise.resolve();

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
      const version = Number(this.db.prepare("PRAGMA user_version").get()?.user_version);
      if (version === 0) {
        this.db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
      } else if (version !== 1) {
        throw new Error(`Unsupported gear database version ${version}`);
      }
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  private enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = this.pending.then(action);
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }

  private async transaction<T>(action: () => Promise<T>, write: boolean): Promise<T> {
    this.db.exec(write ? "BEGIN IMMEDIATE" : "BEGIN");
    try {
      const result = await action();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // Owner identity comes from the server, never from request payloads.
  forUser(ownerId: string): GearStore {
    if (!ownerId) throw new Error("A user identity is required");

    const repository = <T extends { id: number }>(
      table: Table,
      fromRow: (row: Row) => T,
      write: (value: T) => void,
    ): Repository<number, T> => {
      const find = (id: number): T | undefined => {
        const row = this.db.prepare(`SELECT * FROM ${table} WHERE owner_id = ? AND id = ?`).get(ownerId, id);
        return row ? fromRow(row) : undefined;
      };
      return {
        get: (id) => Promise.resolve(find(id)),
        getArr: (ids) => Promise.resolve(ids.map(find).filter((value): value is T => value !== undefined)),
        getAll: () => Promise.resolve(this.db.prepare(`SELECT * FROM ${table} WHERE owner_id = ? ORDER BY id`).all(ownerId).map(fromRow)),
        save: (value) => { write(value); return Promise.resolve(); },
        delete: (id) => { this.db.prepare(`DELETE FROM ${table} WHERE owner_id = ? AND id = ?`).run(ownerId, id); return Promise.resolve(); },
        clear: () => { this.db.prepare(`DELETE FROM ${table} WHERE owner_id = ?`).run(ownerId); return Promise.resolve(); },
        has: (id) => Promise.resolve(find(id) !== undefined),
        getAllIds: () => Promise.resolve(this.db.prepare(`SELECT id FROM ${table} WHERE owner_id = ? ORDER BY id`).all(ownerId).map((row) => Number(row.id))),
        count: () => Promise.resolve(Number(this.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_id = ?`).get(ownerId)?.count)),
      };
    };

    const assertWritten = (changes: number | bigint) => {
      if (Number(changes) !== 1) throw new Error("Record is not available to this user");
    };

    const items = repository<Item>("items", (row) => JSON.parse(String(row.data)) as Item, (item) => {
      const result = this.db.prepare(`
        INSERT INTO items (id, owner_id, data) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data WHERE items.owner_id = excluded.owner_id
      `).run(item.id, ownerId, JSON.stringify(item));
      assertWritten(result.changes);
    });

    const lists = repository<List>("lists", (row) => ({
      id: Number(row.id), name: String(row.name),
      categoryIds: this.db.prepare("SELECT id FROM categories WHERE owner_id = ? AND list_id = ? ORDER BY position, id")
        .all(ownerId, Number(row.id)).map((category) => Number(category.id)),
    }), (list) => {
      const result = this.db.prepare(`
        INSERT INTO lists (id, owner_id, name) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name WHERE lists.owner_id = excluded.owner_id
      `).run(list.id, ownerId, list.name);
      assertWritten(result.changes);
      const reorder = this.db.prepare("UPDATE categories SET position = ? WHERE owner_id = ? AND list_id = ? AND id = ?");
      list.categoryIds.forEach((id, index) => reorder.run(index, ownerId, list.id, id));
    });

    const categories = repository<Category>("categories", (row) => ({
      id: Number(row.id), listId: Number(row.list_id), name: String(row.name),
      packedItems: this.db.prepare("SELECT * FROM packed_items WHERE owner_id = ? AND category_id = ? ORDER BY position, id")
        .all(ownerId, Number(row.id)).map((placement): PackedItem => ({
          id: String(placement.id), itemId: Number(placement.item_id), quantity: Number(placement.quantity),
          worn: placement.worn === 1, consumable: placement.consumable === 1, star: placement.star as PackedItem["star"],
        })),
    }), (category) => {
      const position = this.db.prepare("SELECT position FROM categories WHERE owner_id = ? AND id = ?").get(ownerId, category.id)?.position
        ?? this.db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM categories WHERE owner_id = ? AND list_id = ?").get(ownerId, category.listId)?.position;
      const result = this.db.prepare(`
        INSERT INTO categories (id, owner_id, list_id, name, position) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name WHERE categories.owner_id = excluded.owner_id
      `).run(category.id, ownerId, category.listId, category.name, Number(position));
      assertWritten(result.changes);
      this.db.prepare("DELETE FROM packed_items WHERE owner_id = ? AND category_id = ?").run(ownerId, category.id);
      const insert = this.db.prepare(`INSERT INTO packed_items
        (id, owner_id, category_id, item_id, position, quantity, worn, consumable, star) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      category.packedItems.forEach((item, index) => {
        insert.run(item.id, ownerId, category.id, item.itemId, index, item.quantity, Number(item.worn), Number(item.consumable), item.star);
      });
    });

    return {
      lists, categories, items,
      nextId: (entity) => {
        const row = this.db.prepare(`INSERT INTO sequences (entity, value) VALUES (?, 1)
          ON CONFLICT(entity) DO UPDATE SET value = value + 1 RETURNING value`).get(entity);
        return Promise.resolve(Number(row?.value));
      },
      mutate: (action) => this.enqueue(() => this.transaction(async () => {
        this.db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(ownerId);
        return action();
      }, true)),
      readSnapshot: () => this.enqueue(() => this.transaction(async () => ({
        lists: await lists.getAll(), categories: await categories.getAll(), items: await items.getAll(),
      }), false)),
    };
  }

  close(): Promise<void> {
    return this.enqueue(() => { this.db.close(); return Promise.resolve(); });
  }
}

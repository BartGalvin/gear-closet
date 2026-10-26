BEGIN IMMEDIATE;
CREATE TABLE users (id TEXT PRIMARY KEY);
CREATE TABLE sequences (entity TEXT PRIMARY KEY, value INTEGER NOT NULL);
CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  data TEXT NOT NULL CHECK (json_valid(data)),
  UNIQUE (owner_id, id)
);
CREATE TABLE lists (
  id INTEGER PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  UNIQUE (owner_id, id)
);
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  list_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE (owner_id, id),
  FOREIGN KEY (owner_id, list_id) REFERENCES lists(owner_id, id) ON DELETE CASCADE
);
CREATE INDEX categories_by_list ON categories(owner_id, list_id, position);
CREATE TABLE packed_items (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  category_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  quantity REAL NOT NULL CHECK (quantity >= 0),
  worn INTEGER NOT NULL CHECK (worn IN (0, 1)),
  consumable INTEGER NOT NULL CHECK (consumable IN (0, 1)),
  star TEXT NOT NULL CHECK (star IN ('none', 'red', 'yellow', 'green')),
  FOREIGN KEY (owner_id, category_id) REFERENCES categories(owner_id, id) ON DELETE CASCADE,
  -- Domain commands remove every placement before an item deletion commits.
  FOREIGN KEY (owner_id, item_id) REFERENCES items(owner_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX placements_by_category ON packed_items(owner_id, category_id, position);
PRAGMA user_version = 1;
COMMIT;

# Architecture

The UI and domain code live in `src/features/gear`; the local HTTP server and
SQLite storage live in `server`.

## Model

- `Item` is reusable inventory: name, description, weight, price, and other metadata.
- `PackedItem` references inventory and holds quantity, worn/consumable flags, and a star.
- `Category` contains ordered placements and belongs to one list.
- `List` contains ordered category IDs.

Editing inventory updates every placement's shared fields. Removing a placement
keeps the inventory; deleting inventory removes all its placements. Deleting a
list or category keeps its inventory. Moves retain placement IDs and attributes.
Categories can be reordered within their list; editing a category cannot change
its parent list.

Empty item drafts stay in the UI until they contain meaningful details. Items
retain their chosen weight unit; changing the unit converts the amount. Item
weights are saved with at most two decimal places. Summaries convert weights to
grams before summing and display one decimal place in the selected unit. Base
weight excludes worn and consumable placements.

## Commands and state

```text
Component / drag handler -> GearProvider -> GearApi -> HTTP handler
  -> services -> owner-scoped GearStore -> SQLite transaction
  -> committed snapshot -> GearProvider -> React
```

[GearApi](../src/features/gear/api/GearApi.ts) is the UI's storage-independent
contract. The [HTTP client](../src/features/gear/api/httpGearApi.ts) uses
`GET /api/gear` for snapshots and `POST /api/gear/<operation>` with JSON argument
arrays for commands. Requests stay ordered across reads, writes, and failures.

[createGearApi](../src/features/gear/services/createGearApi.ts) binds domain
commands to a [GearStore](../src/features/gear/repositories/types.ts). Compound
operations run inside one `mutate` boundary. Internal helpers share that store;
a nested queued command would deadlock.

[GearProvider](../src/features/gear/context/GearProvider.tsx) publishes complete
snapshots as ID-keyed records. Category IDs and placement arrays define display
order. Selection is local UI state. Failed commands reject and appear in the
app's error banner.

## Storage

[SqliteGearDatabase](../server/sqliteGearStore.ts) queues commands and snapshot
reads per connection. Writes use `BEGIN IMMEDIATE`; any failure rolls back the
transaction, including ID allocation. Persistent sequences prevent reuse of
committed IDs. Unsupported schema versions fail at startup.

The [schema](../server/schema.sql) stores category and placement order as positions,
with item metadata in JSON. Composite foreign keys keep relationships within one
owner. The deferred inventory reference permits item deletion and placement
cleanup within the same transaction.

The server binds the `local` owner. The HTTP handler validates operations and
arguments; clients cannot choose an owner through payloads or headers.

Tests inject a memory API using the same domain commands. Memory repositories
clone records, and their store restores records when a command fails.

## Drag/drop

[GearDnDContext](../src/features/gear/dnd/GearDnDContext.tsx) handles category
reordering and item movement. Category overlays and item drop previews use
read-only markup to avoid duplicate sortable registrations. An item preview
occupies the destination row's gap; drop handling commits that position.

# Gear Closet

A React and TypeScript app for organizing backpacking inventory and packing
lists, with local SQLite storage behind an HTTP API.

Inspired by [LighterPack](https://lighterpack.com).

## Run

Requires Node.js 24.12 or newer. SQLite is built into Node.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To choose a port:

```sh
npm run dev -- --port 5176 --strictPort
```

The workspace starts empty. Data persists across browser reloads and server
restarts in `data/gear.sqlite`; set `GEAR_DB_PATH` to use another file. The data
folder and SQLite journal files are ignored by Git.

The API runs inside Vite, bound to `127.0.0.1`, with one local identity.
Authentication and production API hosting are not implemented. `npm run build`
creates the frontend bundle; `npm run preview` serves it without the API.

## Checks

```sh
npm run check
```

Runs TypeScript, ESLint, and Vitest. `npm test` runs Vitest in watch mode.
Tests are colocated in `src/features/gear/**/__tests__` and `server/__tests__`.
Database and HTTP tests use temporary storage and loopback ports.

## Layout

```text
server/                        SQLite schema, repositories, HTTP handler, Vite plugin
src/features/gear/
  api/                         GearApi contract and HTTP client
  item/, packedItem/,           Domain types, selectors, hooks, placement logic
  category/, list/
  components/, dnd/             UI and drag/drop interaction
  context/                     Shared React snapshot and selection
  services/                    Domain commands and store binding
  repositories/                Storage interfaces and memory implementation
  fixtures/                    Test data, memory API, provider wrapper
  hooks/, utils/               Shared feature helpers
```

See [architecture](docs/architecture.md) for the model and data flow.

Copyright (c) 2026 Bartholomew Galvin

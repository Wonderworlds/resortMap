---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 3.5: End-to-End Pipeline Integration Test

Status: review

## Story

**As a** developer,
**I want** an automated test that exercises the full builder-to-viewer pipeline end-to-end,
**So that** I can confirm a `.gwmap` file authored via builder-core is correctly parsed and processed by view-core, validating the SPEC success signal before any adapter is involved.

## Acceptance Criteria

1. **Given** a `MapConfig` created via `createMapConfig`, `addPoi`, `addNode`, and `addEdge` from builder-core **When** I call `serializeGwmap(config)` to produce a JSON string **And** then call `parseGwmap(jsonString)` from view-core **Then** the parsed result deep-equals the original config (round-trip integrity)

2. **Given** a parsed `MapConfig` with at least 2 POIs each connected to graph nodes **When** I call `computeRoute(config, poiA.id, poiB.id)` from view-core **Then** it returns a `Route` with a non-empty `nodes` array, a positive `distanceMeters`, and a positive `walkTimeSeconds`

3. **Given** a parsed `MapConfig` with POIs of mixed tags **When** I call `filterPois(config, { tags: [oneTag] })` **Then** it returns only POIs carrying that tag

4. **Given** the same parsed `MapConfig` **When** I call `filterPois(config, {})` **Then** it returns all POIs

5. **Given** the test file **When** I inspect its imports **Then** it imports only from `@resort-map/builder-core` and `@resort-map/view-core` — no adapter packages involved

## Tasks / Subtasks

- [x] Add `@resort-map/builder-core` to `view-core`'s devDependencies and run `bun install` (AC: 5)
  - [x] Edit `packages/view-core/package.json`: add `"devDependencies": { "@resort-map/builder-core": "workspace:*" }`
  - [x] Run `bun install` from workspace root

- [x] Write tests FIRST (RED phase) in `packages/view-core/src/__tests__/pipeline.test.ts`, then verify they fail (AC: 1–5)

- [x] Confirm all 4 tests pass (GREEN phase) — no new source files to implement; the pipeline already works (AC: 1–5)

- [x] Run `bun test` from workspace root — all tests pass (153 existing + 4 new = 157 total) (AC: 1–5)

## Dev Notes

### Story Purpose

This is a test-only story. No new source code is introduced to `view-core` or `builder-core`. The entire implementation is the test file `packages/view-core/src/__tests__/pipeline.test.ts`. The test validates that the two libraries compose correctly over the `.gwmap` serialization boundary, satisfying the SPEC "Success signal" (Epic 3, Story 3.5).

### CRITICAL: Package Dependency Change

`packages/view-core/package.json` currently has only `@resort-map/types` as a dependency. For the integration test to import from `@resort-map/builder-core`, it must be added as a `devDependency`:

```json
{
  "name": "@resort-map/view-core",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build src/index.ts --target browser --outdir dist"
  },
  "dependencies": {
    "@resort-map/types": "workspace:*"
  },
  "devDependencies": {
    "@resort-map/builder-core": "workspace:*"
  }
}
```

Run `bun install` after this change. Without this, the import of `@resort-map/builder-core` will fail with module-not-found at test time.

### Import Disambiguation

Both `@resort-map/builder-core` and `@resort-map/view-core` export a `parseGwmap` function. The test must import `parseGwmap` **only from view-core**, and `serializeGwmap` + authoring functions from builder-core. Use aliased imports to avoid confusion:

```ts
import { createMapConfig, addPoi, addNode, addEdge, serializeGwmap } from '@resort-map/builder-core';
import { parseGwmap, computeRoute, filterPois } from '@resort-map/view-core';
```

Do NOT import `parseGwmap` from builder-core in this test — AC 1 explicitly requires the view-core parser.

### Test Data Construction Pattern — Nodes First, Then POIs

builder-core's `addNode` auto-generates UUIDs (via `crypto.randomUUID()`). You cannot know the node ID before calling `addNode`. **Always add nodes first, then capture their IDs, then add POIs that reference those IDs.**

```ts
// Step 1: Create base config
let config = createMapConfig({
  backgroundImageUrl: 'https://example.com/resort.png',
  center: { x: 512, y: 400 },
  scale: 0.5,
});

// Step 2: Add nodes first — capture generated IDs
config = addNode(config, { position: { x: 100, y: 200 } });
const nodeA = config.graph.nodes.at(-1)!;   // non-null: we just added it

config = addNode(config, { position: { x: 500, y: 200 } });
const nodeB = config.graph.nodes.at(-1)!;

// Step 3: Add edge between nodes
config = addEdge(config, { from: nodeA.id, to: nodeB.id });

// Step 4: Add POIs with nodeId pointing to graph nodes
config = addPoi(config, { label: 'Entrance', position: { x: 100, y: 200 }, tags: ['info'], nodeId: nodeA.id });
const poiA = config.pois.at(-1)!;

config = addPoi(config, { label: 'Restaurant', position: { x: 500, y: 200 }, tags: ['food'], nodeId: nodeB.id });
const poiB = config.pois.at(-1)!;

config = addPoi(config, { label: 'Pool', position: { x: 300, y: 400 }, tags: ['leisure'] });
```

### `noUncheckedIndexedAccess` Compliance

The project has `"noUncheckedIndexedAccess": true` in `tsconfig.base.json`. Bracket notation `arr[i]` returns `T | undefined`. Use `.at(-1)!` (non-null assertion) in test setup where you just appended an element and know it exists:

```ts
const nodeA = config.graph.nodes.at(-1)!;  // OK — non-null, we just added it
const poiA  = config.pois.at(-1)!;         // OK — non-null, we just added it
```

For test assertions where the value may be absent, use optional chaining:
```ts
expect(route?.nodes).toBeDefined();
expect(route?.nodes.length).toBeGreaterThan(0);
```

Or assert non-null first:
```ts
expect(route).not.toBeNull();
const r = route!;
expect(r.nodes.length).toBeGreaterThan(0);
```

### `verbatimModuleSyntax` — Type-Only Imports

No type-only imports are needed in this test file. `MapConfig`, `Route`, etc. are not directly referenced by type in the test — they are inferred from the return values of the functions. All imports are runtime values from the two packages.

### Round-Trip Deep-Equality

`validateGwmap` (called by view-core's `parseGwmap`) strips unknown top-level fields (ADR-006) and rebuilds the object from scratch, keeping only `version`, `map`, `pois`, and `graph`. Since `createMapConfig` + `addPoi` + `addNode` + `addEdge` only produce these known fields, the round-trip will deep-equal the original `config` object. No field reordering or type coercion occurs that would break `toEqual`.

### computeRoute Behavior

`computeRoute` with POI IDs (strings) calls `resolveNode`, which:
1. Looks up the POI by id
2. If `poi.nodeId` is set and exists in `graph.nodes`, uses that node directly
3. Otherwise snaps to `nearestNode`

Since the test POIs have `nodeId` set to valid graph nodes connected by an edge, `computeRoute(config, poiA.id, poiB.id)` will find a 2-node path `[nodeA, nodeB]` with `distanceMeters = pixelDistance({x:100,y:200}, {x:500,y:200}) * 0.5 = 400 * 0.5 = 200`, and `walkTimeSeconds = Math.round(200 / 1.4) = 143`.

### filterPois Behavior

- `filterPois(config, { tags: ['food'] })` → only `poiB` (Restaurant, tags: ['food'])
- `filterPois(config, {})` → all 3 POIs (Entrance, Restaurant, Pool)

### Complete Test File

```ts
import { test, expect, describe } from 'bun:test';
import { createMapConfig, addPoi, addNode, addEdge, serializeGwmap } from '@resort-map/builder-core';
import { parseGwmap, computeRoute, filterPois } from '@resort-map/view-core';

// --- Shared test fixture built with builder-core ---

let config = createMapConfig({
  backgroundImageUrl: 'https://example.com/resort.png',
  center: { x: 512, y: 400 },
  scale: 0.5,
});

// Nodes first — IDs are generated by builder-core
config = addNode(config, { position: { x: 100, y: 200 } });
const nodeA = config.graph.nodes.at(-1)!;

config = addNode(config, { position: { x: 500, y: 200 } });
const nodeB = config.graph.nodes.at(-1)!;

config = addEdge(config, { from: nodeA.id, to: nodeB.id });

// POIs reference the already-created node IDs
config = addPoi(config, { label: 'Entrance', position: { x: 100, y: 200 }, tags: ['info'], nodeId: nodeA.id });
const poiA = config.pois.at(-1)!;

config = addPoi(config, { label: 'Restaurant', position: { x: 500, y: 200 }, tags: ['food'], nodeId: nodeB.id });
const poiB = config.pois.at(-1)!;

config = addPoi(config, { label: 'Pool', position: { x: 300, y: 400 }, tags: ['leisure'] });

const serialized = serializeGwmap(config);
const parsed = parseGwmap(serialized);

// --- Tests ---

describe('End-to-end pipeline: builder-core → view-core', () => {
  test('round-trip: serializeGwmap → parseGwmap deep-equals original config', () => {
    expect(parsed).toEqual(config);
  });

  test('computeRoute returns a valid route between two connected POIs', () => {
    const route = computeRoute(parsed, poiA.id, poiB.id);
    expect(route).not.toBeNull();
    expect(route!.nodes.length).toBeGreaterThan(0);
    expect(route!.distanceMeters).toBeGreaterThan(0);
    expect(route!.walkTimeSeconds).toBeGreaterThan(0);
  });

  test('filterPois with tag filter returns only matching POIs', () => {
    const result = filterPois(parsed, { tags: ['food'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(poiB.id);
  });

  test('filterPois with empty options returns all POIs', () => {
    const result = filterPois(parsed, {});
    expect(result).toHaveLength(3);
  });
});
```

### Files to Create / Modify

```
packages/view-core/
  package.json                            ← UPDATE: add @resort-map/builder-core devDependency
  src/__tests__/
    pipeline.test.ts                      ← CREATE: 4 integration tests
```

### What Exists After Story 3.4 (State Going Into This Story)

**`packages/view-core/src/index.ts`:**
```ts
export { parseGwmap } from './parseGwmap.ts';
export { computeRoute } from './computeRoute.ts';
export { filterPois } from './filterPois.ts';
export { viewerReducer, initialViewerState } from './viewerState.ts';
```

**`packages/builder-core/src/index.ts`:**
```ts
export { createMapConfig, addPoi, removePoi, updatePoi, addNode, addEdge, removeNode, removeEdge } from './mapConfig.ts';
export { serializeGwmap, parseGwmap } from './serialization.ts';
```

Existing test count: 153 (across 12 files). Adding 4 new tests gives 157 total.

### NFR Compliance

- **NFR4**: No React imports in `view-core` — this test file has none.
- **NFR10**: `computeRoute` is deterministic (pure Dijkstra, same inputs → same output). The test calls it once; no determinism verification needed in this story.
- **No adapter packages**: test imports only from `@resort-map/builder-core` and `@resort-map/view-core` (AC5).

### Previous Story Learnings

From Story 3.4 (viewerReducer):
- Write tests in RED state first, confirm failure, then implement.
- Use `import type` for type-only imports — not needed here since all imports are runtime values.
- `noUncheckedIndexedAccess` requires optional chaining on array index access in assertions.
- Use `.at(-1)!` for test setup where you just appended an element.

From Story 3.1 (pixelMath/graphUtils — existing test pattern):
- `complexMap as unknown as MapConfig` pattern used when importing JSON fixture as MapConfig.
- Not needed here since config is programmatically built.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean run, no failures.

### Completion Notes List

- Added `@resort-map/builder-core: workspace:*` to `packages/view-core/package.json` devDependencies; `bun install` resolved cleanly.
- Created `packages/view-core/src/__tests__/pipeline.test.ts` with 4 integration tests covering all 5 ACs.
- Tests use nodes-first pattern (addNode → capture ID, then addPoi with nodeId) to ensure valid graph connections.
- All 4 tests passed immediately on first run — the builder-core → view-core pipeline was already correct.
- Full suite: 157 tests pass (153 existing + 4 new), 0 failures.
- AC5 verified: test imports only from `@resort-map/builder-core` and `@resort-map/view-core`.

### File List

- `packages/view-core/package.json` (modified — added @resort-map/builder-core devDependency)
- `packages/view-core/src/__tests__/pipeline.test.ts` (created — 4 integration tests)
- `bun.lock` (modified — lockfile updated)

### Change Log

- 2026-06-18: Implemented Story 3.5 — End-to-end pipeline integration test; added builder-core devDep to view-core; created pipeline.test.ts with 4 tests validating the full builder-to-viewer round-trip.

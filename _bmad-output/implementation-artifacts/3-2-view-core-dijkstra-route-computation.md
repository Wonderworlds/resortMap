---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 3.2: view-core — Dijkstra Route Computation

Status: review

## Story

**As a** viewer adapter (view-react or view-react-native),
**I want** `computeRoute(config, from, to)` to return an ordered list of graph nodes and a walk time between any two points,
**So that** I can display the shortest walking path between two positions on the map.

## Acceptance Criteria

1. **Given** a `MapConfig` with a connected graph and two POI ids as `from` and `to` **When** I call `computeRoute(config, fromPoiId, toPoiId)` **Then** it returns a `Route` with `nodes` (ordered path), `distanceMeters`, and `walkTimeSeconds` **And** `walkTimeSeconds` equals `Math.round(distanceMeters / 1.4)`

2. **Given** a `Position` (not a POI id) as `from` or `to` **When** `computeRoute` is called **Then** it snaps the position to the nearest graph node via `nearestNode` before pathfinding

3. **Given** a POI with a valid `nodeId` **When** `computeRoute` is called with that POI id **Then** it uses `nodeId` directly without snapping

4. **Given** a POI without a `nodeId` **When** `computeRoute` is called with that POI id **Then** it snaps to the nearest node via `nearestNode`

5. **Given** no path exists between `from` and `to` in the graph **When** `computeRoute` is called **Then** it returns `null` (not an error, per FR4)

6. **Given** identical inputs to `computeRoute` called twice **When** both calls return a `Route` **Then** the two results are deep-equal (deterministic, NFR10)

7. **Given** a `MapConfig` from the `complex.gwmap` fixture (multi-node connected graph) **When** I call `computeRoute` between two POIs connected by a known path **Then** the returned `nodes` array matches the expected shortest path

## Tasks / Subtasks

- [x] Create `packages/view-core/src/computeRoute.ts` with the `computeRoute` public function
  - [x] Implement `resolveNode(config, endpoint)` internal helper: resolves `string | Position` to `GraphNode | null` (AC: 2, 3, 4)
  - [x] Implement Dijkstra's algorithm in pixel-space using `buildAdjacencyList` and `pixelDistance` (AC: 1, 5, 7)
  - [x] Reconstruct path from `prev` map; compute `distanceMeters = pixelsToMeters(totalPixels, config.map.scale)` and `walkTimeSeconds = estimateWalkTime(distanceMeters)` (AC: 1)
  - [x] Return `null` when either endpoint resolves to `null` OR when Dijkstra finds no path (`dist[end] === Infinity`) (AC: 5)
  - [x] Write unit tests in `src/__tests__/computeRoute.test.ts` FIRST (RED phase), then implement (GREEN) (AC: 1–7)

- [x] Update `packages/view-core/src/index.ts` to export `computeRoute` (AC: 1)
  - [x] Add `export { computeRoute } from './computeRoute.ts';`

- [x] Run `bun test` from workspace root — all tests pass (129 existing + ~7 new = ~136 total)

## Dev Notes

### Package Context — What Exists After Story 3.1

**`packages/view-core/src/index.ts` (current):**
```ts
export { parseGwmap } from './parseGwmap.ts';
```

**Internal utilities available (NOT exported from index.ts):**

`src/utils/pixelMath.ts`:
```ts
export function pixelDistance(a: Position, b: Position): number
export function pixelsToMeters(pixels: number, scale: number): number
export function estimateWalkTime(distanceMeters: number): number
```

`src/utils/graphUtils.ts`:
```ts
export function buildAdjacencyList(config: MapConfig): Map<string, string[]>
export function nearestNode(config: MapConfig, position: Position): GraphNode | null
```

`computeRoute.ts` imports from these files using relative `.ts` extension paths:
```ts
import { buildAdjacencyList, nearestNode } from './utils/graphUtils.ts';
import { pixelDistance, pixelsToMeters, estimateWalkTime } from './utils/pixelMath.ts';
```

### `Route` Type (from `@resort-map/types`)

```ts
export interface Route {
  nodes: GraphNode[];       // ordered from start to end
  distanceMeters: number;   // total walking distance in meters
  walkTimeSeconds: number;  // estimated walking time in seconds
}
```

### TypeScript Constraints (MUST FOLLOW — same as Story 3.1)

- `verbatimModuleSyntax: true` → `import type` MANDATORY for type-only imports
- `noUncheckedIndexedAccess: true` → use `for...of` loops, never `array[i]`; `Map.get()` returns `T | undefined`
- All exported functions MUST have explicit return types
- `.ts` extensions on ALL relative imports
- `bun test` only (no `tsc --noEmit` — see Story 3.1 dev notes for why)

**Key `noUncheckedIndexedAccess` patterns in this story:**
```ts
// CORRECT — Map.get() returns T | undefined, handled with ??
const neighbors = adj.get(u) ?? [];
for (const v of neighbors) { ... }

// CORRECT — iterate over Map entries
for (const [id, d] of dist) { ... }

// WRONG — adj.get(u) could be undefined
for (const v of adj.get(u)!) { ... }  // ! is unsafe
```

### Function Signature

```ts
export function computeRoute(
  config: MapConfig,
  from: string | Position,
  to: string | Position,
): Route | null
```

- `string` = a POI id (look up in `config.pois`)
- `Position` = a map coordinate (snap to nearest node via `nearestNode`)
- Returns `Route` if a path exists, `null` if not (never throws for missing path per FR4)

### Type Guard for `string | Position`

Use `typeof` to distinguish the two types at runtime:

```ts
function isPosition(v: string | Position): v is Position {
  return typeof v !== 'string';
}
```

A `Position` is an object `{ x: number; y: number }`. A POI id is always a `string`. This type guard is internally used and NOT exported.

### `resolveNode` Internal Helper

```ts
function resolveNode(config: MapConfig, endpoint: string | Position): GraphNode | null {
  if (isPosition(endpoint)) {
    return nearestNode(config, endpoint);
  }
  // endpoint is a POI id
  const poi = config.pois.find((p) => p.id === endpoint);
  if (poi) {
    if (poi.nodeId) {
      // AC 3: use nodeId directly; fall back to snapping only if nodeId is stale/invalid
      const node = config.graph.nodes.find((n) => n.id === poi.nodeId);
      if (node) return node;
    }
    // AC 4: no nodeId (or stale nodeId) → snap to nearest
    return nearestNode(config, poi.position);
  }
  return null;
}
```

**Design reasoning:**
- If POI has a `nodeId` and the node exists → use it directly (AC 3, no snapping)
- If POI has a `nodeId` but it references a deleted node → graceful fallback to snapping
- If POI has NO `nodeId` → snap to nearest node (AC 4)
- If poi id not found in config → return `null` (route returns null)

### Dijkstra Implementation

Simple O(V²) approach — adequate for resort maps (typically <200 nodes). No external library needed.

**Algorithm works entirely in pixel-space.** The final `distanceMeters` converts at the end via `pixelsToMeters`.

```ts
function dijkstra(
  adj: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
  startId: string,
  endId: string,
): string[] | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of adj.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startId, 0);

  while (true) {
    // Find unvisited node with minimum distance
    let minDist = Infinity;
    let u: string | null = null;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < minDist) {
        minDist = d;
        u = id;
      }
    }
    if (u === null || u === endId) break;
    visited.add(u);

    const uNode = nodeMap.get(u);
    if (!uNode) continue;

    for (const v of (adj.get(u) ?? [])) {
      if (visited.has(v)) continue;
      const vNode = nodeMap.get(v);
      if (!vNode) continue;

      const edgeDist = pixelDistance(uNode.position, vNode.position);
      const currentDist = dist.get(u) ?? Infinity;
      const alt = currentDist + edgeDist;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  const endDist = dist.get(endId);
  if (endDist === undefined || endDist === Infinity) return null;

  // Reconstruct path by walking prev backwards
  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return path;
}
```

**`prev` map walkback safety:** `prev.get(startId)` was initialized to `null`, so `prev.get(current) ?? null` at the start node returns `null` and terminates the loop. `prev.get(current)` returning `undefined` (node not in prev) also becomes `null` via `?? null`.

### Full `computeRoute` Implementation

```ts
export function computeRoute(
  config: MapConfig,
  from: string | Position,
  to: string | Position,
): Route | null {
  const startNode = resolveNode(config, from);
  const endNode = resolveNode(config, to);

  if (!startNode || !endNode) return null;

  if (startNode.id === endNode.id) {
    return { nodes: [startNode], distanceMeters: 0, walkTimeSeconds: 0 };
  }

  const adj = buildAdjacencyList(config);
  const nodeMap = new Map<string, GraphNode>();
  for (const node of config.graph.nodes) {
    nodeMap.set(node.id, node);
  }

  const pathIds = dijkstra(adj, nodeMap, startNode.id, endNode.id);
  if (pathIds === null) return null;

  const nodes: GraphNode[] = pathIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => n !== undefined);

  // Sum pixel distances along the path
  let distancePixels = 0;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    if (prev && curr) {
      distancePixels += pixelDistance(prev.position, curr.position);
    }
  }

  const distanceMeters = pixelsToMeters(distancePixels, config.map.scale);
  return {
    nodes,
    distanceMeters,
    walkTimeSeconds: estimateWalkTime(distanceMeters),
  };
}
```

**Note on array indexing in path sum:** `nodes[i-1]` and `nodes[i]` return `GraphNode | undefined` due to `noUncheckedIndexedAccess`. The `if (prev && curr)` guard is required even though both will always be defined (the path array has no holes). TypeScript enforces the guard.

### File to Create

`packages/view-core/src/computeRoute.ts` — all imports:
```ts
import type { MapConfig, Route, Position, GraphNode } from '@resort-map/types';
import { buildAdjacencyList, nearestNode } from './utils/graphUtils.ts';
import { pixelDistance, pixelsToMeters, estimateWalkTime } from './utils/pixelMath.ts';
```

`MapConfig`, `Route`, `Position`, `GraphNode` are all type-only → `import type`.
`buildAdjacencyList`, `nearestNode`, `pixelDistance`, `pixelsToMeters`, `estimateWalkTime` are runtime values → regular imports.

### Complex Fixture — Path Analysis for Tests

From `@resort-map/types/fixtures/complex.gwmap.json` (scale: 0.5 m/px):

```
Nodes:
  node-001: (100, 300)   ← poi-001 "Restaurant"
  node-002: (300, 300)
  node-003: (500, 300)
  node-004: (500, 500)   ← poi-003 "Gym"
  node-005: (700, 300)
  node-006: (900, 300)   ← poi-002 "Pool"

Edges (all undirected):
  001 ↔ 002 ↔ 003 ↔ 004
              003 ↔ 005 ↔ 006
```

**Restaurant → Pool** (`poi-001` → `poi-002`):
- Only possible path: node-001 → node-002 → node-003 → node-005 → node-006
- Pixel distances: 200 + 200 + 200 + 200 = 800px
- distanceMeters: 800 × 0.5 = 400.0
- walkTimeSeconds: `Math.round(400/1.4)` = `Math.round(285.714...)` = **286**
- Expected node ids: `['node-001', 'node-002', 'node-003', 'node-005', 'node-006']`

**Gym → Pool** (`poi-003` → `poi-002`):
- Path: node-004 → node-003 → node-005 → node-006
- Pixel distances: 200 + 200 + 200 = 600px
- distanceMeters: 600 × 0.5 = 300.0
- walkTimeSeconds: `Math.round(300/1.4)` = `Math.round(214.285...)` = **214**
- Expected node ids: `['node-004', 'node-003', 'node-005', 'node-006']`

**Note on `complexMap` fixture import in tests:**

```ts
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import type { MapConfig } from '@resort-map/types';

const config = complexMap as unknown as MapConfig;
```

The `@resort-map/types` package has `"./fixtures/*": "./src/fixtures/*"` in its exports map, so the import path works. The `as unknown as MapConfig` cast is needed because TypeScript infers JSON as a wide `Record` type.

### Tests to Write: `src/__tests__/computeRoute.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { computeRoute } from '../computeRoute.ts';

const config = complexMap as unknown as MapConfig;

// Helper to make a simple disconnected config for the "no path" test
function makeDisconnectedConfig(): MapConfig {
  return {
    version: '1.0',
    map: { backgroundImageUrl: 'https://x.com/m.png', center: { x: 0, y: 0 }, scale: 1 },
    pois: [],
    graph: {
      nodes: [
        { id: 'A', position: { x: 0, y: 0 } },
        { id: 'B', position: { x: 100, y: 0 } },
      ],
      edges: [],  // no edges — A and B are disconnected
    },
  };
}
```

**Test cases:**

1. **Restaurant → Pool (complex fixture):** Checks path nodes, distanceMeters=400, walkTimeSeconds=286
2. **Gym → Pool (complex fixture):** Checks path nodes, distanceMeters=300, walkTimeSeconds=214
3. **No path (disconnected graph):** Returns null
4. **Same POI → self route:** {nodes: [node-001], distanceMeters: 0, walkTimeSeconds: 0}
5. **Position input:** `{ x: 100, y: 300 }` snaps to node-001, routes to poi-002 → same result as Restaurant→Pool
6. **POI without nodeId snaps correctly:** Build config with a POI lacking nodeId, nearest node = start, route completes
7. **Determinism:** Call computeRoute twice, results deep-equal

### `index.ts` Final State After Story 3.2

```ts
export { parseGwmap } from './parseGwmap.ts';
export { computeRoute } from './computeRoute.ts';
```

### ADR Notes

- **No external priority queue library** — O(V²) Dijkstra is sufficient for small resort maps and keeps view-core dependency-free
- **NFR4**: No React imports. `computeRoute.ts` only imports from `@resort-map/types` and local `./utils/` — both are framework-agnostic
- **NFR10 (determinism)**: Dijkstra is deterministic for identical inputs because:
  1. `buildAdjacencyList` produces a deterministic Map (nodes inserted in order from `config.graph.nodes`)
  2. The O(V²) loop iterates Map entries in insertion order (guaranteed in ES2022)
  3. No random elements or timestamps involved
- **`distanceMeters` precision**: The value is a plain float (e.g., 400.0), not rounded. Only `walkTimeSeconds` is rounded via `estimateWalkTime`

### Previous Story Learnings (Story 3.1)

- RED phase confirmed for each test file before implementation — follow same pattern
- `import type { ... }` for all types; `.ts` suffix on all relative imports
- `for...of` loops everywhere; `array[i]` requires `if (prev && curr)` guard
- Inline test data preferred over JSON fixture imports for simple cases
- `bun test` is the only validation; `tsc --noEmit` will error on test files

### Files to Create / Modify

```
packages/view-core/src/
  index.ts          ← UPDATE: add computeRoute export
  computeRoute.ts   ← CREATE: computeRoute + resolveNode + dijkstra (all in one file)
  __tests__/
    computeRoute.test.ts  ← CREATE: ~7 tests
```

**`dijkstra` and `resolveNode` are internal helpers inside `computeRoute.ts` — NOT exported from that file, NOT added to index.ts.**

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RED phase: `computeRoute.ts` module not found → confirmed failing before implementation
- GREEN phase: all 7 tests pass on first run
- Full workspace: 136/136 (7 new + 129 existing, zero regressions)
- NFR4 verified: zero React imports in view-core source

### Completion Notes List

- ✅ Created `computeRoute.ts` with `resolveNode` (string|Position→GraphNode|null), `isPosition` type guard, `dijkstra` O(V²) algorithm, and `computeRoute` public function (AC 1–7)
- ✅ `resolveNode` uses `nodeId` directly when present and valid (AC 3), falls back to `nearestNode` when absent or stale (AC 4), handles Position snapping (AC 2)
- ✅ Dijkstra returns `null` on disconnected graph (AC 5); same-node shortcut returns zero-distance route
- ✅ Determinism confirmed: identical inputs produce deep-equal results (AC 6, NFR10)
- ✅ Complex fixture path verified: Restaurant→Pool = 400m/286s, Gym→Pool = 300m/214s (AC 7)
- ✅ Updated `index.ts` with `computeRoute` export

### File List

- `packages/view-core/src/index.ts` (modified)
- `packages/view-core/src/computeRoute.ts` (created)
- `packages/view-core/src/__tests__/computeRoute.test.ts` (created)
- `_bmad-output/implementation-artifacts/3-2-view-core-dijkstra-route-computation.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

### Change Log

- 2026-06-17: Implemented Story 3.2 — Dijkstra route computation. 7 new tests; workspace total 136/136 passing.

---
baseline_commit: 29c5d9b9c833a1e1a738bb9b3948ea970cbb0548
---

# Story 1.3: @resort-map/types — validateGwmap & Test Fixtures

Status: review

## Story

As a developer in any resortMap package,
I want `validateGwmap(raw: unknown): MapConfig` available from `@resort-map/types` and shared `.gwmap` fixture files importable via `@resort-map/types/fixtures/*`,
so that schema validation is a single implementation shared across all packages and test fixtures are consistent everywhere.

## Acceptance Criteria

1. **Given** a valid `.gwmap` JSON object **When** I call `validateGwmap(obj)` **Then** it returns a fully typed `MapConfig` with no errors **And** unknown top-level fields are stripped silently **And** unknown fields inside any `POI.meta` object are preserved

2. **Given** a `.gwmap` object missing a required field (e.g., `map.backgroundImageUrl`) **When** I call `validateGwmap(obj)` **Then** it throws `Object.assign(new Error(message), { code: ErrorCode.GWMAP_PARSE_ERROR })` **And** the error message names the specific missing field

3. **Given** a `.gwmap` object with an unknown major version (e.g., `"version": "2.0"`) **When** I call `validateGwmap(obj)` **Then** it throws with `code: ErrorCode.GWMAP_VERSION_MISMATCH`

4. **Given** `import sampleMap from "@resort-map/types/fixtures/sample.gwmap.json"` **When** I call `validateGwmap(sampleMap)` **Then** it validates without error **And** `sampleMap.pois` has exactly 1 entry with at least one tag **And** `sampleMap.graph.nodes` has exactly 2 entries and `sampleMap.graph.edges` has exactly 1 entry

5. **Given** `import complexMap from "@resort-map/types/fixtures/complex.gwmap.json"` **When** I call `validateGwmap(complexMap)` **Then** it validates without error **And** `complexMap.pois` has at least 3 POIs across at least 2 distinct tags **And** `complexMap.graph` has at least 6 nodes and 5 edges forming a connected path between at least 2 POIs

## Tasks / Subtasks

- [x] Create `packages/types/src/validate.ts` — validateGwmap implementation (AC: 1, 2, 3)
  - [x] Implement `validateGwmap(raw: unknown): MapConfig` with exact validation rules from gwmap-schema.md (see Dev Notes)
  - [x] Throw `GWMAP_VERSION_MISMATCH` when major version is not "1"
  - [x] Throw `GWMAP_PARSE_ERROR` for missing required fields — error message must name the specific field
  - [x] Strip unknown top-level fields (return only version, map, pois, graph)
  - [x] Preserve all fields in `POI.meta` (do not strip)
  - [x] Use `Object.assign(new Error(msg), { code: ErrorCode.X })` throw pattern exactly
- [x] Create `packages/types/src/fixtures/sample.gwmap.json` (AC: 4)
  - [x] Exactly 1 POI with at least one tag and a nodeId
  - [x] Exactly 2 graph nodes and exactly 1 edge
  - [x] Must pass `validateGwmap` without error
- [x] Create `packages/types/src/fixtures/complex.gwmap.json` (AC: 5)
  - [x] At least 3 POIs across at least 2 distinct tags, each with a nodeId
  - [x] At least 6 graph nodes and at least 5 edges forming a connected graph
  - [x] Connected path must exist between at least 2 POIs (required for routing tests in Story 3.2)
  - [x] Must pass `validateGwmap` without error
- [x] Delete `packages/types/src/fixtures/.gitkeep` — directory is no longer empty
- [x] Update `packages/types/src/index.ts` to export `validateGwmap` (AC: 1)
  - [x] Add `export { validateGwmap } from './validate.ts'` (bare export — it's a runtime function value)
- [x] Create `packages/types/src/__tests__/validate.test.ts` with comprehensive tests (AC: 1, 2, 3, 4, 5)
  - [x] Test happy path: valid object returns MapConfig
  - [x] Test unknown top-level field stripped
  - [x] Test POI.meta fields preserved
  - [x] Test missing version → GWMAP_PARSE_ERROR (field named in message)
  - [x] Test major version "2.0" → GWMAP_VERSION_MISMATCH
  - [x] Test minor version "1.1" → succeeds (same major)
  - [x] Test missing map.backgroundImageUrl → GWMAP_PARSE_ERROR (field named)
  - [x] Test missing map.center → GWMAP_PARSE_ERROR
  - [x] Test missing map.scale → GWMAP_PARSE_ERROR
  - [x] Test scale = 0 → GWMAP_PARSE_ERROR
  - [x] Test negative scale → GWMAP_PARSE_ERROR
  - [x] Test missing pois → GWMAP_PARSE_ERROR
  - [x] Test missing graph → GWMAP_PARSE_ERROR
  - [x] Test sample.gwmap.json validates and has correct shape (AC: 4)
  - [x] Test complex.gwmap.json validates and has correct shape (AC: 5)
- [x] Run `bun test` from workspace root and verify all tests pass (AC: 1–5)

## Dev Notes

### Files to Create / Modify

```
packages/types/src/
├── index.ts          ← UPDATE: add validateGwmap export
├── validate.ts       ← CREATE: validateGwmap implementation
└── fixtures/
    ├── .gitkeep      ← DELETE: directory is no longer empty
    ├── sample.gwmap.json  ← CREATE
    └── complex.gwmap.json ← CREATE
packages/types/src/__tests__/
└── validate.test.ts  ← CREATE (do NOT modify types.test.ts from Story 1.2)
```

### Current `index.ts` State (Story 1.2 output — must be preserved)

```ts
export type { Position, MapMeta, POI, GraphNode, GraphEdge, MapConfig, Route } from './schema.ts';

export { ErrorCode } from './errors.ts';
export type { ErrorCodeValue } from './errors.ts';

export type { ViewerStatus, PoiFilterOptions, ViewerState, ViewerAction } from './viewerTypes.ts';
```

Add the following line to this file (bare `export`, not `export type` — `validateGwmap` is a runtime function):

```ts
export { validateGwmap } from './validate.ts';
```

### `validate.ts` — Implementation

```ts
import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge, Position } from './schema.ts';
import { ErrorCode } from './errors.ts';

export function validateGwmap(raw: unknown): MapConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error('Invalid .gwmap: expected a JSON object'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }

  const obj = raw as Record<string, unknown>;

  // --- version ---
  if (typeof obj['version'] !== 'string') {
    throw Object.assign(
      new Error('Missing required field: version'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const majorVersion = obj['version'].split('.')[0];
  if (majorVersion !== '1') {
    throw Object.assign(
      new Error(`Unsupported .gwmap major version: "${obj['version']}". Expected major version 1.`),
      { code: ErrorCode.GWMAP_VERSION_MISMATCH }
    );
  }

  // --- map ---
  const map = validateMapMeta(obj['map']);

  // --- pois ---
  if (!Array.isArray(obj['pois'])) {
    throw Object.assign(
      new Error('Missing required field: pois'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const pois = (obj['pois'] as unknown[]).map((p, i) => validatePoi(p, i));
  const poiIds = pois.map(p => p.id);
  const uniquePoiIds = new Set(poiIds);
  if (uniquePoiIds.size !== poiIds.length) {
    throw Object.assign(
      new Error('Duplicate POI ids found in pois array'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }

  // --- graph ---
  if (typeof obj['graph'] !== 'object' || obj['graph'] === null || Array.isArray(obj['graph'])) {
    throw Object.assign(
      new Error('Missing required field: graph'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const graphRaw = obj['graph'] as Record<string, unknown>;

  if (!Array.isArray(graphRaw['nodes'])) {
    throw Object.assign(
      new Error('Missing required field: graph.nodes'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const nodes = (graphRaw['nodes'] as unknown[]).map((n, i) => validateGraphNode(n, i));
  const nodeIds = nodes.map(n => n.id);
  const uniqueNodeIds = new Set(nodeIds);
  if (uniqueNodeIds.size !== nodeIds.length) {
    throw Object.assign(
      new Error('Duplicate node ids found in graph.nodes'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const nodeIdSet = new Set(nodeIds);

  if (!Array.isArray(graphRaw['edges'])) {
    throw Object.assign(
      new Error('Missing required field: graph.edges'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const edges = (graphRaw['edges'] as unknown[]).map((e, i) => validateGraphEdge(e, i, nodeIdSet));

  // Validate poi.nodeId references
  for (const poi of pois) {
    if (poi.nodeId !== undefined && !nodeIdSet.has(poi.nodeId)) {
      throw Object.assign(
        new Error(`POI "${poi.id}" has nodeId "${poi.nodeId}" which does not exist in graph.nodes`),
        { code: ErrorCode.GWMAP_PARSE_ERROR }
      );
    }
  }

  // Return MapConfig with only known top-level fields stripped (ARCH-006 strip + preserve)
  return {
    version: obj['version'],
    map,
    pois,
    graph: { nodes, edges },
  };
}

function validatePosition(raw: unknown, fieldName: string): Position {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`Missing required field: ${fieldName}`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const pos = raw as Record<string, unknown>;
  if (typeof pos['x'] !== 'number' || typeof pos['y'] !== 'number') {
    throw Object.assign(
      new Error(`Missing required field: ${fieldName}.x or ${fieldName}.y`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (pos['x'] < 0 || pos['y'] < 0) {
    throw Object.assign(
      new Error(`Invalid ${fieldName}: x and y must be non-negative`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  return { x: pos['x'], y: pos['y'] };
}

function validateMapMeta(raw: unknown): MapMeta {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error('Missing required field: map'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj['backgroundImageUrl'] !== 'string') {
    throw Object.assign(
      new Error('Missing required field: map.backgroundImageUrl'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const center = validatePosition(obj['center'], 'map.center');
  if (typeof obj['scale'] !== 'number') {
    throw Object.assign(
      new Error('Missing required field: map.scale'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (obj['scale'] <= 0) {
    throw Object.assign(
      new Error('Invalid field: map.scale must be a positive number'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  return {
    backgroundImageUrl: obj['backgroundImageUrl'],
    center,
    scale: obj['scale'],
  };
}

function validatePoi(raw: unknown, index: number): POI {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`pois[${index}] is not an object`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: pois[${index}].id`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (typeof obj['label'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: pois[${index}].label`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const position = validatePosition(obj['position'], `pois[${index}].position`);
  if (!Array.isArray(obj['tags'])) {
    throw Object.assign(
      new Error(`Missing required field: pois[${index}].tags`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }

  const poi: POI = {
    id: obj['id'],
    label: obj['label'],
    position,
    tags: obj['tags'].filter((t): t is string => typeof t === 'string'),
  };

  if (typeof obj['icon'] === 'string') poi.icon = obj['icon'];
  if (typeof obj['nodeId'] === 'string') poi.nodeId = obj['nodeId'];
  // Preserve meta as-is (ADR-006: unknown fields inside POI.meta are preserved)
  if (typeof obj['meta'] === 'object' && obj['meta'] !== null && !Array.isArray(obj['meta'])) {
    poi.meta = obj['meta'] as Record<string, unknown>;
  }

  return poi;
}

function validateGraphNode(raw: unknown, index: number): GraphNode {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`graph.nodes[${index}] is not an object`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: graph.nodes[${index}].id`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const position = validatePosition(obj['position'], `graph.nodes[${index}].position`);
  return { id: obj['id'], position };
}

function validateGraphEdge(raw: unknown, index: number, nodeIdSet: Set<string>): GraphEdge {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`graph.edges[${index}] is not an object`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['from'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: graph.edges[${index}].from`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (typeof obj['to'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: graph.edges[${index}].to`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (!nodeIdSet.has(obj['from'])) {
    throw Object.assign(
      new Error(`graph.edges[${index}].from references unknown node "${obj['from']}"`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (!nodeIdSet.has(obj['to'])) {
    throw Object.assign(
      new Error(`graph.edges[${index}].to references unknown node "${obj['to']}"`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const edge: GraphEdge = { from: obj['from'], to: obj['to'] };
  if (typeof obj['oneway'] === 'boolean') edge.oneway = obj['oneway'];
  return edge;
}
```

> **Why private helper functions are NOT exported:** Only `validateGwmap` is public API. The helper functions (`validateMapMeta`, `validatePoi`, etc.) are module-private. This follows the architecture's "Package public API: `src/index.ts` only" rule — implementation files are not imported directly by other packages.

> **Version check logic:** The schema rule says `version` must equal `"1.0"`. However, AC 3 specifies throwing GWMAP_VERSION_MISMATCH only for "unknown major version (e.g., '2.0')". Per ADR-006, minor version bumps are additive — so "1.1" must be accepted. The implementation checks `majorVersion !== '1'` (the first `.`-delimited segment), not strict equality with `"1.0"`.

### `sample.gwmap.json` — Exact Content

```json
{
  "version": "1.0",
  "map": {
    "backgroundImageUrl": "https://example.com/sample-map.png",
    "center": { "x": 512, "y": 384 },
    "scale": 0.1
  },
  "pois": [
    {
      "id": "poi-001",
      "label": "Main Restaurant",
      "position": { "x": 320, "y": 210 },
      "tags": ["restaurant"],
      "nodeId": "node-001"
    }
  ],
  "graph": {
    "nodes": [
      { "id": "node-001", "position": { "x": 100, "y": 200 } },
      { "id": "node-002", "position": { "x": 300, "y": 200 } }
    ],
    "edges": [
      { "from": "node-001", "to": "node-002" }
    ]
  }
}
```

Satisfies AC 4: exactly 1 POI with tag `["restaurant"]`, exactly 2 nodes, exactly 1 edge.

### `complex.gwmap.json` — Exact Content

```json
{
  "version": "1.0",
  "map": {
    "backgroundImageUrl": "https://example.com/hotel-floorplan.png",
    "center": { "x": 512, "y": 400 },
    "scale": 0.5
  },
  "pois": [
    {
      "id": "poi-001",
      "label": "Restaurant",
      "position": { "x": 100, "y": 300 },
      "tags": ["food"],
      "nodeId": "node-001"
    },
    {
      "id": "poi-002",
      "label": "Pool",
      "position": { "x": 900, "y": 300 },
      "tags": ["leisure"],
      "nodeId": "node-006"
    },
    {
      "id": "poi-003",
      "label": "Gym",
      "position": { "x": 500, "y": 550 },
      "tags": ["leisure"],
      "nodeId": "node-004"
    }
  ],
  "graph": {
    "nodes": [
      { "id": "node-001", "position": { "x": 100, "y": 300 } },
      { "id": "node-002", "position": { "x": 300, "y": 300 } },
      { "id": "node-003", "position": { "x": 500, "y": 300 } },
      { "id": "node-004", "position": { "x": 500, "y": 500 } },
      { "id": "node-005", "position": { "x": 700, "y": 300 } },
      { "id": "node-006", "position": { "x": 900, "y": 300 } }
    ],
    "edges": [
      { "from": "node-001", "to": "node-002" },
      { "from": "node-002", "to": "node-003" },
      { "from": "node-003", "to": "node-004" },
      { "from": "node-003", "to": "node-005" },
      { "from": "node-005", "to": "node-006" }
    ]
  }
}
```

Satisfies AC 5: 3 POIs, 2 distinct tags (`"food"`, `"leisure"`), 6 nodes, 5 edges. Connected paths:
- Restaurant → Pool: `node-001 → node-002 → node-003 → node-005 → node-006` (4 edges, 800px, 400m @ 0.5 m/px, ~286s)
- Restaurant → Gym: `node-001 → node-002 → node-003 → node-004` (3 edges, 600px, 300m, ~214s)

> **Why this fixture matters for Story 3.2 (Dijkstra):** The `complexMap` fixture is THE routing test fixture. It must have all POIs connected via nodeId to actual nodes, and the graph must form a connected subgraph between them. The JSON above is designed so Dijkstra from `poi-001` to `poi-002` follows the unique shortest path through 5 nodes, and `poi-001` to `poi-003` through 4 nodes. Do NOT change these specific paths without also updating Story 3.2's expected test output.

### Validation Rules from `gwmap-schema.md` (full list)

The implementation must enforce ALL of these:
1. `version` is string, major equals `"1"` (not strict `"1.0"` equality — per ADR-006 minor bumps allowed)
2. POI `id` values must be unique within the `pois` array
3. `graph.node` `id` values must be unique within `graph.nodes`
4. Every `edge.from` and `edge.to` must reference an existing `graph.node.id`
5. Every `poi.nodeId`, if present, must reference an existing `graph.node.id`
6. `map.scale` must be a positive number (> 0)
7. All `position.x` and `position.y` must be non-negative numbers (≥ 0)
8. Required fields: `version`, `map`, `map.backgroundImageUrl`, `map.center`, `map.scale`, `pois`, `graph`, `graph.nodes`, `graph.edges`
9. Each POI requires: `id`, `label`, `position`, `tags`
10. Each node requires: `id`, `position`
11. Each edge requires: `from`, `to`

### Strip + Preserve Behavior (ADR-006)

- **Strip:** The returned `MapConfig` contains ONLY `{version, map, pois, graph}`. Any other top-level field (e.g., `"description": "..."`) is silently dropped.
- **Preserve:** Inside each `POI`, the `meta` field is copied as-is (`Record<string, unknown>`). Unknown keys within `meta` are NOT stripped. Unknown keys at the POI level itself (e.g., a `"rating"` field on a POI) are NOT preserved — only `id`, `label`, `position`, `tags`, `icon?`, `nodeId?`, `meta?` are returned.

### Architecture Compliance

1. **Error pattern** (mandatory — ADR-004): `throw Object.assign(new Error(message), { code: ErrorCode.X })` — never `throw ErrorCode.X` alone
2. **`import type` for type imports** — `import type { MapConfig, POI, ... }` from `./schema.ts`; `import { ErrorCode }` (bare, it's a value)
3. **`verbatimModuleSyntax: true`** — failing to use `import type` for types is a TypeScript compile error in this project
4. **Explicit return type** on `validateGwmap` — `validateGwmap(raw: unknown): MapConfig` — mandatory per architecture
5. **Private helpers not exported** — only `validateGwmap` is exported from `validate.ts` and re-exported from `index.ts`
6. **No `any`** — use `unknown` at the boundary, cast only after type-narrowing checks
7. **Tests in `src/__tests__/`** — create `validate.test.ts`, do NOT modify `types.test.ts`

### Previous Story Learnings (Stories 1.1 & 1.2)

- **`verbatimModuleSyntax: true` enforces `import type`** — if you use `import { POI }` instead of `import type { POI }`, TypeScript errors with TS1484. This is a compile-time failure, not a runtime warning.
- **`bun test` discovers `*.test.ts` recursively** — `validate.test.ts` will be auto-discovered alongside `types.test.ts`.
- **JSON imports work natively in Bun** — `import sampleMap from '../fixtures/sample.gwmap.json'` returns a typed JS object. No `assert { type: "json" }` needed.
- **The `.gitkeep` file** is a plain empty file; deleting it won't break anything. The `fixtures/` export in `package.json` (`"./fixtures/*": "./src/fixtures/*"`) uses glob matching and works once real `.json` files exist.
- **Bun workspace import resolution** — tests inside `@resort-map/types` can use either:
  - Relative: `import sampleMap from '../fixtures/sample.gwmap.json'` (recommended inside the package)
  - Package: `import sampleMap from '@resort-map/types/fixtures/sample.gwmap.json'` (tests from other packages will use this form)
  The ACs say "import from @resort-map/types/fixtures/..." — test this form in validate.test.ts to confirm the exports field works correctly.

### Test Structure for `validate.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import { validateGwmap } from '../validate.ts';
import { ErrorCode } from '../errors.ts';
// Use package-level import to verify the "exports" field works:
import sampleMap from '@resort-map/types/fixtures/sample.gwmap.json';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

describe('validateGwmap — happy path', () => {
  test('returns MapConfig for valid object');
  test('strips unknown top-level fields');
  test('preserves POI.meta unknown fields');
  test('accepts version "1.1" (same major)');
  test('accepts pois with no meta/icon/nodeId (optional fields)');
});

describe('validateGwmap — version errors', () => {
  test('throws GWMAP_PARSE_ERROR for missing version');
  test('throws GWMAP_VERSION_MISMATCH for version "2.0"');
  test('throws GWMAP_VERSION_MISMATCH for version "0.9"');
});

describe('validateGwmap — missing required fields', () => {
  test('throws GWMAP_PARSE_ERROR naming "map.backgroundImageUrl" when missing');
  test('throws GWMAP_PARSE_ERROR naming "map.center" when missing');
  test('throws GWMAP_PARSE_ERROR for scale = 0');
  test('throws GWMAP_PARSE_ERROR for negative scale');
  test('throws GWMAP_PARSE_ERROR when pois is not an array');
  test('throws GWMAP_PARSE_ERROR when graph is missing');
  test('throws GWMAP_PARSE_ERROR when edge references unknown node');
  test('throws GWMAP_PARSE_ERROR when poi.nodeId references unknown node');
  test('throws GWMAP_PARSE_ERROR for duplicate POI ids');
  test('throws GWMAP_PARSE_ERROR for duplicate node ids');
  test('throws GWMAP_PARSE_ERROR for negative position.x');
});

describe('fixtures', () => {
  test('sampleMap validates and has 1 POI, 2 nodes, 1 edge (AC 4)');
  test('complexMap validates and has ≥3 POIs, ≥2 distinct tags, ≥6 nodes, ≥5 edges (AC 5)');
});
```

For the error-checking tests, use this pattern:
```ts
const err = (() => { try { validateGwmap({...}); } catch(e) { return e as Error & { code: string }; } })();
expect(err).toBeDefined();
expect((err as { code: string }).code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
expect(err.message).toContain('map.backgroundImageUrl'); // field named in message
```

### References

- gwmap-schema.md validation rules [Source: _bmad-output/specs/spec-resort-map/gwmap-schema.md#Validation rules]
- ADR-006 strip+preserve behaviour [Source: architecture.md#Data Architecture]
- ADR-004 error throw pattern [Source: architecture.md#API & Communication Patterns]
- `validateGwmap` file location [Source: architecture.md#Complete Project Directory Structure → types/src/validate.ts]
- Fixture paths [Source: architecture.md#Complete Project Directory Structure → types/src/fixtures/]
- Version major-only check [Source: epics.md#Story 1.3 AC 3 — "unknown major version"]
- Complex fixture path requirements for Story 3.2 [Source: epics.md#Story 3.2 AC — "complexMap fixture (multi-node connected graph)"]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none — implementation matched spec exactly_

### Completion Notes List

- Implemented `validateGwmap(raw: unknown): MapConfig` in `validate.ts` with full validation of all required fields per gwmap-schema.md
- Version check uses major-only comparison (`split('.')[0] !== '1'`) so "1.1" passes and "2.0"/"0.9" throw GWMAP_VERSION_MISMATCH
- All error throws use `Object.assign(new Error(msg), { code: ErrorCode.X })` pattern (ADR-004)
- Unknown top-level fields are stripped; POI.meta is preserved as-is (ADR-006)
- `import type` used for all type imports; `verbatimModuleSyntax: true` compliance confirmed
- Created `sample.gwmap.json` (1 POI, 2 nodes, 1 edge) and `complex.gwmap.json` (3 POIs, 2 tags, 6 nodes, 5 edges with connected paths between all POI-linked nodes)
- Deleted `.gitkeep` — fixtures directory now has real content
- Added `export { validateGwmap } from './validate.ts'` to `index.ts`
- 37 tests pass (22 new in `validate.test.ts` + 15 existing from Story 1.2), 0 failures

### File List

- packages/types/src/validate.ts (created)
- packages/types/src/fixtures/sample.gwmap.json (created)
- packages/types/src/fixtures/complex.gwmap.json (created)
- packages/types/src/fixtures/.gitkeep (deleted)
- packages/types/src/index.ts (modified — added validateGwmap export)
- packages/types/src/__tests__/validate.test.ts (created)

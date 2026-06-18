---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 3.1: view-core — Pixel Math & Graph Utilities

Status: review

## Story

**As a** view-core routing and filtering function,
**I want** foundational pixel-space math utilities and graph structure helpers available,
**So that** routing and filtering logic can call pure, tested primitives without reimplementing geometry.

## Acceptance Criteria

1. **Given** two `Position` values `a` and `b` **When** I call `pixelDistance(a, b)` **Then** it returns the Euclidean distance in pixels as a number ≥ 0

2. **Given** a pixel distance and a `scale` (meters/pixel) **When** I call `pixelsToMeters(pixels, scale)` **Then** it returns `pixels × scale`

3. **Given** a distance in meters **When** I call `estimateWalkTime(distanceMeters)` **Then** it returns `Math.round(distanceMeters / 1.4)` (seconds, walk speed 1.4 m/s)

4. **Given** a `MapConfig` **When** I call `buildAdjacencyList(config)` **Then** it returns a `Map<string, string[]>` where each node id maps to the ids of its neighbours **And** for undirected edges (no `oneway`), both directions are added **And** for edges with `oneway: true`, only `from → to` is added

5. **Given** a `MapConfig` and a `Position` **When** I call `nearestNode(config, position)` **Then** it returns the `GraphNode` with the smallest `pixelDistance` to the given position **And** if `config.graph.nodes` is empty, it returns `null`

6. **Given** a valid `.gwmap` JSON string **When** I call `parseGwmap(raw)` from view-core **Then** it returns a fully typed `MapConfig` (delegates to `JSON.parse` + `validateGwmap` from `@resort-map/types`) — satisfying FR3 through view-core, not the adapter

7. **Given** view-core source files **When** I grep for `import.*react` **Then** zero matches are found (NFR4 — no React/RN imports in view-core)

## Tasks / Subtasks

- [x] Create `packages/view-core/src/utils/pixelMath.ts` with pixel math utilities
  - [x] `pixelDistance(a: Position, b: Position): number` — Euclidean distance `Math.sqrt(dx²+dy²)` (AC: 1)
  - [x] `pixelsToMeters(pixels: number, scale: number): number` — returns `pixels * scale` (AC: 2)
  - [x] `estimateWalkTime(distanceMeters: number): number` — returns `Math.round(distanceMeters / 1.4)` (AC: 3)
  - [x] Write unit tests in `src/__tests__/pixelMath.test.ts` FIRST (RED phase), then implement (GREEN) (AC: 1–3)

- [x] Create `packages/view-core/src/utils/graphUtils.ts` with graph structure helpers
  - [x] `buildAdjacencyList(config: MapConfig): Map<string, string[]>` — initialise from nodes list, add both directions for undirected edges, only `from→to` for `oneway: true` (AC: 4)
  - [x] `nearestNode(config: MapConfig, position: Position): GraphNode | null` — iterates nodes, uses `pixelDistance`, returns null for empty graph (AC: 5)
  - [x] Write unit tests in `src/__tests__/graphUtils.test.ts` FIRST (RED phase), then implement (GREEN) (AC: 4, 5)

- [x] Create `packages/view-core/src/parseGwmap.ts` with view-core's own `parseGwmap`
  - [x] Implement `parseGwmap(raw: string): MapConfig` — wraps `JSON.parse`, throws `GWMAP_PARSE_ERROR` on invalid JSON, then delegates to `validateGwmap` from `@resort-map/types` (AC: 6)
  - [x] Write unit tests in `src/__tests__/parseGwmap.test.ts` FIRST (RED), then implement (GREEN) (AC: 6)
  - [x] Verify no React imports exist in any `src/**/*.ts` file (AC: 7)

- [x] Update `packages/view-core/src/index.ts` to export `parseGwmap` (AC: 6)
  - [x] Replace `export {}; // populated in Story 3.1` with real exports
  - [x] Only export `parseGwmap` in this story — `pixelDistance` etc. are internal utilities used only within view-core

- [x] Run `bun test` from workspace root — all tests pass (111 existing + ~17 new = ~128 total)

## Dev Notes

### Package Context — What Exists Today

**`packages/view-core/src/index.ts` (current):**
```ts
export {}; // populated in Story 3.1
```
This is the ONLY file in `src/`. Everything else must be created from scratch.

**`packages/view-core/package.json`:**
```json
{
  "name": "@resort-map/view-core",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@resort-map/types": "workspace:*" }
}
```
`@resort-map/types` is the ONLY dependency. `@resort-map/builder-core` is intentionally absent — view-core must NOT import from builder-core. Both are peer packages in the same workspace.

**`packages/view-core/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src"]
}
```

**tsconfig.base.json (applies to all packages):**
- `verbatimModuleSyntax: true` — `import type` MANDATORY for type-only imports
- `noUncheckedIndexedAccess: true` — array subscripts return `T | undefined`; use `for...of` loops instead of indexed access
- `strict: true` — full TypeScript strict mode
- `target: "ES2022"`, `moduleResolution: "bundler"`

**`@resort-map/types` exports (from `packages/types/src/index.ts`):**
```ts
export type { Position, MapMeta, POI, GraphNode, GraphEdge, MapConfig, Route };
export { ErrorCode };
export type { ErrorCodeValue };
export type { ViewerStatus, PoiFilterOptions, ViewerState, ViewerAction };
export { validateGwmap };
```
`validateGwmap` and `ErrorCode` are runtime values → regular imports. All type names → `import type`.

### Architecture Constraints (MUST FOLLOW)

**NFR4 — Zero React/RN imports:**
view-core must have zero imports from `react`, `react-dom`, `react-native`, or any React library. No peer dependency on React. view-core runs in any JS environment (Node 18, browsers, RN) without React.

**ADR-002 — Pure functions only:**
Every function exported from view-core is stateless and pure. No class instances, no module-level mutable state, no event listeners. Functions take data in, return data out.

**ADR-004 — Error handling pattern:**
```ts
throw Object.assign(
  new Error('descriptive message'),
  { code: ErrorCode.GWMAP_PARSE_ERROR },
);
```
Never `throw new Error(...)` without a `code`. Never throw a custom class.

**`import type` rule:**
```ts
// CORRECT
import type { MapConfig, GraphNode, Position } from '@resort-map/types';
import { validateGwmap, ErrorCode } from '@resort-map/types';

// WRONG — will break with verbatimModuleSyntax
import { MapConfig, validateGwmap, ErrorCode } from '@resort-map/types';
```

**Explicit return types:**
All exported functions MUST have explicit TypeScript return types:
```ts
// CORRECT
export function pixelDistance(a: Position, b: Position): number { ... }

// WRONG
export function pixelDistance(a: Position, b: Position) { ... }
```

**`noUncheckedIndexedAccess` — Use `for...of` not index access:**
```ts
// CORRECT
for (const node of config.graph.nodes) { ... }

// WRONG — graph.nodes[i] is GraphNode | undefined
let nearest = config.graph.nodes[0];  // type error or unsafe
```

### `tsc --noEmit` Note

**Do NOT run `bunx tsc --noEmit -p packages/view-core/tsconfig.json` as a validation step.** It will fail with `Cannot find module 'bun:test'` and `TS5097: An import path can only end with a '.ts' extension` errors — this is the same known issue as in `packages/builder-core` (which also has no `"types": ["bun"]` in its tsconfig). Use `bun test` exclusively for validation.

### File Structure to Create

```
packages/view-core/src/
  index.ts                 ← UPDATE: replace export {} with real exports
  parseGwmap.ts            ← CREATE: parseGwmap function (public API)
  utils/
    pixelMath.ts           ← CREATE: pixelDistance, pixelsToMeters, estimateWalkTime
    graphUtils.ts          ← CREATE: buildAdjacencyList, nearestNode
  __tests__/
    pixelMath.test.ts      ← CREATE
    graphUtils.test.ts     ← CREATE
    parseGwmap.test.ts     ← CREATE
```

Internal utilities (`pixelMath.ts`, `graphUtils.ts`) live in `src/utils/` per architecture pattern. They are NOT exported from `src/index.ts` — only used internally within view-core. Story 3.2 (`computeRoute`) and Story 3.3 (`filterPois`) will import them as relative imports.

Only `parseGwmap` is exported from `src/index.ts` in Story 3.1.

### Implementation: `src/utils/pixelMath.ts`

```ts
import type { Position } from '@resort-map/types';

export function pixelDistance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pixelsToMeters(pixels: number, scale: number): number {
  return pixels * scale;
}

export function estimateWalkTime(distanceMeters: number): number {
  return Math.round(distanceMeters / 1.4);
}
```

### Implementation: `src/utils/graphUtils.ts`

```ts
import type { MapConfig, GraphNode, Position } from '@resort-map/types';
import { pixelDistance } from './pixelMath.ts';

export function buildAdjacencyList(config: MapConfig): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const node of config.graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of config.graph.edges) {
    const fromList = adj.get(edge.from);
    if (fromList) fromList.push(edge.to);

    if (!edge.oneway) {
      const toList = adj.get(edge.to);
      if (toList) toList.push(edge.from);
    }
  }

  return adj;
}

export function nearestNode(config: MapConfig, position: Position): GraphNode | null {
  if (config.graph.nodes.length === 0) return null;

  let nearest: GraphNode | null = null;
  let minDist = Infinity;

  for (const node of config.graph.nodes) {
    const dist = pixelDistance(node.position, position);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }

  return nearest;
}
```

**`buildAdjacencyList` design choices:**
- Initializes the map FROM the `nodes` array (not from edges). Nodes with no edges appear as `id: []`.
- Guards `adj.get(edge.from)` with `if (fromList)` — defensive against malformed configs where edge references a node id that doesn't exist in `nodes`.
- `edge.oneway` is `boolean | undefined`. `!edge.oneway` is `true` when `oneway` is `undefined` (undirected) OR `false` (explicitly undirected). Only `oneway: true` suppresses the reverse direction.

### Implementation: `src/parseGwmap.ts`

```ts
import { validateGwmap, ErrorCode } from '@resort-map/types';
import type { MapConfig } from '@resort-map/types';

export function parseGwmap(raw: string): MapConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(
      new Error('Failed to parse .gwmap: invalid JSON'),
      { code: ErrorCode.GWMAP_PARSE_ERROR },
    );
  }
  return validateGwmap(parsed);
}
```

**Why view-core has its own `parseGwmap` (not re-exported from builder-core):**
`@resort-map/view-core` has no dependency on `@resort-map/builder-core`. They are sibling packages. Both implement `parseGwmap` independently, both delegating to `validateGwmap` from `@resort-map/types`. This avoids cross-domain coupling (builder-core is a builder concern; view-core is a viewer concern). The implementation is identical but the provenance is intentionally separate (ADR-002).

### Implementation: `src/index.ts` (updated)

```ts
export { parseGwmap } from './parseGwmap.ts';
```

Note: `pixelDistance`, `pixelsToMeters`, `estimateWalkTime`, `buildAdjacencyList`, `nearestNode` are NOT exported from index.ts — they are internal utilities. Stories 3.2 and 3.3 will import them via relative paths within view-core.

### Tests: `src/__tests__/pixelMath.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import { pixelDistance, pixelsToMeters, estimateWalkTime } from '../utils/pixelMath.ts';

describe('pixelDistance', () => {
  test('3-4-5 right triangle returns 5', () => {
    expect(pixelDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  test('same point returns 0', () => {
    expect(pixelDistance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0);
  });

  test('horizontal distance', () => {
    expect(pixelDistance({ x: 0, y: 5 }, { x: 7, y: 5 })).toBe(7);
  });
});

describe('pixelsToMeters', () => {
  test('100 pixels at scale 0.5 = 50 meters', () => {
    expect(pixelsToMeters(100, 0.5)).toBe(50);
  });

  test('0 pixels returns 0', () => {
    expect(pixelsToMeters(0, 2)).toBe(0);
  });
});

describe('estimateWalkTime', () => {
  test('140 meters → 100 seconds (140 / 1.4 = 100, exact)', () => {
    expect(estimateWalkTime(140)).toBe(100);
  });

  test('0 meters → 0 seconds', () => {
    expect(estimateWalkTime(0)).toBe(0);
  });

  test('rounds fractional seconds (2.1m / 1.4 = 1.5 → rounds to 2)', () => {
    expect(estimateWalkTime(2.1)).toBe(2);
  });
});
```

### Tests: `src/__tests__/graphUtils.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import type { MapConfig, GraphNode } from '@resort-map/types';
import { buildAdjacencyList, nearestNode } from '../utils/graphUtils.ts';

function makeConfig(
  nodes: { id: string; x: number; y: number }[],
  edges: { from: string; to: string; oneway?: boolean }[],
): MapConfig {
  return {
    version: '1.0',
    map: { backgroundImageUrl: 'https://x.com/m.png', center: { x: 0, y: 0 }, scale: 1 },
    pois: [],
    graph: {
      nodes: nodes.map(({ id, x, y }) => ({ id, position: { x, y } })),
      edges,
    },
  };
}

describe('buildAdjacencyList', () => {
  test('undirected edge adds both directions', () => {
    const config = makeConfig(
      [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 100, y: 0 }],
      [{ from: 'A', to: 'B' }],
    );
    const adj = buildAdjacencyList(config);
    expect(adj.get('A')).toEqual(['B']);
    expect(adj.get('B')).toEqual(['A']);
  });

  test('oneway: true only adds from → to direction', () => {
    const config = makeConfig(
      [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 100, y: 0 }],
      [{ from: 'A', to: 'B', oneway: true }],
    );
    const adj = buildAdjacencyList(config);
    expect(adj.get('A')).toEqual(['B']);
    expect(adj.get('B')).toEqual([]);
  });

  test('empty graph returns empty Map', () => {
    const config = makeConfig([], []);
    const adj = buildAdjacencyList(config);
    expect(adj.size).toBe(0);
  });
});

describe('nearestNode', () => {
  test('returns null for empty nodes', () => {
    const config = makeConfig([], []);
    expect(nearestNode(config, { x: 50, y: 50 })).toBeNull();
  });

  test('returns closest node by pixel distance', () => {
    const config = makeConfig(
      [{ id: 'close', x: 10, y: 0 }, { id: 'far', x: 100, y: 0 }],
      [],
    );
    const result = nearestNode(config, { x: 0, y: 0 });
    expect(result?.id).toBe('close');
  });

  test('returns node when only one exists', () => {
    const config = makeConfig([{ id: 'only', x: 500, y: 500 }], []);
    const result = nearestNode(config, { x: 0, y: 0 });
    expect(result?.id).toBe('only');
  });

  test('position equidistant from two nodes returns first encountered', () => {
    const config = makeConfig(
      [{ id: 'A', x: -5, y: 0 }, { id: 'B', x: 5, y: 0 }],
      [],
    );
    // both are 5px from origin; first one in array wins
    const result = nearestNode(config, { x: 0, y: 0 });
    expect(result?.id).toBe('A');
  });
});
```

### Tests: `src/__tests__/parseGwmap.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import { parseGwmap } from '../parseGwmap.ts';

const validGwmapJson = JSON.stringify({
  version: '1.0',
  map: {
    backgroundImageUrl: 'https://example.com/map.png',
    center: { x: 512, y: 384 },
    scale: 0.1,
  },
  pois: [],
  graph: { nodes: [], edges: [] },
});

describe('parseGwmap (view-core)', () => {
  test('valid JSON string returns MapConfig', () => {
    const result = parseGwmap(validGwmapJson);
    expect(result.version).toBe('1.0');
    expect(result.map.backgroundImageUrl).toBe('https://example.com/map.png');
    expect(result.pois).toHaveLength(0);
    expect(result.graph.nodes).toHaveLength(0);
  });

  test('invalid JSON throws GWMAP_PARSE_ERROR', () => {
    try {
      parseGwmap('{ not valid json');
      expect('should have thrown').toBe(false);
    } catch (err) {
      expect((err as { code: string }).code).toBe('GWMAP_PARSE_ERROR');
    }
  });

  test('valid JSON but invalid schema throws GWMAP_PARSE_ERROR (via validateGwmap)', () => {
    const badSchema = JSON.stringify({ version: '1.0', map: { missing: 'required fields' } });
    try {
      parseGwmap(badSchema);
      expect('should have thrown').toBe(false);
    } catch (err) {
      expect((err as { code: string }).code).toBe('GWMAP_PARSE_ERROR');
    }
  });
});
```

### NFR4 Compliance Check

After implementation, verify with:
```bash
grep -r "import.*react" packages/view-core/src/ --include="*.ts"
```
Expected: no output (zero matches). This is also enforced structurally — view-core `package.json` has no React dependency, so TypeScript would error if any React import was added.

### Why `parseGwmap` is at `src/` not `src/utils/`

The architecture doc says: "Internal utilities: `src/utils/` subfolder — Pure helper functions (pixel math, ID generation, graph helpers)". `parseGwmap` is a **public API function** (exported from `index.ts`), not an internal utility. Per "Package public API: `src/index.ts` only" rule, the implementation file for public functions should be at `src/` level (like `src/parseGwmap.ts`).

### Fixtures Note

`@resort-map/types` has `"./fixtures/*": "./src/fixtures/*"` in its exports map — so `@resort-map/types/fixtures/sample.gwmap.json` can be imported in tests. For Story 3.1, all test data is constructed inline (simpler and more explicit than importing JSON). Future stories (3.2, 3.5) may use the fixtures directly.

### Previous Stories Learnings

From builder-core (direct parallel package to view-core):
- `for...of` loops throughout (no `[i]` indexing due to `noUncheckedIndexedAccess`)
- `import type { ... }` for all types, regular `import { ... }` for runtime values
- `.ts` extensions on all relative imports (`'./utils/pixelMath.ts'` not `'./utils/pixelMath'`)
- Explicit return types on all exported functions
- `bun test` is the only validation command (tsc will error on test files due to bun:test types)
- `import { test, expect, describe, beforeEach } from 'bun:test'` — standard test imports

### Files to Create / Modify

```
packages/view-core/src/
  index.ts              ← UPDATE (replace export {})
  parseGwmap.ts         ← CREATE
  utils/
    pixelMath.ts        ← CREATE
    graphUtils.ts       ← CREATE
  __tests__/
    pixelMath.test.ts   ← CREATE
    graphUtils.test.ts  ← CREATE
    parseGwmap.test.ts  ← CREATE
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RED phase confirmed for all 3 test files before implementation
- All 18 new tests pass; full workspace: 129/129 (0 regressions)
- NFR4 verified: `grep -r "import.*react" packages/view-core/src/` returns zero matches

### Completion Notes List

- ✅ Created `src/utils/pixelMath.ts` — `pixelDistance`, `pixelsToMeters`, `estimateWalkTime` (8 tests, AC 1–3)
- ✅ Created `src/utils/graphUtils.ts` — `buildAdjacencyList`, `nearestNode` using `for...of` (7 tests, AC 4–5)
- ✅ Created `src/parseGwmap.ts` — view-core's own implementation, delegates to `validateGwmap` from `@resort-map/types`, no builder-core coupling (3 tests, AC 6)
- ✅ Updated `src/index.ts` — exports `parseGwmap` only; pixel math and graph utils remain internal
- ✅ NFR4 satisfied — zero React imports in view-core source (AC 7)

### File List

- `packages/view-core/src/index.ts` (modified)
- `packages/view-core/src/parseGwmap.ts` (created)
- `packages/view-core/src/utils/pixelMath.ts` (created)
- `packages/view-core/src/utils/graphUtils.ts` (created)
- `packages/view-core/src/__tests__/pixelMath.test.ts` (created)
- `packages/view-core/src/__tests__/graphUtils.test.ts` (created)
- `packages/view-core/src/__tests__/parseGwmap.test.ts` (created)
- `_bmad-output/implementation-artifacts/3-1-view-core-pixel-math-and-graph-utilities.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

### Change Log

- 2026-06-17: Implemented Story 3.1 — view-core pixel math & graph utilities. Created 6 new source files; 18 tests added; workspace total 129/129 passing.

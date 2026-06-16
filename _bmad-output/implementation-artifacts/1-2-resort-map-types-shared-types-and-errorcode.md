---
baseline_commit: a4d5e5a09ecef6a83a60ea2f4e63d6b7ab2ab6a6
---

# Story 1.2: @resort-map/types — Shared TypeScript Types & ErrorCode

Status: review

## Story

As a developer building any resortMap package,
I want `@resort-map/types` to export all shared TypeScript interfaces and the `ErrorCode` const object,
so that every package has a single, type-safe source of truth for the `.gwmap` data model without duplicating type definitions.

## Acceptance Criteria

1. **Given** `@resort-map/types` is imported in any package **When** I import named types from `"@resort-map/types"` **Then** the following are available and correctly typed: `MapConfig`, `POI`, `GraphNode`, `GraphEdge`, `MapMeta`, `Position`, `Route`, `PoiFilterOptions`, `ViewerStatus`, `ViewerState`, `ViewerAction` **And** `ViewerAction` is a discriminated union of all viewer action types (`MAP_LOADED`, `SELECT_POI`, `SET_ROUTE`, `SET_FILTER`, `IMAGE_LOADED`, `SET_ERROR`) allowing adapter packages to dispatch typed actions without importing from `view-core`

2. **Given** I import `ErrorCode` from `"@resort-map/types"` **When** I inspect its values **Then** it is a `const` object (not an enum) with exactly these keys: `GWMAP_PARSE_ERROR`, `GWMAP_VERSION_MISMATCH`, `ROUTE_NOT_FOUND`, `INVALID_POSITION`, `INVALID_NODE_REF` **And** TypeScript infers the value type as a string literal union

3. **Given** builder-core and view-core packages **When** I search their source files for type definitions of `POI`, `MapConfig`, or `GraphNode` **Then** none are found — all types are imported from `@resort-map/types`

4. **Given** the `@resort-map/types` package **When** I run `bun test` **Then** all type-export tests pass and the package compiles with zero TypeScript errors

## Tasks / Subtasks

- [x] Create `packages/types/src/schema.ts` — .gwmap data model types (AC: 1)
  - [x] Define `Position` interface: `{ x: number; y: number }`
  - [x] Define `MapMeta` interface: `{ backgroundImageUrl: string; center: Position; scale: number }`
  - [x] Define `POI` interface: `{ id: string; label: string; position: Position; tags: string[]; icon?: string; nodeId?: string; meta?: Record<string, unknown> }`
  - [x] Define `GraphNode` interface: `{ id: string; position: Position }`
  - [x] Define `GraphEdge` interface: `{ from: string; to: string; oneway?: boolean }`
  - [x] Define `MapConfig` interface: `{ version: string; map: MapMeta; pois: POI[]; graph: { nodes: GraphNode[]; edges: GraphEdge[] } }`
  - [x] Define `Route` interface: `{ nodes: GraphNode[]; distanceMeters: number; walkTimeSeconds: number }`
- [x] Create `packages/types/src/errors.ts` — ErrorCode const object (AC: 2)
  - [x] Define `ErrorCode` as `const` object (NOT an enum) with keys: `GWMAP_PARSE_ERROR`, `GWMAP_VERSION_MISMATCH`, `ROUTE_NOT_FOUND`, `INVALID_POSITION`, `INVALID_NODE_REF`
  - [x] Export `ErrorCodeValue` type inferred from `typeof ErrorCode[keyof typeof ErrorCode]`
- [x] Create `packages/types/src/viewerTypes.ts` — viewer state management types (AC: 1)
  - [x] Define `ViewerStatus` type: `'idle' | 'loading' | 'ready' | 'error'`
  - [x] Define `PoiFilterOptions` interface: `{ tags?: string[]; maxDistanceMeters?: number; origin?: Position }`
  - [x] Define `ViewerState` interface (see exact shape in Dev Notes)
  - [x] Define `ViewerAction` as discriminated union of 6 action types (see exact shape in Dev Notes)
- [x] Update `packages/types/src/index.ts` to re-export all public types (AC: 1, 2)
  - [x] Replace placeholder `export {}` with named re-exports from schema.ts, errors.ts, viewerTypes.ts
  - [x] Use `export type` for type-only exports, bare `export` for values (ErrorCode)
- [x] Replace placeholder test with real type-export tests (AC: 4)
  - [x] Delete `packages/types/src/__tests__/placeholder.test.ts`
  - [x] Create `packages/types/src/__tests__/types.test.ts` with runtime checks for ErrorCode values and export shape
- [x] Run `bun test` from workspace root and verify exit 0, all tests pass (AC: 4)
- [x] Verify no type definitions of `POI`, `MapConfig`, `GraphNode` exist in builder-core or view-core source (AC: 3)

## Dev Notes

### File Structure to Create/Modify

```
packages/types/src/
├── index.ts           ← UPDATE: replace `export {}` with real exports
├── schema.ts          ← CREATE: gwmap data model types
├── errors.ts          ← CREATE: ErrorCode const object
├── viewerTypes.ts     ← CREATE: viewer state management types (not in arch file list but required by AC 1)
└── __tests__/
    ├── placeholder.test.ts   ← DELETE (was Story 1.1 workaround for bun test exit-0)
    └── types.test.ts         ← CREATE: real type-export tests
```

> **Note on `viewerTypes.ts`:** The architecture file structure lists only `schema.ts`, `errors.ts`, and `validate.ts` in the types package. However, Story 1.2 AC 1 explicitly requires `ViewerStatus`, `ViewerState`, `ViewerAction`, and `PoiFilterOptions` to be exported from `@resort-map/types`. A separate `viewerTypes.ts` file keeps viewer state types separate from gwmap schema types. This is not a deviation — it is the only way to satisfy the AC while respecting the cross-package types rule.

### Exact Type Definitions

**`schema.ts`** — derive from gwmap-schema.md which is the single source of truth:

```ts
export interface Position {
  x: number;
  y: number;
}

export interface MapMeta {
  backgroundImageUrl: string;
  center: Position;
  scale: number; // meters per pixel, must be > 0
}

export interface POI {
  id: string;
  label: string;
  position: Position;
  tags: string[];
  icon?: string;
  nodeId?: string; // optional ref to graph node for routing
  meta?: Record<string, unknown>; // preserved but not interpreted
}

export interface GraphNode {
  id: string;
  position: Position;
}

export interface GraphEdge {
  from: string;
  to: string;
  oneway?: boolean; // default false (bidirectional)
}

export interface MapConfig {
  version: string; // current: "1.0"
  map: MapMeta;
  pois: POI[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface Route {
  nodes: GraphNode[]; // ordered path from start to end
  distanceMeters: number;
  walkTimeSeconds: number; // Math.round(distanceMeters / 1.4)
}
```

**`errors.ts`** — const object, NOT an enum (ADR-004 mandates plain Error + code; ErrorCode is the code value, not a thrown type):

```ts
export const ErrorCode = {
  GWMAP_PARSE_ERROR: 'GWMAP_PARSE_ERROR',
  GWMAP_VERSION_MISMATCH: 'GWMAP_VERSION_MISMATCH',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  INVALID_POSITION: 'INVALID_POSITION',
  INVALID_NODE_REF: 'INVALID_NODE_REF',
} as const;

export type ErrorCodeValue = typeof ErrorCode[keyof typeof ErrorCode];
```

> **Why `as const` not `enum`:** TypeScript infers `ErrorCode.GWMAP_PARSE_ERROR` as the literal type `"GWMAP_PARSE_ERROR"`, not `string`. This enables pattern matching in catch handlers without instanceof checks. React error boundaries and Expo crash reporters handle plain `Error` natively — the `code` property is the programmatic discriminant (ARCH-4).

**`viewerTypes.ts`** — viewer state management types used by both view-react and view-react-native:

```ts
import type { MapConfig, POI, Route, Position } from './schema.ts';

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PoiFilterOptions {
  tags?: string[];
  maxDistanceMeters?: number;
  origin?: Position; // required when maxDistanceMeters is set
}

export interface ViewerState {
  status: ViewerStatus;
  mapConfig: MapConfig | null;
  route: Route | null;
  filteredPois: POI[];
  selectedPoiId: string | null;
  imageSize: { width: number; height: number } | null; // ARCH-9: populated via onLoad/onLoadEnd
  filterOptions: PoiFilterOptions;
  error?: string;
}

export type ViewerAction =
  | { type: 'MAP_LOADED'; payload: MapConfig }
  | { type: 'SELECT_POI'; payload: string }
  | { type: 'SET_ROUTE'; payload: Route | null }
  | { type: 'SET_FILTER'; payload: PoiFilterOptions }
  | { type: 'IMAGE_LOADED'; payload: { width: number; height: number } }
  | { type: 'SET_ERROR'; payload: string };
```

> **`imageSize`:** Stored in ViewerState to set `viewBox="0 0 {width} {height}"` on the SVG overlay. Populated by the background image's `onLoad` (web) or `onLoadEnd` (RN) event. Both adapters dispatch `IMAGE_LOADED` action (ARCH-9).

**`index.ts`** — re-export everything. Use `export type` for pure types, plain `export` for the value (`ErrorCode`):

```ts
// schema types
export type { Position, MapMeta, POI, GraphNode, GraphEdge, MapConfig, Route } from './schema.ts';

// error codes (value export — ErrorCode is a runtime object)
export { ErrorCode } from './errors.ts';
export type { ErrorCodeValue } from './errors.ts';

// viewer state management types
export type { ViewerStatus, PoiFilterOptions, ViewerState, ViewerAction } from './viewerTypes.ts';
```

> **`import type` discipline (mandatory per architecture):** Any package importing types-only symbols from `@resort-map/types` MUST use `import type`. Only `ErrorCode` requires a bare `import` because it is a runtime value.

### Test Approach

Replace `placeholder.test.ts` with a real test file that:
1. **Runtime checks:** Verify `ErrorCode` values exist and are strings
2. **Runtime checks:** Verify `ErrorCode` has exactly the 5 expected keys — no extras
3. **Compile checks:** Implicit — if any type definition is wrong, `bun test` will fail with a TypeScript error
4. **Shape check:** Verify the discriminated union exhaustive switch compiles (type-level only)

Example test file at `packages/types/src/__tests__/types.test.ts`:

```ts
import { test, expect, describe } from 'bun:test';
import { ErrorCode } from '../errors.ts';

describe('ErrorCode', () => {
  test('has exactly the required keys', () => {
    const expectedKeys = [
      'GWMAP_PARSE_ERROR',
      'GWMAP_VERSION_MISMATCH',
      'ROUTE_NOT_FOUND',
      'INVALID_POSITION',
      'INVALID_NODE_REF',
    ] as const;
    expect(Object.keys(ErrorCode).sort()).toEqual([...expectedKeys].sort());
  });

  test('values are string literals matching their keys', () => {
    for (const key of Object.keys(ErrorCode) as (keyof typeof ErrorCode)[]) {
      expect(ErrorCode[key]).toBe(key);
    }
  });
});
```

> **No additional runtime tests for pure TypeScript types:** TypeScript interfaces and type aliases have no runtime representation. Their correctness is validated at compile time — `bun test` compiles TypeScript before running, so any type error in the import chain will fail the test run.

### Architecture Compliance Rules

All architecture rules from `architecture.md` apply. Key rules for this story:

1. **`import type` mandatory** — any `import` of a pure TypeScript type MUST use `import type { ... }`. Only `ErrorCode` (a runtime `const` value) uses bare `import`. [Source: architecture.md#Export Patterns]
2. **No `any`** — use `unknown` at parse boundaries. `meta?: Record<string, unknown>` in POI is intentional. [Source: architecture.md#Export Patterns]
3. **Explicit return types on all exported functions** — N/A this story (no functions), but the rule applies from Story 1.3 onward. [Source: architecture.md#Export Patterns]
4. **camelCase file naming** — `schema.ts`, `errors.ts`, `viewerTypes.ts` — correct. [Source: architecture.md#Naming Patterns]
5. **Tests in `src/__tests__/`** — confirmed. [Source: architecture.md#Structure Patterns]
6. **Package public API via `src/index.ts` only** — all exports flow through index.ts. [Source: architecture.md#Structure Patterns]

### Previous Story Learnings (Story 1.1)

- **Placeholder test must be deleted:** `packages/types/src/__tests__/placeholder.test.ts` was added in Story 1.1 because `bun test` exits non-zero when zero test files exist. Story 1.2 creates real tests, so the placeholder must be removed — leaving it would create a duplicate test suite.
- **`bun test` runs from workspace root** and discovers `*.test.ts` files recursively across all packages. This story's tests in `packages/types/src/__tests__/types.test.ts` will be picked up automatically.
- **Bun workspace symlinks:** `@resort-map/types` is symlinked into builder-core/view-core/etc. `node_modules/@resort-map/types`. Any import from `@resort-map/types` in those packages resolves to `packages/types/src/index.ts` via the `"exports"` field — no additional wiring needed.
- **`verbatimModuleSyntax: true`** is set in `tsconfig.base.json`. This means `import type` is NOT optional — TypeScript will error if you import a pure type using bare `import`. Use `import type` for all type-only imports and `import` only for values like `ErrorCode`. This is a compile error, not a lint warning.

### AC 3 Compliance — No Type Duplication in builder-core/view-core

Both `packages/builder-core/src/index.ts` and `packages/view-core/src/index.ts` currently contain only `export {};` (Story 1.1 placeholders). AC 3 is satisfied trivially for this story. The dev agent must confirm no types are defined there and is NOT expected to add any type imports — those packages will import from `@resort-map/types` starting in Stories 2.1 and 3.1 respectively.

### gwmap-schema.md Cross-Check

The field definitions in `schema.ts` MUST match `_bmad-output/specs/spec-resort-map/gwmap-schema.md` exactly:
- `POI.tags` is `string[]` (always present, not optional) — even if empty array
- `GraphEdge.oneway` is `boolean | undefined` (optional, default false in runtime logic)
- `POI.meta` is `Record<string, unknown> | undefined` — parsers preserve without interpreting
- `MapMeta.scale` must be `> 0` in runtime validation (Story 1.3), but the TypeScript type is just `number`
- `POI.nodeId` and `POI.icon` are both optional strings

### References

- gwmap schema field definitions [Source: _bmad-output/specs/spec-resort-map/gwmap-schema.md]
- ErrorCode const pattern (ADR-004) [Source: architecture.md#API & Communication Patterns]
- ViewerState/ViewerAction exact shape [Source: epics.md#Story 3.4 — viewerReducer & ViewerState]
- imageSize in ViewerState (ARCH-9) [Source: architecture.md#Additional Requirements, epics.md#Epic 3.4 initialViewerState]
- Import/export patterns (mandatory `import type`) [Source: architecture.md#Export Patterns]
- File structure for types package [Source: architecture.md#Complete Project Directory Structure]
- ViewerAction discriminated union [Source: epics.md#Story 1.2 AC 1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No issues encountered._

### Completion Notes List

- Created `schema.ts` with all 7 gwmap data model types (Position, MapMeta, POI, GraphNode, GraphEdge, MapConfig, Route) derived from gwmap-schema.md.
- Created `errors.ts` with `ErrorCode` as a `const` object (not an enum), enabling TypeScript literal type inference on values. Exported `ErrorCodeValue` type for use in catch handlers.
- Created `viewerTypes.ts` with `ViewerStatus`, `PoiFilterOptions`, `ViewerState`, and `ViewerAction` discriminated union (6 variants). Used `import type` for schema imports per `verbatimModuleSyntax: true` requirement.
- Updated `index.ts` to re-export all public types using `export type` for pure types and bare `export` for the `ErrorCode` runtime value.
- Deleted `placeholder.test.ts` (Story 1.1 workaround) and replaced with `types.test.ts` — 15 tests covering ErrorCode runtime values and all schema/viewer type shapes.
- All 15 tests pass. AC 3 verified: no type definitions in builder-core or view-core.

### File List

- `packages/types/src/schema.ts` (created)
- `packages/types/src/errors.ts` (created)
- `packages/types/src/viewerTypes.ts` (created)
- `packages/types/src/index.ts` (modified)
- `packages/types/src/__tests__/placeholder.test.ts` (deleted)
- `packages/types/src/__tests__/types.test.ts` (created)

## Change Log

- 2026-06-16: Story 1.2 implemented — all shared TypeScript types and ErrorCode exported from @resort-map/types. 15 tests pass.

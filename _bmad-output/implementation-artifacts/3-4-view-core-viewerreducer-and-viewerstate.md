# Story 3.4: view-core — viewerReducer & ViewerState

---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

Status: review

## Story

**As a** viewer adapter (view-react or view-react-native),
**I want** `viewerReducer(state, action)` exported as a pure function from `view-core/src/viewerState.ts`,
**So that** both adapters can call `useReducer(viewerReducer, initialState)` and share identical state transition logic.

## Acceptance Criteria

1. **Given** `viewerReducer` is exported from `view-core/src/viewerState.ts` **When** I import it **Then** its signature is `(state: ViewerState, action: ViewerAction) => ViewerState`

2. **Given** `initialViewerState` exported from the same file **When** I inspect it **Then** `status` is `"idle"`, `mapConfig` is `null`, `route` is `null`, `filteredPois` is `[]`, `selectedPoiId` is `null`, `imageSize` is `null`, `filterOptions` is `{}`

3. **Given** action `{ type: "MAP_LOADED", payload: MapConfig }` **When** passed to `viewerReducer` **Then** `state.mapConfig` is set to the payload, `status` becomes `"ready"`, and `filteredPois` is set to all POIs from the config

4. **Given** action `{ type: "SELECT_POI", payload: poiId }` **When** passed to `viewerReducer` **Then** `state.selectedPoiId` is updated to the id

5. **Given** action `{ type: "SET_ROUTE", payload: Route | null }` **When** passed to `viewerReducer` **Then** `state.route` is updated

6. **Given** action `{ type: "SET_FILTER", payload: PoiFilterOptions }` and a loaded `mapConfig` **When** passed to `viewerReducer` **Then** `state.filterOptions` is updated **And** `state.filteredPois` is re-computed by calling `filterPois(mapConfig, newOptions)`

7. **Given** action `{ type: "IMAGE_LOADED", payload: { width: number, height: number } }` **When** passed to `viewerReducer` **Then** `state.imageSize` is set to the payload

8. **Given** action `{ type: "SET_ERROR", payload: string }` **When** passed to `viewerReducer` **Then** `state.status` becomes `"error"` **And** `state.error` is set to the payload string

## Tasks / Subtasks

- [x] Create `packages/view-core/src/viewerState.ts` with `viewerReducer` and `initialViewerState`
  - [x] Export `initialViewerState: ViewerState` with all fields at their initial values (AC: 2)
  - [x] Implement `viewerReducer(state, action)` handling all 6 action types via switch/case (AC: 1, 3–8)
  - [x] `SET_FILTER` case: call `filterPois(state.mapConfig, newOptions)` when `mapConfig` is non-null; return empty array when null (AC: 6)
  - [x] Write unit tests in `src/__tests__/viewerReducer.test.ts` FIRST (RED phase), then implement (GREEN) (AC: 1–8)

- [x] Update `packages/view-core/src/index.ts` to export `viewerReducer` and `initialViewerState` (AC: 1)
  - [x] Add `export { viewerReducer, initialViewerState } from './viewerState.ts';`

- [x] Run `bun test` from workspace root — all tests pass (144 existing + ~9 new = ~153 total)

## Dev Notes

### Package Context — What Exists After Story 3.3

**`packages/view-core/src/index.ts` (current):**
```ts
export { parseGwmap } from './parseGwmap.ts';
export { computeRoute } from './computeRoute.ts';
export { filterPois } from './filterPois.ts';
```

**Available runtime values to import (internal):**
- `filterPois` from `'./filterPois.ts'` — needed by `SET_FILTER` case
- `pixelDistance`, `pixelsToMeters`, `estimateWalkTime` from `'./utils/pixelMath.ts'`
- `buildAdjacencyList`, `nearestNode` from `'./utils/graphUtils.ts'`

### Exact File Name Required by AC

AC 1 explicitly names the file: **`view-core/src/viewerState.ts`** (not `reducer.ts`, not `viewerReducer.ts`). This is required by the architecture and the AC.

### Types (from `@resort-map/types/src/viewerTypes.ts`)

```ts
export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ViewerState {
  status: ViewerStatus;
  mapConfig: MapConfig | null;
  route: Route | null;
  filteredPois: POI[];
  selectedPoiId: string | null;
  imageSize: { width: number; height: number } | null;
  filterOptions: PoiFilterOptions;
  error?: string;            // only present when status === 'error'
}

export type ViewerAction =
  | { type: 'MAP_LOADED'; payload: MapConfig }
  | { type: 'SELECT_POI'; payload: string }
  | { type: 'SET_ROUTE'; payload: Route | null }
  | { type: 'SET_FILTER'; payload: PoiFilterOptions }
  | { type: 'IMAGE_LOADED'; payload: { width: number; height: number } }
  | { type: 'SET_ERROR'; payload: string };
```

All exported from `@resort-map/types` as `type` re-exports → all are `import type` in `viewerState.ts`.

### TypeScript Constraints (MUST FOLLOW — same as previous stories)

- `verbatimModuleSyntax: true` → `import type` mandatory for all type-only imports
- `noUncheckedIndexedAccess: true` — not directly relevant to this file (no array indexing in the reducer), but be aware
- Explicit return type on `viewerReducer`
- `.ts` extensions on all relative imports

**Switch exhaustiveness:** TypeScript's discriminated union on `ViewerAction` means the switch cases must cover all 6 action types. Use TypeScript's `never` exhaustion check if desired:
```ts
default: {
  const _exhaustive: never = action;
  return state;
}
```
This is optional but helpful for catching missing cases at compile time. However, it's not required by the ACs — the switch can simply return `state` for unhandled cases.

### Import Declarations for `viewerState.ts`

All types are `import type`. `filterPois` is a runtime value:
```ts
import type { ViewerState, ViewerAction, MapConfig, POI, Route, PoiFilterOptions } from '@resort-map/types';
import { filterPois } from './filterPois.ts';
```

Note: `MapConfig`, `POI`, `Route`, `PoiFilterOptions` may not need explicit import if they're only referenced through `ViewerState` and `ViewerAction` (TypeScript infers from the argument types). But if the switch cases need type narrowing, explicit imports may be needed.

The minimal working approach: import only `ViewerState` and `ViewerAction` as types, plus `filterPois` as a runtime value. TypeScript will infer the action payload types from the discriminated union.

### `initialViewerState` — Exact Values

```ts
export const initialViewerState: ViewerState = {
  status: 'idle',
  mapConfig: null,
  route: null,
  filteredPois: [],
  selectedPoiId: null,
  imageSize: null,
  filterOptions: {},
};
```

`filterOptions: {}` = empty `PoiFilterOptions` object (all fields optional, all undefined).

### Full `viewerReducer` Implementation

```ts
export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'MAP_LOADED':
      return {
        ...state,
        status: 'ready',
        mapConfig: action.payload,
        filteredPois: action.payload.pois,
      };
    case 'SELECT_POI':
      return { ...state, selectedPoiId: action.payload };
    case 'SET_ROUTE':
      return { ...state, route: action.payload };
    case 'SET_FILTER': {
      const newOptions = action.payload;
      const newFilteredPois = state.mapConfig
        ? filterPois(state.mapConfig, newOptions)
        : [];
      return { ...state, filterOptions: newOptions, filteredPois: newFilteredPois };
    }
    case 'IMAGE_LOADED':
      return { ...state, imageSize: action.payload };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
  }
}
```

**Design decisions:**

- **`MAP_LOADED` sets `filteredPois: action.payload.pois`** (all POIs, not filtered) — per AC 3: "filteredPois is set to all POIs from the config". Does NOT re-apply `state.filterOptions`. This is intentional per AC.
- **`SET_FILTER` with null mapConfig** → `filteredPois: []` (no config to filter against). AC 6 specifies behavior only "and a loaded mapConfig" — the null case defaults to empty.
- **Spread `...state`** — preserves all fields not explicitly changed. For example, `MAP_LOADED` does NOT reset `filterOptions`, `selectedPoiId`, etc. Similarly, `SET_ERROR` does NOT reset `mapConfig` or other fields.
- **`error` field** — only `SET_ERROR` sets it. Other actions do NOT clear `error` — the adapters decide when to reset. If `MAP_LOADED` successfully fires after an error, `status` becomes `'ready'` but `error` may still linger in the spread. This is acceptable (adapters control the workflow).

### Test Data

Use the complex fixture and inline data:

```ts
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import type { MapConfig, Route } from '@resort-map/types';
const config = complexMap as unknown as MapConfig;
```

For `SET_FILTER` test:
- `{ tags: ['food'] }` on complex config → `filteredPois` = [poi-001 (Restaurant)]
- `{ tags: ['leisure'] }` on complex config → `filteredPois` = [poi-002, poi-003]

For `SET_ROUTE` test, construct a simple inline `Route`:
```ts
const mockRoute: Route = {
  nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
  distanceMeters: 100,
  walkTimeSeconds: 71,
};
```

### Tests: `src/__tests__/viewerReducer.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import type { MapConfig, Route } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { viewerReducer, initialViewerState } from '../viewerState.ts';

const config = complexMap as unknown as MapConfig;
const mockRoute: Route = {
  nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
  distanceMeters: 100,
  walkTimeSeconds: 71,
};

describe('initialViewerState', () => {
  test('has correct initial values', () => {
    expect(initialViewerState.status).toBe('idle');
    expect(initialViewerState.mapConfig).toBeNull();
    expect(initialViewerState.route).toBeNull();
    expect(initialViewerState.filteredPois).toEqual([]);
    expect(initialViewerState.selectedPoiId).toBeNull();
    expect(initialViewerState.imageSize).toBeNull();
    expect(initialViewerState.filterOptions).toEqual({});
  });
});

describe('viewerReducer', () => {
  test('MAP_LOADED sets mapConfig, status=ready, filteredPois=all POIs', () => {
    const next = viewerReducer(initialViewerState, { type: 'MAP_LOADED', payload: config });
    expect(next.status).toBe('ready');
    expect(next.mapConfig).toBe(config);
    expect(next.filteredPois).toHaveLength(3);
  });

  test('SELECT_POI updates selectedPoiId', () => {
    const next = viewerReducer(initialViewerState, { type: 'SELECT_POI', payload: 'poi-001' });
    expect(next.selectedPoiId).toBe('poi-001');
  });

  test('SET_ROUTE updates route', () => {
    const next = viewerReducer(initialViewerState, { type: 'SET_ROUTE', payload: mockRoute });
    expect(next.route).toBe(mockRoute);
  });

  test('SET_ROUTE with null clears route', () => {
    const withRoute = { ...initialViewerState, route: mockRoute };
    const next = viewerReducer(withRoute, { type: 'SET_ROUTE', payload: null });
    expect(next.route).toBeNull();
  });

  test('SET_FILTER re-computes filteredPois using filterPois', () => {
    const loaded = viewerReducer(initialViewerState, { type: 'MAP_LOADED', payload: config });
    const next = viewerReducer(loaded, { type: 'SET_FILTER', payload: { tags: ['food'] } });
    expect(next.filterOptions).toEqual({ tags: ['food'] });
    expect(next.filteredPois).toHaveLength(1);
    expect(next.filteredPois[0]?.id).toBe('poi-001');
  });

  test('SET_FILTER with null mapConfig returns empty filteredPois', () => {
    const next = viewerReducer(initialViewerState, { type: 'SET_FILTER', payload: { tags: ['food'] } });
    expect(next.filterOptions).toEqual({ tags: ['food'] });
    expect(next.filteredPois).toHaveLength(0);
  });

  test('IMAGE_LOADED sets imageSize', () => {
    const next = viewerReducer(initialViewerState, {
      type: 'IMAGE_LOADED',
      payload: { width: 1920, height: 1080 },
    });
    expect(next.imageSize).toEqual({ width: 1920, height: 1080 });
  });

  test('SET_ERROR sets status=error and error message', () => {
    const next = viewerReducer(initialViewerState, { type: 'SET_ERROR', payload: 'Network failure' });
    expect(next.status).toBe('error');
    expect(next.error).toBe('Network failure');
  });
});
```

### `index.ts` Final State After Story 3.4

```ts
export { parseGwmap } from './parseGwmap.ts';
export { computeRoute } from './computeRoute.ts';
export { filterPois } from './filterPois.ts';
export { viewerReducer, initialViewerState } from './viewerState.ts';
```

### Files to Create / Modify

```
packages/view-core/src/
  index.ts                 ← UPDATE: add viewerReducer + initialViewerState exports
  viewerState.ts           ← CREATE: viewerReducer + initialViewerState
  __tests__/
    viewerReducer.test.ts  ← CREATE: ~9 tests
```

### Previous Stories Learnings

- RED phase confirmed for each test file before implementation
- `import type` for all type-only imports; regular `import { filterPois }` for runtime value
- Use `complexMap as unknown as MapConfig` to cast JSON fixture
- `filteredPois[0]?.id` (optional chain) required when accessing array elements by index due to `noUncheckedIndexedAccess`
- The reducer is a pure switch statement — no side effects, no async, no DOM access
- NFR4: no React imports in any view-core source file

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — clean implementation, no regressions.

### Completion Notes List

- Created `viewerState.ts` with `initialViewerState` and `viewerReducer` as a pure switch/case reducer covering all 6 action types.
- RED phase confirmed: module-not-found error before `viewerState.ts` existed.
- GREEN phase: all 9 tests passed immediately after implementation.
- `SET_FILTER` with null `mapConfig` returns `filteredPois: []` per AC 6.
- `MAP_LOADED` sets `filteredPois` to `action.payload.pois` (all POIs, no filter applied), per AC 3.
- `import type` used for all type-only imports; runtime `filterPois` imported normally.
- Exported `viewerReducer` and `initialViewerState` from `index.ts`.
- Full suite: 153 tests pass (144 existing + 9 new), 0 failures.

### File List

- `packages/view-core/src/viewerState.ts` (created)
- `packages/view-core/src/__tests__/viewerReducer.test.ts` (created)
- `packages/view-core/src/index.ts` (modified)

### Change Log

- 2026-06-18: Implemented Story 3.4 — `viewerReducer` + `initialViewerState` in `view-core/src/viewerState.ts`; 9 new tests added; `index.ts` updated with new exports.

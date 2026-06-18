---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 4.5: view-react — FilterPanel: Tag & Distance Filtering

Status: review

## Story

**As a** map viewer user,
**I want** to filter visible POIs by category tags and/or maximum walking distance,
**So that** I can quickly find the specific type of facility I need.

## Acceptance Criteria

1. **Given** the map is loaded **When** the FilterPanel renders **Then** it shows one chip/button per unique tag found across all POIs in `mapConfig`

2. **Given** I click a tag chip **When** the chip toggles **Then** `SET_FILTER` is dispatched with the updated `tags` array **And** `filteredPois` in the reducer updates accordingly

3. **Given** I set a maximum distance value via a number input **When** the value changes **Then** `SET_FILTER` is dispatched with `maxDistanceMeters` and a required `origin` position **And** only POIs within that distance render as pins

4. **Given** all filters are cleared **When** `filterOptions` effectively has no active constraints **Then** all POIs are shown (full list)

5. **Given** `onFilterChange` prop is provided **When** any filter changes **Then** `onFilterChange(filterOptions)` is called with the current options

## Tasks / Subtasks

- [x] Create `packages/view-react/src/components/FilterPanel.tsx` — new component (AC: 1, 2, 3, 4, 5)
  - [x] Extract unique sorted tags from `mapConfig.pois` and render one `<button>` per tag
  - [x] Toggle tag in/out of `filterOptions.tags`; dispatch `SET_FILTER` on each change
  - [x] Render a number `<input>` for distance; dispatch `SET_FILTER` with `maxDistanceMeters + origin` when value > 0, or without them when cleared
  - [x] Use `mapConfig.map.center` as the `origin` for distance filtering
  - [x] Call `onFilterChange?.(newOptions)` after every dispatch

- [x] Update `packages/view-react/src/MapViewer.tsx` — add `onFilterChange` prop and render `<FilterPanel>` (AC: 1–5)
  - [x] Add `onFilterChange?: (options: PoiFilterOptions) => void` to `MapViewerProps`
  - [x] Add `import type { PoiFilterOptions } from '@resort-map/types'` to the existing type import
  - [x] Import `FilterPanel` from `'./components/FilterPanel.tsx'`
  - [x] Destructure `onFilterChange` in the component function
  - [x] Wrap `<MapCanvas>` and `<FilterPanel>` in a `position: relative` container div when status is `ready`
  - [x] Pass `mapConfig`, `filterOptions={state.filterOptions}`, `dispatch`, `onFilterChange` to `<FilterPanel>`

- [x] Write RED tests — create `packages/view-react/src/__tests__/FilterPanel.test.tsx` (AC: 1–5)
  - [x] Test: renders one button per unique tag in mapConfig
  - [x] Test: clicking tag chip dispatches SET_FILTER adding that tag
  - [x] Test: clicking active tag chip dispatches SET_FILTER removing it (toggle off)
  - [x] Test: changing distance input dispatches SET_FILTER with maxDistanceMeters + origin
  - [x] Test: clearing distance input dispatches SET_FILTER without maxDistanceMeters

- [x] Write RED tests — add `'FilterPanel renders via MapViewer'` test to `packages/view-react/src/__tests__/MapViewer.test.tsx` (AC: 1)
  - [x] Test: `data-testid="filter-panel"` appears when MapViewer is in ready state

- [x] Verify GREEN: all 185 tests pass (179 existing + 6 new)

- [x] Run `bun test packages/view-react` — all 28 view-react tests pass (22 existing + 6 new) (AC: all)

- [x] Run `bun test` from workspace root — confirm no regressions (AC: all)

## Dev Notes

### `filterPois` Function (from `@resort-map/view-core`)

```ts
export function filterPois(config: MapConfig, options: PoiFilterOptions): POI[]
```

**Critical constraint:** `maxDistanceMeters` MUST always be paired with `origin` — `filterPois` throws if `maxDistanceMeters` is set but `origin` is undefined. FilterPanel MUST always set both together.

```ts
// CORRECT
{ maxDistanceMeters: 500, origin: mapConfig.map.center }

// THROWS — never do this
{ maxDistanceMeters: 500 }  // missing origin
```

### `SET_FILTER` and `viewerReducer`

From `packages/view-core/src/viewerState.ts`:
```ts
case 'SET_FILTER': {
  const newOptions = action.payload;
  const newFilteredPois = state.mapConfig
    ? filterPois(state.mapConfig, newOptions)
    : [];
  return { ...state, filterOptions: newOptions, filteredPois: newFilteredPois };
}
```

The reducer handles the computation — FilterPanel only dispatches with the right options and the reducer re-runs `filterPois`. No manual `filterPois` call needed inside FilterPanel.

### `mapConfig.map.center` as Distance Origin

```ts
// MapMeta type:
interface MapMeta {
  backgroundImageUrl: string;
  center: Position;   // { x: number; y: number } in image pixel space
  scale: number;
}
```

`mapConfig.map.center` is the map's center in image pixel coordinates. Use it as the fixed `origin` when the user sets a distance filter. This is simple and reliable for v1 — no need to derive origin from selected POI.

**complex.gwmap.json fixture:** `map.center = { x: 512, y: 400 }`.

### Tag Extraction Pattern

```ts
const allTags = [...new Set(mapConfig.pois.flatMap(p => p.tags))].sort();
```

`flatMap(p => p.tags)` collects all tags from all POIs. `new Set(...)` deduplicates. `.sort()` gives alphabetical order (stable rendering for tests).

**complex.gwmap.json POI tags:**
- `poi-001 ("Restaurant")`: `['food']`
- `poi-002 ("Pool")`: `['leisure']`
- `poi-003 ("Gym")`: `['leisure']`

Unique sorted tags: `['food', 'leisure']` — so FilterPanel renders 2 chips.

### Tag Toggle Logic

```ts
const activeTags = filterOptions.tags ?? [];

const handleTagToggle = (tag: string) => {
  const newTags = activeTags.includes(tag)
    ? activeTags.filter(t => t !== tag)  // deactivate
    : [...activeTags, tag];              // activate

  const newOptions: PoiFilterOptions = {
    ...filterOptions,
    tags: newTags.length > 0 ? newTags : undefined,  // clean up empty array
  };
  dispatch({ type: 'SET_FILTER', payload: newOptions });
  onFilterChange?.(newOptions);
};
```

**Why `undefined` not `[]`?** `filterPois` treats `tags: []` as "no filter" (same as `undefined`), but using `undefined` makes the options object cleaner and consistent with the initial `{}` state.

**Preserves distance filter:** `{ ...filterOptions, tags: ... }` keeps existing `maxDistanceMeters` and `origin` untouched.

### Distance Input Logic

```ts
const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = parseFloat(e.target.value);
  const newOptions: PoiFilterOptions =
    isNaN(value) || value <= 0
      ? { ...filterOptions, maxDistanceMeters: undefined, origin: undefined }
      : { ...filterOptions, maxDistanceMeters: value, origin: mapConfig.map.center };
  dispatch({ type: 'SET_FILTER', payload: newOptions });
  onFilterChange?.(newOptions);
};
```

- Empty string `''` → `parseFloat('')` = NaN → clears maxDistanceMeters + origin
- Value `0` or negative → also clears (treated as "no filter")
- Valid positive number → sets maxDistanceMeters + origin (always paired together)
- **Preserves tag filter:** `{ ...filterOptions, maxDistanceMeters: ... }` keeps existing `tags`

### New File: `FilterPanel.tsx`

Full implementation at `packages/view-react/src/components/FilterPanel.tsx`:

```tsx
import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types';

export interface FilterPanelProps {
  mapConfig: MapConfig;
  filterOptions: PoiFilterOptions;
  dispatch: Dispatch<ViewerAction>;
  onFilterChange?: (options: PoiFilterOptions) => void;
}

export function FilterPanel({ mapConfig, filterOptions, dispatch, onFilterChange }: FilterPanelProps) {
  const allTags = [...new Set(mapConfig.pois.flatMap(p => p.tags))].sort();
  const activeTags = filterOptions.tags ?? [];

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    const newOptions: PoiFilterOptions = {
      ...filterOptions,
      tags: newTags.length > 0 ? newTags : undefined,
    };
    dispatch({ type: 'SET_FILTER', payload: newOptions });
    onFilterChange?.(newOptions);
  }, [activeTags, filterOptions, dispatch, onFilterChange]);

  const handleDistanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newOptions: PoiFilterOptions =
      isNaN(value) || value <= 0
        ? { ...filterOptions, maxDistanceMeters: undefined, origin: undefined }
        : { ...filterOptions, maxDistanceMeters: value, origin: mapConfig.map.center };
    dispatch({ type: 'SET_FILTER', payload: newOptions });
    onFilterChange?.(newOptions);
  }, [filterOptions, mapConfig.map.center, dispatch, onFilterChange]);

  return (
    <div data-testid="filter-panel">
      <div data-testid="tag-chips">
        {allTags.map(tag => (
          <button
            key={tag}
            data-testid={`tag-chip-${tag}`}
            onClick={() => handleTagToggle(tag)}
            aria-pressed={activeTags.includes(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <input
        data-testid="distance-input"
        type="number"
        min={0}
        placeholder="Max distance (m)"
        value={filterOptions.maxDistanceMeters ?? ''}
        onChange={handleDistanceChange}
      />
    </div>
  );
}
```

**`aria-pressed`** on buttons: marks active filter state accessibly. Expect `aria-pressed="true"` / `aria-pressed="false"` in tests.

**No explicit "clear all" button**: AC4 is satisfied by toggling all active tags off (each toggle removes one tag, eventually resulting in no active tags and `filteredPois = all POIs`). The reducer handles this automatically.

### Updates to `MapViewer.tsx`

**Imports to add:**
```tsx
// Before (current):
import type { MapConfig, ViewerStatus } from '@resort-map/types';

// After:
import type { MapConfig, ViewerStatus, PoiFilterOptions } from '@resort-map/types';
import { FilterPanel } from './components/FilterPanel.tsx';
```

**Props interface:**
```tsx
export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;   // NEW
}
```

**Component function signature:**
```tsx
export function MapViewer({ source, onRouteRequest, onFilterChange }: MapViewerProps) {
```

**Ready state render — wrap in container div:**
```tsx
if (state.status === 'ready' && state.mapConfig) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapCanvas
        mapConfig={state.mapConfig}
        imageSize={state.imageSize}
        dispatch={dispatch}
        filteredPois={state.filteredPois}
        selectedPoiId={state.selectedPoiId}
        onRouteRequest={onRouteRequest}
        route={state.route}
      />
      <FilterPanel
        mapConfig={state.mapConfig}
        filterOptions={state.filterOptions}
        dispatch={dispatch}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
```

**Why a wrapper div?** `<FilterPanel>` and `<MapCanvas>` are siblings — React requires a single root element. The `position: relative` allows FilterPanel to be absolutely positioned over the map in a real layout (CSS for FilterPanel position can be added later). The wrapper div doesn't break any existing tests.

### Test File: `FilterPanel.test.tsx` (new)

Full test file at `packages/view-react/src/__tests__/FilterPanel.test.tsx`:

```tsx
import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { FilterPanel } from '../components/FilterPanel.tsx';

const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('FilterPanel', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders one button per unique tag in mapConfig', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    // complex fixture has tags: ['food', 'leisure']
    expect(screen.getByTestId('tag-chip-food')).toBeDefined();
    expect(screen.getByTestId('tag-chip-leisure')).toBeDefined();
    const chips = screen.getByTestId('tag-chips').querySelectorAll('button');
    expect(chips.length).toBe(2);
  });

  test('clicking tag chip dispatches SET_FILTER adding that tag', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    fireEvent.click(screen.getByTestId('tag-chip-food'));
    expect(dispatchCalls).toContainEqual({
      type: 'SET_FILTER',
      payload: { tags: ['food'] },
    });
  });

  test('clicking active tag chip dispatches SET_FILTER removing it', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{ tags: ['food'] }}
        dispatch={mockDispatch}
      />
    );
    fireEvent.click(screen.getByTestId('tag-chip-food'));
    const setFilterCall = dispatchCalls.find(c => c.type === 'SET_FILTER') as
      | { type: 'SET_FILTER'; payload: PoiFilterOptions }
      | undefined;
    expect(setFilterCall?.payload.tags).toBeUndefined();
  });

  test('changing distance input dispatches SET_FILTER with maxDistanceMeters and origin', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    fireEvent.change(screen.getByTestId('distance-input'), { target: { value: '500' } });
    expect(dispatchCalls).toContainEqual({
      type: 'SET_FILTER',
      payload: {
        maxDistanceMeters: 500,
        origin: { x: 512, y: 400 },  // mapConfig.map.center from complex fixture
      },
    });
  });

  test('clearing distance input dispatches SET_FILTER without maxDistanceMeters', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{ maxDistanceMeters: 500, origin: { x: 512, y: 400 } }}
        dispatch={mockDispatch}
      />
    );
    fireEvent.change(screen.getByTestId('distance-input'), { target: { value: '' } });
    const setFilterCall = dispatchCalls.find(c => c.type === 'SET_FILTER') as
      | { type: 'SET_FILTER'; payload: PoiFilterOptions }
      | undefined;
    expect(setFilterCall?.payload.maxDistanceMeters).toBeUndefined();
    expect(setFilterCall?.payload.origin).toBeUndefined();
  });
});
```

**Note on `dispatchCalls` type assertion:**
The pattern `dispatchCalls.find(c => c.type === 'SET_FILTER') as { type: 'SET_FILTER'; payload: PoiFilterOptions } | undefined` is needed because `ViewerAction` is a discriminated union — TypeScript can't narrow `.find()` results by discriminant automatically. The explicit cast is necessary for accessing `.payload.tags` without a type error.

### Test Addition to `MapViewer.test.tsx`

Add one test to the existing `describe('MapViewer', ...)` block:

```tsx
test('renders FilterPanel when source is a valid MapConfig', async () => {
  render(<MapViewer source={config} />);
  await waitFor(() => {
    expect(screen.getByTestId('filter-panel')).toBeDefined();
  });
});
```

Note: `waitFor` is already imported in this file. The FilterPanel renders synchronously once `state.status === 'ready'`, but `waitFor` is needed because the `MAP_LOADED` dispatch happens inside `useEffect`.

### Existing Files: Backward Compatibility

**MapViewer.test.tsx** existing 3 tests look for `data-testid="map-canvas"` and `role="alert"` — both still present after adding `FilterPanel` and the wrapper div. No modifications needed to existing tests.

**MapCanvas.test.tsx** tests render `<MapCanvas>` directly, bypassing `MapViewer` — completely unaffected.

**RoutePath.test.tsx** tests render `<RoutePath>` directly — unaffected.

**useMapViewer.test.ts** tests `useMapViewer` hook — unaffected.

### TypeScript Constraints (unchanged from prior stories)

- `verbatimModuleSyntax: true` → `import type` mandatory for all type-only imports
- `PoiFilterOptions` is a type-only import: `import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types'`
- `Dispatch` from react: `import type { Dispatch } from 'react'`
- Named imports: `import { useCallback } from 'react'`
- No `import React` — JSX transform is automatic
- `React.ChangeEvent<HTMLInputElement>` — since no `import React`, write `React.ChangeEvent` inline requires either: (a) `import type React from 'react'`, or (b) use the full event type `import type { ChangeEvent } from 'react'`

**Recommended:** Use `ChangeEvent` from react directly:
```tsx
import { useCallback } from 'react';
import type { Dispatch, ChangeEvent } from 'react';

// Then:
const handleDistanceChange = useCallback((e: ChangeEvent<HTMLInputElement>) => { ... }, [...]);
```

### Previous Story Learnings (from Stories 4.1–4.4)

- **`afterEach(cleanup)` is REQUIRED** — `@testing-library/react` v16 does NOT auto-cleanup with `bun:test`.
- **`beforeEach` for mock dispatch** — the pattern `dispatchCalls = []; mockDispatch = (a) => dispatchCalls.push(a)` is established.
- **Optional props with defaults** — if FilterPanel has any new props added to existing components, make them optional to avoid breaking existing tests. In this story, `FilterPanel` is new and passed explicitly from `MapViewer`, so no backward compat issue in component props.
- **MapViewer wrapper div** — adding a container div around `<MapCanvas>` and `<FilterPanel>` does NOT break the 3 existing `MapViewer` tests (they use `getByTestId('map-canvas')` and `getByRole('alert')`, both still accessible).
- **No `import React`** — use named imports only from `'react'`.
- **`onFilterChange` destructuring** — must be in the component function signature, NOT just the interface (lesson from Story 4.2 where `dispatch` was missed in the signature).
- **Root-level `bunfig.toml` preload** — already configured; DOM is available in all tests.

### Files to Create / Modify

```
packages/view-react/
  src/
    MapViewer.tsx                               ← UPDATE: add PoiFilterOptions import, FilterPanel import,
                                                           onFilterChange prop, wrapper div, FilterPanel render
    components/
      FilterPanel.tsx                           ← CREATE: new component
    __tests__/
      FilterPanel.test.tsx                      ← CREATE: 5 new tests
      MapViewer.test.tsx                        ← UPDATE: add 1 test for FilterPanel rendering
```

### Expected Test Count

Current total: 179 tests (across 17 files)
New tests in this story:
- `FilterPanel.test.tsx`: 5 tests (new file — 18th test file)
- `MapViewer.test.tsx`: 1 additional test (4 total)
Total new: **6 tests**

Expected total: **185 tests across 18 files**

Run package tests: `bun test packages/view-react` from workspace root
Full regression: `bun test` from workspace root

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RED phase: `FilterPanel.test.tsx` and MapViewer test addition correctly failed with "Cannot find module" and timeout respectively before implementation.
- GREEN phase: All 6 new tests passed immediately after creating `FilterPanel.tsx` and updating `MapViewer.tsx`.
- Full regression: 185 tests across 18 files, 0 failures.

### Completion Notes List

- Created `FilterPanel.tsx`: renders `data-testid="filter-panel"` wrapper with `data-testid="tag-chips"` chip buttons (one per unique sorted tag from all POIs) and a `data-testid="distance-input"` number input.
- Tag toggle logic: adds tag to array if absent, removes if present; cleans up to `undefined` when array becomes empty to avoid empty-array ambiguity in filterPois.
- Distance logic: `parseFloat('')` → NaN → clears `maxDistanceMeters` and `origin`; valid positive number → sets both with `mapConfig.map.center` as origin (required pairing to avoid filterPois throwing).
- Updated `MapViewer.tsx`: added `PoiFilterOptions` type import, `FilterPanel` import, `onFilterChange` prop, wrapper div (`position: relative`), and `FilterPanel` render alongside `MapCanvas`.
- The wrapper div in MapViewer did not break any existing tests — `getByTestId('map-canvas')` traverses the full DOM tree.
- `useCallback` dependencies correctly include `activeTags` (for tag toggle) and `mapConfig.map.center` (for distance handler).

### File List

- `packages/view-react/src/components/FilterPanel.tsx` — CREATED
- `packages/view-react/src/MapViewer.tsx` — UPDATED
- `packages/view-react/src/__tests__/FilterPanel.test.tsx` — CREATED
- `packages/view-react/src/__tests__/MapViewer.test.tsx` — UPDATED

### Change Log

- 2026-06-18: Implemented story 4.5 — FilterPanel component with tag chip toggling and distance input; integrated into MapViewer with onFilterChange callback prop. 6 new tests, 185 total across 18 files.

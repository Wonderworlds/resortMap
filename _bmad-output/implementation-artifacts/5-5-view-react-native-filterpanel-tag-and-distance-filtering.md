---
baseline_commit: 2f0fe989e79100f951f544d23e90baea1a5ab7c3
---

# Story 5.5: view-react-native — FilterPanel: Tag & Distance Filtering

Status: review

## Story

**As a** mobile map viewer user,
**I want** to filter POIs by tag category using touch-friendly buttons,
**So that** I can find a specific type of facility quickly on my phone.

## Acceptance Criteria

1. **Given** the map is loaded **When** the FilterPanel renders **Then** it shows one `<TouchableOpacity>` chip per unique tag across all POIs

2. **Given** I tap a tag chip **When** the tap fires **Then** `SET_FILTER` is dispatched with the updated `tags` array **And** `filteredPois` updates and visible pins change accordingly

3. **Given** I interact with a distance filter control **When** the value changes **Then** `SET_FILTER` is dispatched with `maxDistanceMeters` and `origin` **And** only near POIs remain visible

4. **Given** all filters are cleared **When** `filterOptions` is `{}` **Then** all POIs are shown

5. **Given** `onFilterChange` prop is provided **When** any filter changes **Then** `onFilterChange(filterOptions)` is called

## Tasks / Subtasks

- [x] Write RED tests — create `packages/view-react-native/src/__tests__/FilterPanel.test.tsx` (AC: 1–5)
  - [x] Mock `react-native` with `View`, `TouchableOpacity`, `Text`, `TextInput`, `StyleSheet` only (NO gesture-handler, NO reanimated, NO react-native-svg — FilterPanel doesn't use them)
  - [x] Dynamic import FilterPanel after mocks: `const { FilterPanel } = await import('../components/FilterPanel')`
  - [x] Add `afterEach(cleanup)` and `import type { MapConfig, ViewerAction, PoiFilterOptions }` from `@resort-map/types`
  - [x] Add `describe('FilterPanel (view-react-native)')` with 6 tests:
    - [x] Test: `tag-chip-food` and `tag-chip-leisure` both present (AC 1)
    - [x] Test: tapping `tag-chip-food` dispatches `SET_FILTER` with `{ tags: ['food'] }` (AC 2)
    - [x] Test: tapping active tag chip dispatches `SET_FILTER` with `tags: undefined` (AC 2)
    - [x] Test: changing `distance-input` to `'500'` dispatches `SET_FILTER` with `{ maxDistanceMeters: 500, origin: { x: 512, y: 400 } }` (AC 3)
    - [x] Test: clearing `distance-input` (value `''`) dispatches `SET_FILTER` without `maxDistanceMeters` (AC 4)
    - [x] Test: `onFilterChange` called with correct options on tag toggle (AC 5)

- [x] Update `packages/view-react-native/src/__tests__/MapViewer.test.tsx` — add `TouchableOpacity` and `TextInput` to its `react-native` mock (critical: prevents cross-file cache poisoning when MapViewer renders FilterPanel)

- [x] Create `packages/view-react-native/src/components/FilterPanel.tsx` (AC: 1–5)
  - [x] Import `useCallback` from `react`; `type { Dispatch }` from `react`
  - [x] Import `{ View, TouchableOpacity, Text, TextInput }` from `react-native`
  - [x] Import `type { MapConfig, ViewerAction, PoiFilterOptions }` from `@resort-map/types`
  - [x] Export `FilterPanelProps` interface: `{ mapConfig, filterOptions, dispatch, onFilterChange? }`
  - [x] Compute `allTags` and `activeTags` as in view-react version
  - [x] `handleTagToggle` — same OR-semantics dispatch logic as web version; uses `useCallback`
  - [x] `handleDistanceChange` — receives string value directly (RN `onChangeText`); use `parseFloat`; uses `useCallback`
  - [x] Render: `<View testID="filter-panel"><View testID="tag-chips">{allTags.map(tag => <TouchableOpacity testID={`tag-chip-${tag}`} ...>)}</View><TextInput testID="distance-input" .../></View>`
  - [x] NOT exported from `index.ts` (private component)

- [x] Update `packages/view-react-native/src/MapViewer.tsx` (AC: 1–5)
  - [x] Add `PoiFilterOptions` to the type import from `@resort-map/types`
  - [x] Add `onFilterChange?: (options: PoiFilterOptions) => void` to `MapViewerProps`
  - [x] Add `onFilterChange` to function destructuring
  - [x] Import `FilterPanel` from `./components/FilterPanel`
  - [x] Wrap `<MapCanvas>` and `<FilterPanel>` in a Fragment `<>...</>` inside the ready state condition
  - [x] Pass `mapConfig={state.mapConfig}`, `filterOptions={state.filterOptions}`, `dispatch={dispatch}`, `onFilterChange={onFilterChange}` to `<FilterPanel>`

- [x] Verify GREEN: `bun test packages/view-react-native` — all 27 tests pass (21 existing + 6 new)

- [x] Run `bun test` — confirm 212 total across 22 files, no regressions

## Dev Notes

### Critical: Bun Cross-File Module Cache Poisoning (Learned in Story 5.3, confirmed in 5.4)

**Rule:** ALL test files that transitively import a component that uses a mocked module MUST have the same exports in their mock.

**For this story:** MapViewer.tsx now renders FilterPanel, which imports `{ TouchableOpacity, TextInput }` from `react-native`. When MapViewer.test.tsx loads MapViewer (via dynamic import), Bun resolves react-native against MapViewer.test.tsx's mock. If that mock doesn't have `TouchableOpacity` and `TextInput`, their values will be `undefined` — causing React to throw when FilterPanel tries to render them.

**Fix:** Add `TouchableOpacity` and `TextInput` to the react-native mock in `MapViewer.test.tsx` (update the EXISTING `mock.module('react-native', ...)` in-place — do NOT add a second one).

`MapCanvas.test.tsx` does NOT need updating: MapCanvas doesn't import FilterPanel, so its test tree doesn't load FilterPanel.tsx.

### `FilterPanel.tsx` Full Implementation

Direct RN port of `packages/view-react/src/components/FilterPanel.tsx`. Logic is identical; only the rendering primitives change.

```tsx
import { useCallback } from 'react';
import type { Dispatch } from 'react';
import { View, TouchableOpacity, Text, TextInput } from 'react-native';
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

  const handleDistanceChange = useCallback((value: string) => {
    const parsed = parseFloat(value);
    const newOptions: PoiFilterOptions =
      isNaN(parsed) || parsed <= 0
        ? { ...filterOptions, maxDistanceMeters: undefined, origin: undefined }
        : { ...filterOptions, maxDistanceMeters: parsed, origin: mapConfig.map.center };
    dispatch({ type: 'SET_FILTER', payload: newOptions });
    onFilterChange?.(newOptions);
  }, [filterOptions, mapConfig.map.center, dispatch, onFilterChange]);

  return (
    <View testID="filter-panel">
      <View testID="tag-chips">
        {allTags.map(tag => (
          <TouchableOpacity
            key={tag}
            testID={`tag-chip-${tag}`}
            onPress={() => handleTagToggle(tag)}
          >
            <Text>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        testID="distance-input"
        keyboardType="numeric"
        placeholder="Max distance (m)"
        value={filterOptions.maxDistanceMeters != null ? String(filterOptions.maxDistanceMeters) : ''}
        onChangeText={handleDistanceChange}
      />
    </View>
  );
}
```

**Key differences from web FilterPanel:**
- `<TouchableOpacity onPress={...}>` instead of `<button onClick={...}>`
- `<TextInput onChangeText={(value: string) => ...}>` instead of `<input onChange={(e) => ...}>`
- `onChangeText` receives the string value directly (no event object), so `parseFloat(value)` not `parseFloat(e.target.value)`
- `<View>` instead of `<div>`, `<Text>` instead of span for chip label
- No `aria-pressed` (not standard in RN)

### `MapViewer.tsx` Update

```tsx
import type { MapConfig, ViewerStatus, PoiFilterOptions } from '@resort-map/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import { useMapViewer } from './hooks/useMapViewer';
import { MapCanvas } from './components/MapCanvas';
import { FilterPanel } from './components/FilterPanel';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
}

export function MapViewer({ source, onRouteRequest, onFilterChange }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  return (
    <GestureHandlerRootView testID="map-viewer" style={{ flex: 1 }}>
      {state.status === 'error' && (
        <Text testID="error-message">{state.error}</Text>
      )}
      {state.status === 'ready' && state.mapConfig && (
        <>
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
        </>
      )}
    </GestureHandlerRootView>
  );
}
```

### Updated `react-native` Mock for `MapViewer.test.tsx`

Update the EXISTING `mock.module('react-native', ...)` in MapViewer.test.tsx in-place. Add `TouchableOpacity` and `TextInput`:

```ts
mock.module('react-native', () => ({
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  Image: ({ testID, onLoad, source }: {
    testID?: string;
    onLoad?: (e: { nativeEvent: { source: { width: number; height: number } } }) => void;
    source?: { uri?: string };
  }) => React.createElement('img', {
    'data-testid': testID,
    src: source?.uri,
    onLoad: () => onLoad?.({ nativeEvent: { source: { width: 1024, height: 768 } } }),
  }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  TouchableOpacity: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('div', { 'data-testid': testID, onClick: onPress, role: 'button' }, children),
  TextInput: ({ testID, onChangeText, value, placeholder }: { testID?: string; onChangeText?: (v: string) => void; value?: string; placeholder?: string }) =>
    React.createElement('input', {
      'data-testid': testID,
      value: value ?? '',
      placeholder,
      onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
    }),
}));
```

### `react-native` Mock for `FilterPanel.test.tsx` (New File)

FilterPanel only needs react-native — no gesture-handler, no reanimated, no react-native-svg. The mock is minimal:

```ts
mock.module('react-native', () => ({
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  TouchableOpacity: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('div', { 'data-testid': testID, onClick: onPress, role: 'button' }, children),
  TextInput: ({ testID, onChangeText, value, placeholder }: { testID?: string; onChangeText?: (v: string) => void; value?: string; placeholder?: string }) =>
    React.createElement('input', {
      'data-testid': testID,
      value: value ?? '',
      placeholder,
      onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
    }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));
```

### Full `FilterPanel.test.tsx` Implementation

```tsx
import { test, expect, describe, afterEach, beforeEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

mock.module('react-native', () => ({
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  TouchableOpacity: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('div', { 'data-testid': testID, onClick: onPress, role: 'button' }, children),
  TextInput: ({ testID, onChangeText, value, placeholder }: { testID?: string; onChangeText?: (v: string) => void; value?: string; placeholder?: string }) =>
    React.createElement('input', {
      'data-testid': testID,
      value: value ?? '',
      placeholder,
      onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
    }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

const { FilterPanel } = await import('../components/FilterPanel');

const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('FilterPanel (view-react-native)', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders one chip per unique tag in mapConfig', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    expect(screen.getByTestId('tag-chip-food')).toBeDefined();
    expect(screen.getByTestId('tag-chip-leisure')).toBeDefined();
    const chips = screen.getByTestId('tag-chips').querySelectorAll('[role="button"]');
    expect(chips.length).toBe(2);
  });

  test('tapping tag chip dispatches SET_FILTER adding that tag', () => {
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

  test('tapping active tag chip dispatches SET_FILTER removing it', () => {
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

  test('distance input change dispatches SET_FILTER with maxDistanceMeters and origin', () => {
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
        origin: { x: 512, y: 400 },
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

  test('onFilterChange callback called with correct options on tag toggle', () => {
    const filterChangeCalls: PoiFilterOptions[] = [];
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
        onFilterChange={(opts) => filterChangeCalls.push(opts)}
      />
    );
    fireEvent.click(screen.getByTestId('tag-chip-food'));
    expect(filterChangeCalls).toHaveLength(1);
    expect(filterChangeCalls[0]).toEqual({ tags: ['food'] });
  });
});
```

### `complex.gwmap.json` Fixture Data (relevant to tests)

- `map.center`: `{ x: 512, y: 400 }` — used as `origin` in distance filter
- POIs (3): poi-001 (tags: ['food']), poi-002 (tags: ['leisure']), poi-003 (tags: ['leisure'])
- Unique sorted tags: `['food', 'leisure']` → 2 chips

### FilterPanel Is NOT Exported from index.ts

`packages/view-react-native/src/index.ts` exports only `MapViewer` and `MapViewerProps`. FilterPanel is a private component used internally by MapViewer — do not add it to index.ts.

### `SET_FILTER` and `filterPois` — How They Work

`viewerReducer` in `@resort-map/view-core` handles `SET_FILTER`:
```ts
case 'SET_FILTER': {
  const newOptions = action.payload;
  const newFilteredPois = state.mapConfig
    ? filterPois(state.mapConfig, newOptions)
    : [];
  return { ...state, filterOptions: newOptions, filteredPois: newFilteredPois };
}
```

`filterPois` logic:
- Tag filter: OR semantics — a POI passes if ANY of its tags is in `options.tags`
- Distance filter: if `maxDistanceMeters` set, POI must be within that distance of `origin`
- If `filterOptions` is `{}` (no tags, no distance), all POIs pass (AC 4 is satisfied by the reducer, not FilterPanel itself)

FilterPanel dispatches `SET_FILTER` with the updated options — the reducer takes care of recomputing `filteredPois`. MapCanvas receives `filteredPois` from state (via MapViewer), so pins update automatically.

### Web Analog Reference

`packages/view-react/src/components/FilterPanel.tsx` — direct RN port:
- Same prop interface (`FilterPanelProps`)
- Same business logic (handleTagToggle, handleDistanceChange with same formulas)
- Same testIDs: `filter-panel`, `tag-chips`, `tag-chip-{tag}`, `distance-input`
- Same origin: `mapConfig.map.center`

The only differences are the rendering primitives listed in the Implementation section above.

### Files to Create / Modify

```
packages/view-react-native/
  src/
    MapViewer.tsx                           ← UPDATE: add onFilterChange prop, import FilterPanel, render in Fragment
    components/
      FilterPanel.tsx                       ← CREATE: RN port of web FilterPanel
    __tests__/
      FilterPanel.test.tsx                  ← CREATE: 6 tests (mirror of view-react + onFilterChange test)
      MapViewer.test.tsx                    ← UPDATE: add TouchableOpacity+TextInput to react-native mock
```

### Expected Test Count

Current total: 206 tests across 21 files
New tests in this story:
- `FilterPanel.test.tsx`: +6 tests (1 new file)

Expected total: **212 tests across 22 files**

### Previous Story Learnings (Stories 5.1 – 5.4)

- **`mock.module` NOT hoisted** — Dynamic `await import()` after all `mock.module` calls. Already in place in existing test files; use the same pattern in FilterPanel.test.tsx.
- **Both affected test files need same mock** — Cross-file Bun cache poisoning: update MapViewer.test.tsx's react-native mock to include TouchableOpacity and TextInput whenever adding new react-native imports to components rendered inside MapViewer.
- **`mock.module` factory updated in-place** — Never add a second `mock.module('react-native', ...)`. Update the existing factory function.
- **`afterEach(cleanup)` required** — `@testing-library/react` v16 does not auto-cleanup.
- **No file extensions in imports** — `import { FilterPanel } from './components/FilterPanel'` (no `.tsx`).
- **`import type` for type-only imports** — `verbatimModuleSyntax: true` is set in tsconfig.
- **`fireEvent.click` works for TouchableOpacity** — Since the mock maps `onPress` → `onClick`, use `fireEvent.click(el)` in tests.
- **`fireEvent.change` works for TextInput** — Since the mock maps the DOM `onChange` event to `onChangeText(string)`, use `fireEvent.change(el, { target: { value: '500' } })` in tests.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation matched story spec exactly; all tests passed on first run.

### Completion Notes List

- Created `FilterPanel.tsx`: RN port of view-react FilterPanel. Uses `TouchableOpacity` (onPress→tag toggle) + `TextInput` (onChangeText→distance filter). Same business logic: OR tag semantics, distance with origin from `mapConfig.map.center`. Not exported from index.ts.
- Updated `MapViewer.tsx`: added `onFilterChange` to `MapViewerProps`, imported `PoiFilterOptions` from types, imported `FilterPanel`, wrapped `<MapCanvas>` and `<FilterPanel>` in a Fragment `<>...</>` inside the ready state branch.
- Created `FilterPanel.test.tsx`: 6 tests — chips rendered per unique tag, tag add/remove dispatch, distance set/clear dispatch, onFilterChange callback verification. Minimal react-native mock (no gesture-handler/reanimated/svg). Dynamic import after mock registration.
- Updated `MapViewer.test.tsx`: added `TouchableOpacity` and `TextInput` to react-native mock (cross-file Bun cache poisoning prevention).
- Final: 212 tests / 22 files, 0 failures.

### File List

- `packages/view-react-native/src/components/FilterPanel.tsx` — CREATED
- `packages/view-react-native/src/MapViewer.tsx` — UPDATED
- `packages/view-react-native/src/__tests__/FilterPanel.test.tsx` — CREATED
- `packages/view-react-native/src/__tests__/MapViewer.test.tsx` — UPDATED

### Change Log

- 2026-06-20: Story 5.5 implemented — FilterPanel tag/distance filtering on mobile. Created FilterPanel.tsx (RN TouchableOpacity/TextInput), updated MapViewer to render it, added 6 new FilterPanel tests, updated MapViewer mock. Total: 212 tests across 22 files.

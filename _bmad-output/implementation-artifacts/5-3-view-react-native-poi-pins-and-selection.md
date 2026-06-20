---
baseline_commit: 2f0fe989e79100f951f544d23e90baea1a5ab7c3
---

# Story 5.3: view-react-native — POI Pins & Selection

Status: review

## Story

**As a** mobile map viewer user,
**I want** to see all POI pins rendered via `react-native-svg` and tap one to select it,
**So that** I can identify facilities and initiate routing from them on a mobile device.

## Acceptance Criteria

1. **Given** `state.filteredPois` is non-empty **When** the `<Svg>` overlay renders **Then** each POI in `filteredPois` has a pin (`<Circle>` inside a `<G>`) at its pixel coordinates inside the `<Svg>` (using `react-native-svg`)

2. **Given** I tap a POI pin **When** the tap fires **Then** `SELECT_POI` is dispatched with that POI's id **And** the pin is visually highlighted (different fill color)

3. **Given** a POI is selected and a second POI is tapped **When** the tap fires **Then** `computeRoute` is called with the two POI ids **And** `SET_ROUTE` is dispatched — **this always happens regardless of whether `onRouteRequest` is provided**

4. **Given** `onRouteRequest` prop is provided and a second POI is tapped **When** the internal route is computed **Then** `onRouteRequest(firstPoiId, secondPoiId)` is additionally called as an observation hook (same semantics as view-react Story 4.3)

5. **Given** POIs are filtered **When** a POI is not in `filteredPois` **Then** its pin is NOT rendered in the `<Svg>` overlay

## Tasks / Subtasks

- [x] Write RED tests — update `packages/view-react-native/src/__tests__/MapCanvas.test.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Add `G` and `Circle` to `react-native-svg` mock factory
  - [x] Test: renders `testID="poi-pin-{poi.id}"` for each poi in `filteredPois`
  - [x] Test: `SELECT_POI` dispatched with poi id when pin is tapped (fireEvent.click on `<g>`)
  - [x] Test: `SET_ROUTE` dispatched when second poi tapped while one selected
  - [x] Test: `onRouteRequest` called with `(firstId, secondId)` when second poi tapped
  - [x] Test: pin NOT rendered for poi excluded from `filteredPois`

- [x] Create `packages/view-react-native/src/components/PoiPin.tsx` (AC: 1, 2)
  - [x] Import `G`, `Circle` from `react-native-svg`
  - [x] Props: `{ poi: POI; isSelected: boolean; onTap: () => void }`
  - [x] Render `<G testID={`poi-pin-${poi.id}`} onPress={onTap}>` wrapping `<Circle cx={poi.position.x} cy={poi.position.y} r={8} fill={isSelected ? '#ff4444' : '#3b82f6'} />`
  - [x] NOT exported from `index.ts` (private component used only by MapCanvas)

- [x] Update `packages/view-react-native/src/components/MapCanvas.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Add props: `filteredPois?: POI[]`, `selectedPoiId?: string | null`, `onRouteRequest?: (fromId: string, toId: string) => void`
  - [x] Import `computeRoute` from `@resort-map/view-core`
  - [x] Import `PoiPin` from `./PoiPin`
  - [x] Add `handlePoiTap(tappedPoiId)` callback using `useCallback`
    - [x] If `selectedPoiId` is set and `!== tappedPoiId`: call `computeRoute`, dispatch `SELECT_POI` + `SET_ROUTE`, call `onRouteRequest?.()`
    - [x] Otherwise: dispatch `SELECT_POI` only
  - [x] Change `<Svg ... />` (self-closing) to `<Svg ...>` with children
  - [x] Render `{filteredPois.map(poi => <PoiPin key={poi.id} poi={poi} isSelected={selectedPoiId === poi.id} onTap={() => handlePoiTap(poi.id)} />)}` inside `<Svg>`
  - [x] Default `filteredPois = []`, `selectedPoiId = null`

- [x] Update `packages/view-react-native/src/MapViewer.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Add `onRouteRequest?: (fromId: string, toId: string) => void` to `MapViewerProps`
  - [x] Pass `filteredPois={state.filteredPois}`, `selectedPoiId={state.selectedPoiId}`, `onRouteRequest={onRouteRequest}` to `<MapCanvas>`

- [x] Verify GREEN: `bun test packages/view-react-native` — all 18 tests pass (13 existing + 5 new)

- [x] Run `bun test` — confirm 203 total across 21 files, no regressions

## Dev Notes

### Critical Learning from Stories 5.1 & 5.2: `mock.module` Is NOT Hoisted in Bun

Always use `await import()` AFTER all `mock.module` calls. This applies to MapCanvas.test.tsx (already in place). Adding new mocks (`G`, `Circle`) to the existing `react-native-svg` mock factory requires updating the module factory in-place — the factory is a function registered once before the dynamic import.

### `react-native-svg` Available Exports (v15.15.5)

Confirmed from `elements.d.ts`:
```ts
export { Circle, G, Svg, Path, Polyline, Text, ... }
```

Import as named exports:
```ts
import { G, Circle } from 'react-native-svg';
import { Svg } from 'react-native-svg';
```

**`<G>` props of interest:**
- `onPress?: (event: GestureResponderEvent) => void` — built-in touch handler in react-native-svg
- `testID?: string` — for testing
- All SVG group attributes (transform, etc.)

**`<Circle>` props of interest:**
- `cx: number`, `cy: number` — center coordinates
- `r: number` — radius
- `fill: string`, `stroke: string`, `strokeWidth: number`

### Tap Handling: `onPress` on `<G>` (NOT `Gesture.Tap()`)

In `react-native-svg`, SVG elements (`G`, `Circle`, `Path`, etc.) have built-in `onPress` props that use React Native's Responder system. This is the standard way to handle taps on SVG elements — no `GestureDetector` wrapper needed for individual POI pins.

This is simpler than wrapping each pin in a `GestureDetector` with `Gesture.Tap()`. The outer `GestureDetector` in `MapCanvas` handles canvas-level pan/pinch; `onPress` on `<G>` handles individual pin taps without conflict.

**Do NOT use** `Gesture.Tap()` + `GestureDetector` around each pin — it's unnecessary complexity and may conflict with the canvas-level gesture detector.

### `PoiPin.tsx` Design

```tsx
import type { POI } from '@resort-map/types';
import { G, Circle } from 'react-native-svg';

interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  onTap: () => void;
}

export function PoiPin({ poi, isSelected, onTap }: PoiPinProps) {
  return (
    <G testID={`poi-pin-${poi.id}`} onPress={onTap}>
      <Circle
        cx={poi.position.x}
        cy={poi.position.y}
        r={8}
        fill={isSelected ? '#ff4444' : '#3b82f6'}
        stroke="white"
        strokeWidth={2}
      />
    </G>
  );
}
```

**Why `testID` on `<G>` not `<Circle>`**: Enables `screen.getByTestId('poi-pin-poi-001')` in tests, which resolves to the `<g>` DOM element. `fireEvent.click(g)` then triggers the `onClick` mapped from `onPress` in the mock.

**No label/text in v1 pin**: Keep the pin minimal — just a circle. Labels are post-v1.

### `MapCanvas.tsx` Changes

**handlePoiTap** — mirror the view-react pattern exactly:
```tsx
import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction, POI } from '@resort-map/types';
import { computeRoute } from '@resort-map/view-core';
import { PoiPin } from './PoiPin';

// In MapCanvas props interface:
export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
  filteredPois?: POI[];          // NEW
  selectedPoiId?: string | null; // NEW
  onRouteRequest?: (fromId: string, toId: string) => void; // NEW
}

// In MapCanvas function body:
const handlePoiTap = useCallback((tappedPoiId: string) => {
  if (selectedPoiId !== null && selectedPoiId !== tappedPoiId) {
    const route = computeRoute(mapConfig, selectedPoiId, tappedPoiId);
    dispatch({ type: 'SELECT_POI', payload: tappedPoiId });
    dispatch({ type: 'SET_ROUTE', payload: route });
    onRouteRequest?.(selectedPoiId, tappedPoiId);
  } else {
    dispatch({ type: 'SELECT_POI', payload: tappedPoiId });
  }
}, [selectedPoiId, mapConfig, dispatch, onRouteRequest]);
```

**`<Svg>` change from self-closing to children:**
```tsx
// BEFORE (story 5.2):
<Svg testID="map-overlay" viewBox={...} style={...} />

// AFTER (story 5.3):
<Svg testID="map-overlay" viewBox={...} style={...}>
  {filteredPois.map(poi => (
    <PoiPin
      key={poi.id}
      poi={poi}
      isSelected={selectedPoiId === poi.id}
      onTap={() => handlePoiTap(poi.id)}
    />
  ))}
</Svg>
```

**Full updated props destructuring:**
```tsx
export function MapCanvas({
  mapConfig,
  imageSize,
  dispatch,
  filteredPois = [],
  selectedPoiId = null,
  onRouteRequest,
}: MapCanvasProps) {
```

### `MapViewer.tsx` Changes

**Before (story 5.2):**
```tsx
export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source }: MapViewerProps) {
  ...
  {state.status === 'ready' && state.mapConfig && (
    <MapCanvas mapConfig={state.mapConfig} imageSize={state.imageSize} dispatch={dispatch} />
  )}
}
```

**After (story 5.3):**
```tsx
export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;  // NEW
}

export function MapViewer({ source, onRouteRequest }: MapViewerProps) {
  ...
  {state.status === 'ready' && state.mapConfig && (
    <MapCanvas
      mapConfig={state.mapConfig}
      imageSize={state.imageSize}
      dispatch={dispatch}
      filteredPois={state.filteredPois}        // NEW
      selectedPoiId={state.selectedPoiId}      // NEW
      onRouteRequest={onRouteRequest}          // NEW
    />
  )}
}
```

### Updated `react-native-svg` Mock (for MapCanvas.test.tsx and MapViewer.test.tsx)

Add `G` and `Circle` to the existing mock factory. The `onPress` RN prop maps to `onClick` DOM prop for `fireEvent.click()` to work in tests:

```ts
mock.module('react-native-svg', () => ({
  Svg: ({ children, testID, viewBox, style }: { children?: React.ReactNode; testID?: string; viewBox?: string; style?: unknown }) =>
    React.createElement('svg', { 'data-testid': testID, viewBox, style }, children),
  G: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('g', { 'data-testid': testID, onClick: onPress }, children),
  Circle: ({ cx, cy, r, fill, stroke, strokeWidth }: { cx?: number; cy?: number; r?: number; fill?: string; stroke?: string; strokeWidth?: number }) =>
    React.createElement('circle', { cx, cy, r, fill, stroke, strokeWidth }),
}));
```

**Key point:** The DOM `<g>` element doesn't support `testID` natively — it renders as `data-testid` via the `'data-testid': testID` mapping. `fireEvent.click()` on the `<g>` element triggers the `onClick` handler, which is mapped from the `onPress` prop.

### Test Approach for MapCanvas.test.tsx (Updated)

The existing 5 tests remain unchanged. Add 5 new tests in a new `describe('MapCanvas — POI Pins')` block:

```tsx
describe('MapCanvas — POI Pins', () => {
  test('renders a pin for each poi in filteredPois', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={null} />);
    config.pois.forEach(poi => {
      expect(screen.getByTestId(`poi-pin-${poi.id}`)).toBeDefined();
    });
  });

  test('SELECT_POI dispatched when pin is tapped', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={null} />);
    fireEvent.click(screen.getByTestId(`poi-pin-${config.pois[0].id}`));
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: config.pois[0].id });
  });

  test('SET_ROUTE and SELECT_POI dispatched when second pin tapped while one selected', () => {
    const [poi1, poi2] = config.pois;
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={poi1.id} />);
    fireEvent.click(screen.getByTestId(`poi-pin-${poi2.id}`));
    expect(dispatchCalls.some(c => c.type === 'SET_ROUTE')).toBe(true);
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: poi2.id });
  });

  test('onRouteRequest called with poi ids when second pin tapped', () => {
    const [poi1, poi2] = config.pois;
    const routeCalls: [string, string][] = [];
    const onRouteRequest = (from: string, to: string) => { routeCalls.push([from, to]); };
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={poi1.id} onRouteRequest={onRouteRequest} />);
    fireEvent.click(screen.getByTestId(`poi-pin-${poi2.id}`));
    expect(routeCalls).toContainEqual([poi1.id, poi2.id]);
  });

  test('no pin rendered for poi excluded from filteredPois', () => {
    const [poi1, , poi3] = config.pois;
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={[poi1, poi3]} selectedPoiId={null} />);
    expect(screen.queryByTestId(`poi-pin-${config.pois[1].id}`)).toBeNull();
    expect(screen.getByTestId(`poi-pin-${poi1.id}`)).toBeDefined();
  });
});
```

### computeRoute Relies on Real `view-core`

`@resort-map/view-core` is a workspace package with pure TypeScript functions (no RN deps). It does NOT need to be mocked. The `computeRoute` function uses Dijkstra on the map graph.

The `complex.gwmap.json` fixture has:
- poi-001 → nodeId: node-001
- poi-002 → nodeId: node-006
- poi-003 → nodeId: node-004

The graph has edges connecting node-001 through node-006 (5 edges). The test for `SET_ROUTE` dispatched (AC3) uses `poi-001` as `selectedPoiId` and taps `poi-002` — this triggers `computeRoute(config, 'poi-001', 'poi-002')`. This is the same fixture and scenario used in view-react's MapCanvas tests and it passes there, so it will pass here too.

**If `computeRoute` throws** (no path), the test would throw too. This is acceptable behavior — if the fixture is correct (paths exist), tests pass.

### Current MapCanvas.tsx State (after Story 5.2)

The `<Svg>` is currently self-closing (`/>`). It needs to become an open element with children. The `Svg` import from `react-native-svg` is already in place. Only `G` and `Circle` need to be added to the imports.

### What `viewerReducer` Does with `SELECT_POI` and `SET_ROUTE`

```ts
case 'SELECT_POI':
  return { ...state, selectedPoiId: action.payload };

case 'SET_ROUTE':
  return { ...state, route: action.payload };
```

After `SELECT_POI`: `state.selectedPoiId` = the tapped poi's id.
After `SET_ROUTE`: `state.route` = the computed route (used in Story 5.4 for display).

The MapViewer already passes `state.filteredPois` (populated on `MAP_LOADED`) and `state.selectedPoiId` (null initially) to MapCanvas.

### Files to Create / Modify

```
packages/view-react-native/
  src/
    MapViewer.tsx                           ← UPDATE: add onRouteRequest prop, pass filteredPois/selectedPoiId to MapCanvas
    components/
      MapCanvas.tsx                         ← UPDATE: add filteredPois/selectedPoiId/onRouteRequest props, render PoiPin children in Svg
      PoiPin.tsx                            ← CREATE: <G testID onPress><Circle cx cy r fill /></G>
    __tests__/
      MapCanvas.test.tsx                    ← UPDATE: add G+Circle to svg mock, add 5 new tests in POI Pins describe block
```

Note: `MapViewer.test.tsx` does NOT need updating for this story — it doesn't test POI pin behavior (that's covered in MapCanvas.test.tsx).

### Expected Test Count

Current total: 198 tests across 21 files
New tests in this story:
- `MapCanvas.test.tsx` (updated): +5 tests (10 total in that file)
Total new: **5 tests**

Expected total: **203 tests across 21 files**

### Previous Story Learnings (Stories 5.1 & 5.2)

- **`mock.module` NOT hoisted** — Dynamic `await import()` for any module that transitively imports RN packages. Already applied in MapCanvas.test.tsx.
- **`Animated.View` mock must NOT forward `style`** — RN transform arrays cause "Attempted to assign to readonly property" in React DOM. The mock `Animated.View` renders only `children` + `testID`.
- **`afterEach(cleanup)` required** — `@testing-library/react` v16 does not auto-cleanup.
- **No `.tsx`/`.ts` extension in imports** — Linter strips them.
- **`mock.module` factory is updated in-place** — When updating `MapCanvas.test.tsx` to add `G` and `Circle` to the `react-native-svg` factory, update the EXISTING `mock.module('react-native-svg', ...)` call (do not add a second one).
- **`import type` for type-only imports** — `verbatimModuleSyntax: true` is set.
- **`useCallback` from 'react'** — Already imported in MapCanvas for `handleImageLoad`.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Discovered Bun cross-file module caching issue: when `react-native-svg` mock in MapViewer.test.tsx lacked `G`/`Circle`, it poisoned the module cache for subsequent test files. Fix: added `G` and `Circle` to `react-native-svg` mock in MapViewer.test.tsx to match MapCanvas.test.tsx.

### Completion Notes List

- Created `PoiPin.tsx` — renders `<G testID onPress><Circle .../></G>` using `react-native-svg` primitives.
- Updated `MapCanvas.tsx` — added `filteredPois`, `selectedPoiId`, `onRouteRequest` props; implemented `handlePoiTap` with `useCallback` mirroring view-react pattern; renders PoiPin children inside `<Svg>`.
- Updated `MapViewer.tsx` — added `onRouteRequest` to `MapViewerProps`; passes `filteredPois`, `selectedPoiId`, `onRouteRequest` down to `<MapCanvas>`.
- Updated `MapCanvas.test.tsx` — added `G` and `Circle` to `react-native-svg` mock; added 5 new tests in `describe('MapCanvas — POI Pins')` block.
- Updated `MapViewer.test.tsx` — added `G` and `Circle` to `react-native-svg` mock (required for cross-file cache consistency).
- All 5 ACs satisfied; 203 tests pass across 21 files (0 regressions).

### File List

- packages/view-react-native/src/components/PoiPin.tsx (created)
- packages/view-react-native/src/components/MapCanvas.tsx (modified)
- packages/view-react-native/src/MapViewer.tsx (modified)
- packages/view-react-native/src/__tests__/MapCanvas.test.tsx (modified)
- packages/view-react-native/src/__tests__/MapViewer.test.tsx (modified)

### Change Log

- 2026-06-20: Implemented Story 5.3 — POI Pins & Selection for view-react-native. Created PoiPin component; extended MapCanvas with poi rendering and tap-to-route logic; extended MapViewer to pass poi state and onRouteRequest prop. Added 5 new tests (18 total in package, 203 total).

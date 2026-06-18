---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 4.3: view-react — POI Pins & Selection

Status: review

## Story

**As a** map viewer user,
**I want** to see all POI pins on the map and tap one to select it and see its label,
**So that** I can identify points of interest and trigger routing from them.

## Acceptance Criteria

1. **Given** `state.filteredPois` is non-empty **When** the SVG overlay renders **Then** each POI in `filteredPois` has a pin rendered at its `position` pixel coordinates inside the SVG

2. **Given** I click a POI pin **When** the click event fires **Then** `SELECT_POI` is dispatched with that POI's id **And** the pin is highlighted to indicate selection **And** the selected POI's label is shown

3. **Given** a POI is selected **When** a second POI is selected **Then** `computeRoute` is called internally with both POI ids **And** `SET_ROUTE` is dispatched with the result — this always happens regardless of whether `onRouteRequest` is provided

4. **Given** a POI is selected, `onRouteRequest` prop is provided, and a second POI is selected **When** the internal route is computed **Then** `onRouteRequest(firstPoiId, secondPoiId)` is additionally called as an observation hook

5. **Given** the map is filtered (some POIs hidden) **When** a POI not in `filteredPois` is excluded **Then** its pin is not rendered in the SVG overlay

## Tasks / Subtasks

- [x] Update `packages/view-react/src/MapViewer.tsx` — add `onRouteRequest` prop and pass new props to `<MapCanvas>` (AC: 3, 4)
  - [x] Add `onRouteRequest?: (fromId: string, toId: string) => void` to `MapViewerProps`
  - [x] Destructure `onRouteRequest` in `MapViewer` component function
  - [x] Pass `filteredPois={state.filteredPois}`, `selectedPoiId={state.selectedPoiId}`, `onRouteRequest={onRouteRequest}` to `<MapCanvas>`

- [x] Update `packages/view-react/src/components/MapCanvas.tsx` — add POI pins, routing logic, and new props (AC: 1–5)
  - [x] Add `filteredPois?: POI[]` (optional, default `[]`) to `MapCanvasProps`
  - [x] Add `selectedPoiId?: string | null` (optional, default `null`) to `MapCanvasProps`
  - [x] Add `onRouteRequest?: (fromId: string, toId: string) => void` (optional) to `MapCanvasProps`
  - [x] Add `import { computeRoute } from '@resort-map/view-core'` and `import type { POI } from '@resort-map/types'`
  - [x] Implement `handlePoiClick(clickedPoiId: string)` callback — first click dispatches `SELECT_POI`; second click dispatches `SET_ROUTE` + `SELECT_POI` + calls `onRouteRequest` if provided
  - [x] Add private `PoiPin` component (collocated, not exported) with `<g data-poi-id>` + `<circle>` + `<text>` label when selected
  - [x] Remove `pointerEvents: 'none'` from the SVG element (pins need to be clickable)
  - [x] Render `{filteredPois.map(poi => <PoiPin .../>)}` inside the SVG

- [x] Write RED tests — add POI pin tests to `packages/view-react/src/__tests__/MapCanvas.test.tsx` (AC: 1–5)
  - [x] New describe block `'MapCanvas — POI Pins'` in the existing test file

- [x] Verify GREEN: all 11 new tests pass (5 from Story 4.2 + 6 new)

- [x] Run `bun test packages/view-react` — all 17 view-react tests pass (11 existing + 6 new) (AC: 1–5)

- [x] Run `bun test` from workspace root — confirm no regressions in existing 168 tests (AC: all)

## Dev Notes

### Package Context — What Exists After Story 4.2

**`packages/view-react/src/components/MapCanvas.tsx` (current — to UPDATE):**
```tsx
import { useState, useRef, useCallback } from 'react';
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction } from '@resort-map/types';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
}
// ... pan/zoom implementation
// SVG has pointerEvents: 'none'
// SVG is empty (placeholder comment for Story 4.3)
```

**`packages/view-react/src/MapViewer.tsx` (current — to UPDATE):**
```tsx
export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);
  // ...
  return (
    <MapCanvas
      mapConfig={state.mapConfig}
      imageSize={state.imageSize}
      dispatch={dispatch}
    />
  );
}
```

**Current test file `src/__tests__/MapCanvas.test.tsx`:**
Has 5 passing tests (structure, IMAGE_LOADED, viewBox, drag, zoom). MUST remain passing — any new props added to `MapCanvasProps` must be optional with sensible defaults so existing test calls `<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />` continue to compile and run.

### CRITICAL: Optional Props to Avoid Regression

**`filteredPois`, `selectedPoiId`, and `onRouteRequest` MUST be optional in `MapCanvasProps`**, with defaults in the function destructuring:

```tsx
export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
  filteredPois?: POI[];                                           // optional, default []
  selectedPoiId?: string | null;                                  // optional, default null
  onRouteRequest?: (fromId: string, toId: string) => void;        // optional
}

export function MapCanvas({
  mapConfig,
  imageSize,
  dispatch,
  filteredPois = [],
  selectedPoiId = null,
  onRouteRequest,
}: MapCanvasProps) {
  ...
}
```

This keeps the 5 existing Story 4.2 tests passing without modification. `MapViewer.tsx` still explicitly passes all three since it has access to them from state.

### Architecture Constraints (MUST FOLLOW)

**Collocated private sub-component (architecture doc pattern):**
```tsx
// MapCanvas.tsx
export function MapCanvas(props: MapCanvasProps) { ... }
function PoiPin({ poi, isSelected, onClick }: PoiPinProps) { ... }  // private, NOT exported
```

**SVG patterns (architecture doc):**
```
POI pins: <g data-poi-id={poi.id}> wrapping a <circle>
Coordinate space: always image pixels — never mix with CSS pixels
```

**No `onClick` on SVG for drag-initiating interactions** — but POI selection IS NOT drag-initiating. Use `onClick` on `<g>` for pin selection.

**Stop pointer propagation to prevent accidental pan when clicking pins:**
Add `onPointerDown={(e) => e.stopPropagation()}` on the `<g>` elements. This prevents the outer container's drag handler (`isPanningRef = true`) from firing when the user intends to click a pin.

### POI Data Shape

```ts
interface POI {
  id: string;
  label: string;
  position: { x: number; y: number };  // pixel coordinates in image space
  tags: string[];
  icon?: string;
  nodeId?: string;
}
```

`position.x` and `position.y` are directly usable as SVG `cx`/`cy` attributes when the `viewBox` is set to `"0 0 naturalWidth naturalHeight"`.

### TypeScript Constraints (MUST FOLLOW — unchanged from prior stories)

- `verbatimModuleSyntax: true` → `import type` mandatory for all type-only imports
- `POI` is a type-only import: `import type { MapConfig, ViewerAction, POI } from '@resort-map/types'`
- `computeRoute` is a value import: `import { computeRoute } from '@resort-map/view-core'`
- Named imports from react: `import { useState, useRef, useCallback } from 'react'`
- Explicit return types on all exported functions

### `computeRoute` Signature (from view-core)

```ts
export function computeRoute(
  config: MapConfig,
  from: string | Position,   // POI id OR Position
  to: string | Position,
): Route | null
```

When given a POI id (string), `computeRoute` looks up the POI, finds its `nodeId`, and routes from there. If no `nodeId`, it snaps to the nearest graph node. Returns `null` if no path exists.

**For this story:** always call with POI ids (strings): `computeRoute(mapConfig, selectedPoiId, clickedPoiId)`.

The result can be `null` (no route) — always dispatch `SET_ROUTE` regardless: `dispatch({ type: 'SET_ROUTE', payload: route })`.

### `handlePoiClick` Logic

```tsx
const handlePoiClick = useCallback((clickedPoiId: string) => {
  if (selectedPoiId !== null && selectedPoiId !== clickedPoiId) {
    // Second POI: compute route between the two
    const route = computeRoute(mapConfig, selectedPoiId, clickedPoiId);
    dispatch({ type: 'SELECT_POI', payload: clickedPoiId });
    dispatch({ type: 'SET_ROUTE', payload: route });
    onRouteRequest?.(selectedPoiId, clickedPoiId);
  } else {
    // First POI (or re-clicking already-selected pin)
    dispatch({ type: 'SELECT_POI', payload: clickedPoiId });
  }
}, [selectedPoiId, mapConfig, dispatch, onRouteRequest]);
```

**Order of dispatches for second POI:** `SELECT_POI` before `SET_ROUTE` — both are batched by React 18 before the next render, so the final state has both `selectedPoiId` updated and `route` set.

**`onRouteRequest` observation semantics:** Called AFTER the dispatches, so the internal state update is not blocked. This is an observation hook only.

### `PoiPin` Private Component

```tsx
interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  onClick: () => void;
}

function PoiPin({ poi, isSelected, onClick }: PoiPinProps) {
  return (
    <g
      data-poi-id={poi.id}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
    >
      <circle
        cx={poi.position.x}
        cy={poi.position.y}
        r={8}
        fill={isSelected ? '#ff4444' : '#3b82f6'}
        stroke="white"
        strokeWidth={2}
      />
      {isSelected && (
        <text
          x={poi.position.x}
          y={poi.position.y - 14}
          textAnchor="middle"
          fontSize={12}
          fill="#1a1a1a"
          stroke="white"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {poi.label}
        </text>
      )}
    </g>
  );
}
```

**Why `pointerEvents: 'all'` on `<g>`?** The SVG no longer has `pointerEvents: 'none'`, so this is not strictly required. But it's explicit and future-safe.

**Why `onPointerDown` stopPropagation?** Prevents the outer `<div>` container's `handlePointerDown` from setting `isPanningRef = true` when the user clicks a pin.

### Updated SVG in MapCanvas — Remove `pointerEvents: 'none'`

**Current (Story 4.2):**
```tsx
<svg
  data-testid="map-overlay"
  viewBox={imageSize ? `0 0 ${imageSize.width} ${imageSize.height}` : undefined}
  style={{
    position: 'absolute',
    top: 0, left: 0,
    width: imageSize?.width ?? 0,
    height: imageSize?.height ?? 0,
    pointerEvents: 'none',   // ← REMOVE THIS
  }}
>
  {/* placeholder comment */}
</svg>
```

**Updated (Story 4.3):**
```tsx
<svg
  data-testid="map-overlay"
  viewBox={imageSize ? `0 0 ${imageSize.width} ${imageSize.height}` : undefined}
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: imageSize?.width ?? 0,
    height: imageSize?.height ?? 0,
    overflow: 'visible',
  }}
>
  {filteredPois.map(poi => (
    <PoiPin
      key={poi.id}
      poi={poi}
      isSelected={selectedPoiId === poi.id}
      onClick={() => handlePoiClick(poi.id)}
    />
  ))}
</svg>
```

`overflow: 'visible'` allows labels (text that appears above the pin circle) to show even if they'd be clipped by the SVG's bounding box.

### Updated `MapViewer.tsx`

```tsx
import type { MapConfig, ViewerStatus } from '@resort-map/types';
import { useMapViewer } from './hooks/useMapViewer.ts';
import { MapCanvas } from './components/MapCanvas.tsx';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;  // NEW
}

export function MapViewer({ source, onRouteRequest }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  if (state.status === 'error') {
    return <div role="alert">{state.error}</div>;
  }

  if (state.status === 'ready' && state.mapConfig) {
    return (
      <MapCanvas
        mapConfig={state.mapConfig}
        imageSize={state.imageSize}
        dispatch={dispatch}
        filteredPois={state.filteredPois}      // NEW
        selectedPoiId={state.selectedPoiId}    // NEW
        onRouteRequest={onRouteRequest}        // NEW
      />
    );
  }

  return null;
}
```

Note: `onStatusChange` was defined in `MapViewerProps` but never used in the component body — leave it in the interface (it's part of the public API) but it doesn't need to be destructured.

### Fixture Data (complex.gwmap.json) — for Test Planning

The `complex.gwmap.json` fixture has:
- `poi-001` — "Restaurant" — `nodeId: "node-001"`
- `poi-002` — "Pool" — `nodeId: "node-006"`
- `poi-003` — "Gym" — `nodeId: "node-004"`

Graph: `node-001 → node-002 → node-003 → node-004` and `node-003 → node-005 → node-006`

Therefore:
- `computeRoute(config, 'poi-001', 'poi-002')` → valid route (node-001→…→node-006) — non-null
- `computeRoute(config, 'poi-001', 'poi-003')` → valid route (node-001→…→node-004) — non-null

### Test File: Add to `src/__tests__/MapCanvas.test.tsx`

**Strategy:** Add a second `describe` block below the existing 5 tests. Do NOT modify existing tests.

The new tests need `filteredPois` and `selectedPoiId`. These are optional props (with defaults) so passing them in new tests doesn't affect existing tests.

```tsx
// Add at bottom of MapCanvas.test.tsx, after the existing describe block:

describe('MapCanvas — POI Pins', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders a pin for each POI in filteredPois', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
      />
    );
    const pins = document.querySelectorAll('[data-poi-id]');
    expect(pins.length).toBe(config.pois.length);
  });

  test('clicking a pin dispatches SELECT_POI with the POI id', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
      />
    );
    const pin = document.querySelector('[data-poi-id="poi-001"]') as Element;
    fireEvent.click(pin);
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: 'poi-001' });
  });

  test('clicking a second pin dispatches SET_ROUTE and SELECT_POI', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
        selectedPoiId="poi-001"
      />
    );
    const pin = document.querySelector('[data-poi-id="poi-002"]') as Element;
    fireEvent.click(pin);
    expect(dispatchCalls.some(c => c.type === 'SET_ROUTE')).toBe(true);
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: 'poi-002' });
  });

  test('onRouteRequest is called when a second pin is selected', () => {
    const routeRequestCalls: [string, string][] = [];
    const onRouteRequest = (from: string, to: string) => { routeRequestCalls.push([from, to]); };
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
        selectedPoiId="poi-001"
        onRouteRequest={onRouteRequest}
      />
    );
    const pin = document.querySelector('[data-poi-id="poi-002"]') as Element;
    fireEvent.click(pin);
    expect(routeRequestCalls).toContainEqual(['poi-001', 'poi-002']);
  });

  test('only renders pins for POIs in filteredPois', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={[config.pois[0]!]}
      />
    );
    const pins = document.querySelectorAll('[data-poi-id]');
    expect(pins.length).toBe(1);
    expect(document.querySelector('[data-poi-id="poi-001"]')).not.toBeNull();
    expect(document.querySelector('[data-poi-id="poi-002"]')).toBeNull();
  });

  test('selected pin has different visual style', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        filteredPois={config.pois}
        selectedPoiId="poi-001"
      />
    );
    const selectedPin = document.querySelector('[data-poi-id="poi-001"]')!;
    const circle = selectedPin.querySelector('circle');
    expect(circle?.getAttribute('fill')).toBe('#ff4444');
    const unselectedPin = document.querySelector('[data-poi-id="poi-002"]')!;
    const circle2 = unselectedPin.querySelector('circle');
    expect(circle2?.getAttribute('fill')).toBe('#3b82f6');
  });
});
```

**Notes on test reliability:**
- `document.querySelectorAll('[data-poi-id]')` queries the global happy-dom document; works with `afterEach(cleanup)` since cleanup removes rendered content.
- `config.pois[0]!` — `noUncheckedIndexedAccess` requires the `!` non-null assertion on array access.
- The `fireEvent.click(pin)` fires a click on the `<g>` element; React's synthetic event bubbles up from `<g>` onClick.
- SVG elements in happy-dom support `querySelectorAll` with attribute selectors.

### Files to Create / Modify

```
packages/view-react/
  src/
    MapViewer.tsx                        ← UPDATE: add onRouteRequest prop + pass new props to MapCanvas
    components/
      MapCanvas.tsx                      ← UPDATE: add optional POI props, PoiPin sub-component, routing logic
    __tests__/
      MapCanvas.test.tsx                 ← UPDATE: append 6 new tests in 'MapCanvas — POI Pins' describe block
```

### Previous Story Learnings (from Stories 4.1 and 4.2)

- Existing tests use `<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />` — new props MUST be optional with defaults to avoid breaking these tests.
- `@testing-library/react` does NOT auto-cleanup — always need `afterEach(cleanup)`.
- Root-level `bunfig.toml` preload is what enables the DOM in workspace-root test runs (already configured).
- `MapViewer.tsx`: destructure ALL new props from the component function signature (not just from the interface) — previous story 4.2 had a bug where `dispatch` was in the interface but not destructured.
- `mapConfig.map.backgroundImageUrl` (NOT `mapConfig.meta.backgroundImageUrl`).
- `config.pois[0]!` — non-null assertion needed for indexed access under strict TypeScript settings.

### Expected Test Count

Current total: 168 tests (across 16 files)
New tests added in this story: 6 (in MapCanvas.test.tsx)
Expected total: 174 tests across 16 files (same 16 files — adding to existing test file)

Run with: `bun test packages/view-react` from workspace root
Full regression: `bun test` from workspace root

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation went cleanly RED → GREEN with no debugging required.

### Completion Notes List

- Added 6 failing tests to `MapCanvas.test.tsx` (RED phase confirmed: 5 pass / 6 fail)
- Updated `MapCanvas.tsx`: added optional `filteredPois`, `selectedPoiId`, `onRouteRequest` props with sensible defaults (empty array / null) so existing 5 Story 4.2 tests required no modification
- Added private `PoiPin` collocated sub-component (not exported) using `<g data-poi-id>` + `<circle>` + conditional `<text>` label
- Added `handlePoiClick` callback: first click → SELECT_POI; second click → SELECT_POI + SET_ROUTE + optional onRouteRequest observation hook
- Removed `pointerEvents: 'none'` from SVG, replaced with `overflow: 'visible'`; individual `<g>` pins stop pointer propagation to prevent accidental panning on click
- Updated `MapViewer.tsx`: added `onRouteRequest` to `MapViewerProps`, passed `filteredPois`, `selectedPoiId`, `onRouteRequest` to MapCanvas
- Final: 174/174 tests pass across 16 files (168 pre-existing + 6 new); zero regressions

### File List

- `packages/view-react/src/components/MapCanvas.tsx` (modified)
- `packages/view-react/src/MapViewer.tsx` (modified)
- `packages/view-react/src/__tests__/MapCanvas.test.tsx` (modified)

### Change Log

- Story 4.3 implementation: POI pins and selection in MapCanvas SVG overlay (2026-06-18)

---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 4.4: view-react — Route Path Display

Status: review

## Story

**As a** map viewer user,
**I want** to see a highlighted path drawn on the map between two selected POIs with the walk time shown,
**So that** I know which path to follow and how long it will take.

## Acceptance Criteria

1. **Given** `state.route` is non-null **When** the SVG overlay renders **Then** a polyline connects the route's nodes in order at their pixel coordinates **And** the polyline has a visually distinct style (contrasting color, stroke-width)

2. **Given** `state.route` has a `walkTimeSeconds` value **When** the component renders **Then** a walk time label is displayed (e.g., `~2 min`)

3. **Given** `state.route` is null **When** the SVG overlay renders **Then** no route polyline is rendered

4. **Given** the route is for a path crossing multiple graph nodes **When** rendered **Then** the polyline passes through each node position in the correct order

> **Deferred (post-v1):** Animated route display is out of scope for v1. A static highlighted polyline is sufficient.

## Tasks / Subtasks

- [x] Create `packages/view-react/src/components/RoutePath.tsx` — new exported component (AC: 1, 2, 4)
  - [x] Accept `route: Route` as required prop
  - [x] Render `<g data-testid="route-path">` wrapping a `<polyline>` built from node positions
  - [x] Render a `<text data-testid="route-label">` walk time label at the route midpoint
  - [x] Walk time format: `` `~${Math.ceil(walkTimeSeconds / 60)} min` ``

- [x] Update `packages/view-react/src/components/MapCanvas.tsx` — add `route` prop and render `<RoutePath>` (AC: 1, 3, 4)
  - [x] Add `import type { Route } from '@resort-map/types'` to existing type import line
  - [x] Add `import { RoutePath } from './RoutePath.tsx'`
  - [x] Add `route?: Route | null` (optional, default `null`) to `MapCanvasProps`
  - [x] Render `{route && <RoutePath route={route} />}` inside SVG **before** POI pins (route below pins in z-order)

- [x] Update `packages/view-react/src/MapViewer.tsx` — pass `route={state.route}` to `<MapCanvas>` (AC: 1, 2, 3)
  - [x] Add `route={state.route}` to the `<MapCanvas>` call

- [x] Write RED tests — create `packages/view-react/src/__tests__/RoutePath.test.tsx` (AC: 1, 2, 4)
  - [x] Test: polyline has correct `points` attribute from route node positions
  - [x] Test: walk time label shows `~N min` format
  - [x] Test: walk time rounds up (not down) for fractional minutes

- [x] Write RED tests — add `'MapCanvas — Route Path'` describe block to `packages/view-react/src/__tests__/MapCanvas.test.tsx` (AC: 1, 3)
  - [x] Test: renders `data-testid="route-path"` when `route` prop is provided
  - [x] Test: no route path element when `route` is null (default)

- [x] Verify GREEN: all 22 tests pass (17 existing + 5 new)

- [x] Run `bun test packages/view-react` — all 22 view-react tests pass (AC: all)

- [x] Run `bun test` from workspace root — confirm no regressions in existing 174 tests (AC: all)

## Dev Notes

### Route Type (from `@resort-map/types/src/schema.ts`)

```ts
export interface Route {
  nodes: GraphNode[];      // ordered list of graph nodes on the path
  distanceMeters: number;
  walkTimeSeconds: number;
}

export interface GraphNode {
  id: string;
  position: Position;     // { x: number; y: number } in image pixel space
}
```

`route.nodes[0]` is the start node, `route.nodes[route.nodes.length - 1]` is the end node. All coordinates are image pixels — directly usable as SVG `cx`/`cy` or in `<polyline points>`.

**`computeRoute` never returns a Route with `nodes.length === 0`** — it returns either `null` (no path) or a Route with at least 1 node (start = end = same node when distance is 0). Guard `if (route.nodes.length === 0) return null` in RoutePath anyway for defensive coding.

### SVG `<polyline>` Points Attribute Format

```
points="x1,y1 x2,y2 x3,y3 ..."
```

Build from route nodes:
```ts
const points = route.nodes
  .map(n => `${n.position.x},${n.position.y}`)
  .join(' ');
```

Example with fixture nodes node-001→node-002→node-003 (positions `{x:100,y:300}`, `{x:300,y:300}`, `{x:500,y:300}`):
```
points="100,300 300,300 500,300"
```

### Walk Time Formatting

```ts
const minutes = Math.ceil(route.walkTimeSeconds / 60);
const label = `~${minutes} min`;
```

Examples:
- `walkTimeSeconds: 120` → `"~2 min"`
- `walkTimeSeconds: 90` → `"~2 min"` (Math.ceil(1.5) = 2)
- `walkTimeSeconds: 130` → `"~3 min"` (Math.ceil(2.17) = 3)
- `walkTimeSeconds: 0` → `"~0 min"` (degenerate same-node case — acceptable for v1)

### Walk Time Label Placement

Place the `<text>` label at the route's midpoint node:
```ts
const midNode = route.nodes[Math.floor(route.nodes.length / 2)];
```
Offset the label above the node: `y={midNode.position.y - 14}`.

### New File: `RoutePath.tsx`

Full implementation to create at `packages/view-react/src/components/RoutePath.tsx`:

```tsx
import type { Route } from '@resort-map/types';

export interface RoutePathProps {
  route: Route;
}

export function RoutePath({ route }: RoutePathProps) {
  if (route.nodes.length === 0) return null;

  const points = route.nodes
    .map(n => `${n.position.x},${n.position.y}`)
    .join(' ');

  const minutes = Math.ceil(route.walkTimeSeconds / 60);
  const midNode = route.nodes[Math.floor(route.nodes.length / 2)];

  return (
    <g data-testid="route-path">
      <polyline
        points={points}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {midNode && (
        <text
          data-testid="route-label"
          x={midNode.position.x}
          y={midNode.position.y - 14}
          textAnchor="middle"
          fontSize={14}
          fill="#1a1a1a"
          stroke="white"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {`~${minutes} min`}
        </text>
      )}
    </g>
  );
}
```

**Why `#f59e0b` amber?** Contrasts well against both the blue POI pins and the map background. No external design library needed — just a hardcoded hex.

**Why separate file vs collocated?** Architecture file tree explicitly shows `RoutePath.tsx` as a separate file at `packages/view-react/src/components/RoutePath.tsx`. Unlike `PoiPin` (which was deliberately collocated in Story 4.3 as a private sub-component), `RoutePath` is architecturally intended to be exportable and independently testable.

### TypeScript Constraints (MUST FOLLOW — unchanged from prior stories)

- `verbatimModuleSyntax: true` → `import type` mandatory for all type-only imports
- `Route` and `GraphNode` are type-only: `import type { Route } from '@resort-map/types'`
- Named react imports only: `import { useState } from 'react'` — NO `import React`
- No explicit `import React` anywhere — JSX transform is automatic via `"jsx": "react-jsx"`
- `midNode` could be `undefined` if array has odd-length and `Math.floor` hits an empty slot — but `route.nodes` is always at least length 1 (defensive check at top). Still, TypeScript may flag `route.nodes[Math.floor(...)]` as `GraphNode | undefined` due to `noUncheckedIndexedAccess`. Use `{midNode && (...)}` conditional to guard.

### Updates to `MapCanvas.tsx`

**Import changes:**
```tsx
// Before (Story 4.3):
import type { MapConfig, ViewerAction, POI } from '@resort-map/types';
import { computeRoute } from '@resort-map/view-core';

// After (Story 4.4):
import type { MapConfig, ViewerAction, POI, Route } from '@resort-map/types';
import { computeRoute } from '@resort-map/view-core';
import { RoutePath } from './RoutePath.tsx';
```

**Props interface addition:**
```tsx
export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
  filteredPois?: POI[];
  selectedPoiId?: string | null;
  onRouteRequest?: (fromId: string, toId: string) => void;
  route?: Route | null;   // NEW — optional, default null
}
```

**Function signature addition:**
```tsx
export function MapCanvas({
  mapConfig,
  imageSize,
  dispatch,
  filteredPois = [],
  selectedPoiId = null,
  onRouteRequest,
  route = null,           // NEW
}: MapCanvasProps) {
```

**SVG children — order matters (route BELOW pins in z-order):**
```tsx
<svg data-testid="map-overlay" ...>
  {route && <RoutePath route={route} />}     {/* render first = below pins */}
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

In SVG, elements painted later appear on top. Route path goes first (below) so POI pins are always visible on top of the route line.

### Updates to `MapViewer.tsx`

The only change: add `route={state.route}` to the `<MapCanvas>` call.

```tsx
<MapCanvas
  mapConfig={state.mapConfig}
  imageSize={state.imageSize}
  dispatch={dispatch}
  filteredPois={state.filteredPois}
  selectedPoiId={state.selectedPoiId}
  onRouteRequest={onRouteRequest}
  route={state.route}            // NEW
/>
```

No interface changes needed — `MapViewerProps` doesn't need a route prop (the route is computed internally by the viewer reducer in response to `SET_ROUTE` dispatches from `handlePoiClick`).

### Test File: New `RoutePath.test.tsx`

**CRITICAL:** Must wrap `<RoutePath>` in `<svg>` in every render call — SVG child elements (`<g>`, `<polyline>`, `<text>`) must be inside an `<svg>` root to be in the SVG namespace. Without the wrapper, DOM queries may still find elements but SVG-specific attribute parsing may differ.

```tsx
import { test, expect, describe, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import type { Route } from '@resort-map/types';
import { RoutePath } from '../components/RoutePath.tsx';

afterEach(cleanup);

const threeNodeRoute: Route = {
  nodes: [
    { id: 'n1', position: { x: 100, y: 200 } },
    { id: 'n2', position: { x: 300, y: 400 } },
    { id: 'n3', position: { x: 500, y: 200 } },
  ],
  distanceMeters: 250,
  walkTimeSeconds: 120,
};

describe('RoutePath', () => {
  test('renders a polyline with correct points from route nodes', () => {
    render(
      <svg>
        <RoutePath route={threeNodeRoute} />
      </svg>
    );
    const polyline = document.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute('points')).toBe('100,200 300,400 500,200');
  });

  test('displays walk time label in "~N min" format', () => {
    render(
      <svg>
        <RoutePath route={threeNodeRoute} />
      </svg>
    );
    const label = screen.getByTestId('route-label');
    expect(label.textContent).toBe('~2 min');
  });

  test('rounds walk time up to nearest minute', () => {
    const partialMinRoute: Route = {
      nodes: [
        { id: 'n1', position: { x: 0, y: 0 } },
        { id: 'n2', position: { x: 100, y: 0 } },
      ],
      distanceMeters: 50,
      walkTimeSeconds: 130,  // 2.17 min → Math.ceil = 3
    };
    render(
      <svg>
        <RoutePath route={partialMinRoute} />
      </svg>
    );
    const label = screen.getByTestId('route-label');
    expect(label.textContent).toBe('~3 min');
  });
});
```

### Test Additions to `MapCanvas.test.tsx`

Add a third `describe` block at the bottom (after `'MapCanvas — POI Pins'`). The existing 11 tests must not be modified.

The new tests need `import type { Route }` added to the existing import line at the top of `MapCanvas.test.tsx`:
```tsx
// Before:
import type { MapConfig, ViewerAction } from '@resort-map/types';
// After:
import type { MapConfig, ViewerAction, Route } from '@resort-map/types';
```

New describe block:
```tsx
describe('MapCanvas — Route Path', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders route path element when route prop is provided', () => {
    const route: Route = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 } },
        { id: 'n2', position: { x: 200, y: 200 } },
      ],
      distanceMeters: 100,
      walkTimeSeconds: 60,
    };
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
        route={route}
      />
    );
    expect(screen.getByTestId('route-path')).toBeDefined();
  });

  test('does not render route path element when route is null', () => {
    render(
      <MapCanvas
        mapConfig={config}
        imageSize={{ width: 1024, height: 800 }}
        dispatch={mockDispatch}
      />
    );
    expect(document.querySelector('[data-testid="route-path"]')).toBeNull();
  });
});
```

### Fixture Data Reminder

`complex.gwmap.json` node positions (for reference if needed):
- `node-001`: `{x: 100, y: 300}`
- `node-002`: `{x: 300, y: 300}`
- `node-003`: `{x: 500, y: 300}`
- `node-004`: `{x: 500, y: 500}`
- `node-005`: `{x: 700, y: 300}`
- `node-006`: `{x: 900, y: 300}`

Route `poi-001 → poi-002` produces nodes `[node-001, node-002, node-003, node-005, node-006]`.

### Previous Story Learnings (from Stories 4.1–4.3)

- **All new MapCanvas props MUST be optional with defaults** — existing tests call `<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />` without the new props. Default `route = null` preserves backward compatibility.
- **`afterEach(cleanup)` is REQUIRED in every `.test.tsx` file** — `@testing-library/react` v16 does NOT auto-cleanup with `bun:test`. Missing it causes "Found multiple elements" failures in later tests within the same file.
- **Root-level `bunfig.toml` preload enables DOM** — already configured; no per-file setup needed.
- **Wrap SVG child components in `<svg>` in tests** — `<RoutePath>` renders `<g>`, `<polyline>`, `<text>` which must be inside an `<svg>` root for DOM namespace correctness.
- **`noUncheckedIndexedAccess` is active** — `route.nodes[Math.floor(route.nodes.length / 2)]` returns `GraphNode | undefined`. Guard with `{midNode && (...)}` in JSX.
- **No `import React`** — automatic JSX transform handles this. Named imports only from react.
- **MapViewer.tsx**: always destructure ALL props used in the component body — missed destructuring caused bugs in previous stories.

### Files to Create / Modify

```
packages/view-react/
  src/
    MapViewer.tsx                           ← UPDATE: add route={state.route} to <MapCanvas>
    components/
      MapCanvas.tsx                         ← UPDATE: add Route import, route prop, <RoutePath> render
      RoutePath.tsx                         ← CREATE: new component
    __tests__/
      RoutePath.test.tsx                    ← CREATE: 3 new tests
      MapCanvas.test.tsx                    ← UPDATE: add 2 more tests in new describe block
```

### Expected Test Count

Current total: 174 tests (across 16 files)
New tests added in this story:
- `RoutePath.test.tsx`: 3 tests (new file — 17th test file)
- `MapCanvas.test.tsx`: 2 additional tests
Total new: 5 tests

Expected total: **179 tests across 17 files**

Run package tests: `bun test packages/view-react` from workspace root
Full regression: `bun test` from workspace root

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation went cleanly RED → GREEN with no debugging required.

### Completion Notes List

- Created `RoutePath.tsx` with `<g data-testid="route-path">` wrapping `<polyline>` (amber `#f59e0b` stroke) and `<text data-testid="route-label">` label at midpoint node
- Walk time uses `Math.ceil(walkTimeSeconds / 60)` for conservative rounding; guarded `midNode` with `{midNode && ...}` for `noUncheckedIndexedAccess` compliance
- Updated `MapCanvas.tsx`: added `Route` to existing type import, added `RoutePath` import, added optional `route?: Route | null` prop (default `null`), rendered `{route && <RoutePath route={route} />}` before POI pins for correct z-order
- Updated `MapViewer.tsx`: added `route={state.route}` to `<MapCanvas>` — minimal one-prop change
- Created `RoutePath.test.tsx` (3 tests): polyline points attribute, walk-time label format, rounding up
- Added `'MapCanvas — Route Path'` describe block to `MapCanvas.test.tsx` (2 tests): route renders, null route doesn't render; added `Route` to import line
- Final: 179/179 tests pass across 17 files (174 pre-existing + 5 new); zero regressions

### File List

- `packages/view-react/src/components/RoutePath.tsx` (created)
- `packages/view-react/src/components/MapCanvas.tsx` (modified)
- `packages/view-react/src/MapViewer.tsx` (modified)
- `packages/view-react/src/__tests__/RoutePath.test.tsx` (created)
- `packages/view-react/src/__tests__/MapCanvas.test.tsx` (modified)

### Change Log

- Story 4.4 implementation: route polyline and walk-time label in SVG overlay (2026-06-18)

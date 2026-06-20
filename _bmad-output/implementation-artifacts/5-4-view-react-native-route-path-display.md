---
baseline_commit: 2f0fe989e79100f951f544d23e90baea1a5ab7c3
---

# Story 5.4: view-react-native — Route Path Display

Status: review

## Story

**As a** mobile map viewer user,
**I want** to see a route path drawn on the map overlay with a walk time label,
**So that** I can follow the walking route visually on my phone.

## Acceptance Criteria

1. **Given** `state.route` is non-null **When** the `<Svg>` overlay renders **Then** a `<Polyline>` from `react-native-svg` connects the route nodes in order at their pixel coordinates **And** the polyline has a visually distinct stroke color and width

2. **Given** `state.route.walkTimeSeconds` is set **When** the component renders **Then** a `<Text>` element (from `react-native-svg`) displays the walk time in a human-readable format (e.g., "~3 min")

3. **Given** `state.route` is null **When** the overlay renders **Then** no `<Polyline>` is rendered

## Tasks / Subtasks

- [x] Write RED tests — update `packages/view-react-native/src/__tests__/MapCanvas.test.tsx` (AC: 1, 2, 3)
  - [x] Add `import type { Route }` to the test file imports
  - [x] Add `Polyline` and `Text` to the `react-native-svg` mock factory (update EXISTING mock in-place)
  - [x] Also update `MapViewer.test.tsx` — add `Polyline` and `Text` to its `react-native-svg` mock (critical: prevents cross-file cache poisoning)
  - [x] Add `describe('MapCanvas — Route Path')` block with 3 tests:
    - [x] Test: `screen.getByTestId('route-path')` present when `route` prop is provided
    - [x] Test: `screen.getByTestId('route-label').textContent` equals `'~3 min'` when `walkTimeSeconds=180`
    - [x] Test: `screen.queryByTestId('route-path')` is null when `route` is null/omitted

- [x] Create `packages/view-react-native/src/components/RoutePath.tsx` (AC: 1, 2, 3)
  - [x] Import `type { Route }` from `@resort-map/types`
  - [x] Import `{ G, Polyline, Text as SvgText }` from `react-native-svg`
  - [x] Export `RoutePathProps` interface: `{ route: Route }`
  - [x] Return `null` when `route.nodes.length === 0`
  - [x] Compute `points` as `route.nodes.map(n => \`${n.position.x},${n.position.y}\`).join(' ')`
  - [x] Compute `minutes = Math.ceil(route.walkTimeSeconds / 60)`
  - [x] Compute `midNode = route.nodes[Math.floor(route.nodes.length / 2)]`
  - [x] Render `<G testID="route-path"><Polyline .../>{midNode && <SvgText testID="route-label".../>}</G>`
  - [x] NOT exported from `index.ts` (private component)

- [x] Update `packages/view-react-native/src/components/MapCanvas.tsx` (AC: 1, 2, 3)
  - [x] Add `import type { Route }` to the types import from `@resort-map/types`
  - [x] Add `route?: Route | null` to `MapCanvasProps` interface
  - [x] Add `route = null` to the props destructuring
  - [x] Import `RoutePath` from `./RoutePath`
  - [x] Render `{route && <RoutePath route={route} />}` inside `<Svg>` after the PoiPin children

- [x] Update `packages/view-react-native/src/MapViewer.tsx` (AC: 1, 2, 3)
  - [x] Pass `route={state.route}` to `<MapCanvas>`

- [x] Verify GREEN: `bun test packages/view-react-native` — all 21 tests pass (18 existing + 3 new)

- [x] Run `bun test` — confirm 206 total across 21 files, no regressions

## Dev Notes

### Critical: Bun Cross-File Module Cache Poisoning (Learned in Story 5.3)

**Both** `MapCanvas.test.tsx` AND `MapViewer.test.tsx` must have identical `react-native-svg` mock exports. If one file is missing `Polyline` or `Text`, it poisons the module cache for the other file when Bun runs all tests together. The error manifests as "Export named 'X' not found in module '...lib/commonjs/index.js'" — even if the other file has the export in its mock.

**Fix:** Always update the `react-native-svg` mock in BOTH test files simultaneously whenever adding new exports to the mock.

### `react-native-svg` Exports for This Story

From `elements.d.ts` (v15.15.5):
- `Polyline` — named export, props: `points`, `fill`, `stroke`, `strokeWidth`, `strokeLinecap`, `strokeLinejoin`, `testID`
- `Text` — named export (SVG text element, NOT RN's `<Text>`), props: `x`, `y`, `textAnchor`, `fontSize`, `fill`, `stroke`, `strokeWidth`, `testID`, `children`

Import with alias to avoid naming conflict with RN's `Text`:
```ts
import { G, Polyline, Text as SvgText } from 'react-native-svg';
```

The mock exports as `Text` (the key); the component imports it as `SvgText` via alias — this is fine.

### `RoutePath.tsx` Full Implementation

Mirror view-react's `RoutePath.tsx` exactly, but replace native SVG elements with react-native-svg equivalents:

```tsx
import type { Route } from '@resort-map/types';
import { G, Polyline, Text as SvgText } from 'react-native-svg';

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
    <G testID="route-path">
      <Polyline
        points={points}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {midNode && (
        <SvgText
          testID="route-label"
          x={midNode.position.x}
          y={midNode.position.y - 14}
          textAnchor="middle"
          fontSize={14}
          fill="#1a1a1a"
          stroke="white"
          strokeWidth={3}
        >
          {`~${minutes} min`}
        </SvgText>
      )}
    </G>
  );
}
```

**Why `<G testID="route-path">` as wrapper (not testID on Polyline):** Mirrors the web version's `<g data-testid="route-path">` wrapper. The mock renders `<g data-testid="route-path">`, so `screen.getByTestId('route-path')` resolves to the group element, consistent with view-react Story 4.4.

**Why `Text as SvgText`:** `react-native` exports `Text` (the RN text component); `react-native-svg` also exports `Text` (SVG text). The alias avoids shadowing. The mock key remains `Text` — only the import name changes.

### `MapCanvas.tsx` Update

Add `route` prop and render RoutePath inside `<Svg>`. The `route` prop is optional with default `null`:

```tsx
// Add to imports:
import type { MapConfig, ViewerAction, POI, Route } from '@resort-map/types';
import { RoutePath } from './RoutePath';

// Add to MapCanvasProps:
export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
  filteredPois?: POI[];
  selectedPoiId?: string | null;
  onRouteRequest?: (fromId: string, toId: string) => void;
  route?: Route | null;  // NEW
}

// Add to props destructuring:
export function MapCanvas({
  mapConfig,
  imageSize,
  dispatch,
  filteredPois = [],
  selectedPoiId = null,
  onRouteRequest,
  route = null,  // NEW
}: MapCanvasProps) {

// Inside <Svg> after PoiPins:
<Svg ...>
  {filteredPois.map(poi => (
    <PoiPin key={poi.id} ... />
  ))}
  {route && <RoutePath route={route} />}  // NEW
</Svg>
```

### `MapViewer.tsx` Update

Add `route={state.route}` to `<MapCanvas>`:

```tsx
<MapCanvas
  mapConfig={state.mapConfig}
  imageSize={state.imageSize}
  dispatch={dispatch}
  filteredPois={state.filteredPois}
  selectedPoiId={state.selectedPoiId}
  onRouteRequest={onRouteRequest}
  route={state.route}          // NEW
/>
```

### Updated `react-native-svg` Mock (Both Test Files)

Both `MapCanvas.test.tsx` and `MapViewer.test.tsx` must have this exact mock (update EXISTING `mock.module('react-native-svg', ...)` call in-place — do NOT add a second one):

```ts
mock.module('react-native-svg', () => ({
  Svg: ({ children, testID, viewBox, style }: { children?: React.ReactNode; testID?: string; viewBox?: string; style?: unknown }) =>
    React.createElement('svg', { 'data-testid': testID, viewBox, style }, children),
  G: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('g', { 'data-testid': testID, onClick: onPress }, children),
  Circle: ({ cx, cy, r, fill, stroke, strokeWidth }: { cx?: number; cy?: number; r?: number; fill?: string; stroke?: string; strokeWidth?: number }) =>
    React.createElement('circle', { cx, cy, r, fill, stroke, strokeWidth }),
  Polyline: ({ testID, points, fill, stroke, strokeWidth }: { testID?: string; points?: string; fill?: string; stroke?: string; strokeWidth?: number }) =>
    React.createElement('polyline', { 'data-testid': testID, points, fill, stroke, strokeWidth }),
  Text: ({ testID, children, x, y, fill, stroke }: { testID?: string; children?: React.ReactNode; x?: number; y?: number; fill?: string; stroke?: string }) =>
    React.createElement('text', { 'data-testid': testID, x, y, fill, stroke }, children),
}));
```

### Test Approach for `describe('MapCanvas — Route Path')`

Add to `MapCanvas.test.tsx` after the existing `describe('MapCanvas — POI Pins')` block. Also add `Route` to the type import at the top.

```tsx
import type { MapConfig, ViewerAction, Route } from '@resort-map/types';

// ... (add after existing describe blocks)

describe('MapCanvas — Route Path', () => {
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    mockDispatch = (_action: ViewerAction) => {};
  });

  test('renders route-path when route prop is provided', () => {
    const route: Route = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 } },
        { id: 'n2', position: { x: 200, y: 200 } },
      ],
      distanceMeters: 100,
      walkTimeSeconds: 60,
    };
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} route={route} />);
    expect(screen.getByTestId('route-path')).toBeDefined();
  });

  test('route-label shows walk time when route has walkTimeSeconds', () => {
    const route: Route = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 } },
        { id: 'n2', position: { x: 200, y: 200 } },
      ],
      distanceMeters: 252,
      walkTimeSeconds: 180,
    };
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} route={route} />);
    expect(screen.getByTestId('route-label').textContent).toBe('~3 min');
  });

  test('does not render route-path when route is null', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} route={null} />);
    expect(screen.queryByTestId('route-path')).toBeNull();
  });
});
```

**Why `walkTimeSeconds=180` for `~3 min`:** `Math.ceil(180 / 60) = 3`. The label format is `~${minutes} min`.

**Why `route={null}` explicitly in the third test:** Default is `null`, but being explicit is clearer and tests the conditional rendering directly.

### Web Analog Reference (view-react)

`packages/view-react/src/components/RoutePath.tsx` — this story is a direct RN port:
- Same stroke color `#f59e0b`, strokeWidth 4
- Same walk-time formula: `Math.ceil(walkTimeSeconds / 60)`
- Same label format: `~${minutes} min`
- Same mid-node positioning for the label
- Same testIDs: `route-path`, `route-label`

The only differences are the component primitives: `<g>` → `<G>`, `<polyline>` → `<Polyline>`, `<text>` → `<SvgText>` (aliased from `Text`).

### ViewerState `route` Field

`viewerReducer` (from `@resort-map/view-core`) handles `SET_ROUTE`:
```ts
case 'SET_ROUTE':
  return { ...state, route: action.payload };
```

`state.route` starts as `null` (`initialViewerState`) and is set when a route is computed (from Story 5.3's `handlePoiTap`). MapViewer reads `state.route` directly.

### Files to Create / Modify

```
packages/view-react-native/
  src/
    MapViewer.tsx                           ← UPDATE: pass route={state.route} to MapCanvas
    components/
      MapCanvas.tsx                         ← UPDATE: add route prop, import RoutePath, render conditionally in Svg
      RoutePath.tsx                         ← CREATE: <G testID="route-path"><Polyline/><SvgText/></G>
    __tests__/
      MapCanvas.test.tsx                    ← UPDATE: add Route import, Polyline+Text to svg mock, 3 new route tests
      MapViewer.test.tsx                    ← UPDATE: add Polyline+Text to svg mock (cache fix only)
```

### Expected Test Count

Current total: 203 tests across 21 files
New tests in this story:
- `MapCanvas.test.tsx`: +3 tests (21 total in that file)

Expected total: **206 tests across 21 files**

### Previous Story Learnings (Stories 5.1 – 5.3)

- **`mock.module` NOT hoisted** — Dynamic `await import()` after all `mock.module` calls. Already in place in MapCanvas.test.tsx.
- **Both test files need identical svg mock** — Cross-file Bun cache poisoning: if MapViewer.test.tsx runs first with a mock missing `Polyline`/`Text`, MapCanvas.test.tsx fails even though its mock is correct. ALWAYS update both files.
- **`mock.module` factory updated in-place** — Never add a second `mock.module('react-native-svg', ...)`. Update the existing factory function.
- **`afterEach(cleanup)` required** — `@testing-library/react` v16 does not auto-cleanup.
- **No file extensions in imports** — `import { RoutePath } from './RoutePath'` (no `.tsx`).
- **`import type` for type-only imports** — `verbatimModuleSyntax: true` is set in tsconfig.
- **Animated.View mock must NOT forward `style`** — Already handled in existing mock; no changes needed here.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation went smoothly following the story spec exactly.

### Completion Notes List

- Created `RoutePath.tsx`: `<G testID="route-path"><Polyline/><SvgText/></G>` — direct RN port of view-react's RoutePath. Uses `Text as SvgText` alias to avoid conflict with RN's `Text`. Returns `null` when `route.nodes.length === 0`.
- Updated `MapCanvas.tsx`: added `route?: Route | null` prop (default `null`), imports `RoutePath`, renders `{route && <RoutePath route={route} />}` inside `<Svg>` after PoiPins.
- Updated `MapViewer.tsx`: passes `route={state.route}` to `<MapCanvas>`.
- Updated `MapCanvas.test.tsx`: added `Route` to type imports, added `Polyline` and `Text` to svg mock in-place, added `describe('MapCanvas — Route Path')` with 3 tests (route-path presence, ~3 min label, null route).
- Updated `MapViewer.test.tsx`: added `Polyline` and `Text` to svg mock — critical for Bun cross-file module cache consistency.
- Final: 206 tests / 21 files, 0 failures.

### File List

- `packages/view-react-native/src/components/RoutePath.tsx` — CREATED
- `packages/view-react-native/src/components/MapCanvas.tsx` — UPDATED
- `packages/view-react-native/src/MapViewer.tsx` — UPDATED
- `packages/view-react-native/src/__tests__/MapCanvas.test.tsx` — UPDATED
- `packages/view-react-native/src/__tests__/MapViewer.test.tsx` — UPDATED

### Change Log

- 2026-06-20: Story 5.4 implemented — route path display on mobile map viewer. Created RoutePath.tsx, updated MapCanvas and MapViewer to propagate state.route, added 3 new tests. Total: 206 tests across 21 files.

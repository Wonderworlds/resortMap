---
baseline_commit: 380b7631e569776c5f3abcdf7b41944207e3c16b
---

# Story 7.1: Add `preview` prop to `@resort-map/view-react`

Status: review

## Story

As a builder-react developer,
I want the `MapViewer` component in `@resort-map/view-react` to accept a `preview?: boolean` prop,
so that I can embed the viewer in the builder's Preview mode without exposing any interactive viewer controls to the user.

## Acceptance Criteria

1. **Given** `<MapViewer source={config} preview={true} />` renders, **when** inspecting the DOM, **then** no element with `data-testid="filter-panel"` is present.

2. **Given** `<MapViewer source={config} preview={true} />` renders, **when** inspecting the DOM, **then** a `data-testid="preview-badge"` element is visible inside the viewer container.

3. **Given** `<MapViewer source={config} preview={true} />` with POIs, **when** a POI pin is clicked, **then** no `SELECT_POI` or `SET_ROUTE` action is dispatched (pins are display-only).

4. **Given** `<MapViewer source={config} preview={true} />` with `selectedPoiId` set, **when** rendering, **then** no `data-testid="route-path"` is present (route path suppressed in preview).

5. **Given** `<MapViewer source={config} />` with no `preview` prop, **when** rendering with a valid map, **then** `filter-panel` is present, POI clicks dispatch `SELECT_POI`, and no preview badge is shown — all existing behavior unchanged.

6. **Given** the `MapViewerProps` TypeScript type exported from `@resort-map/view-react`, **when** a consumer writes `<MapViewer source={config} preview={true} />`, **then** TypeScript accepts it without error.

7. **Given** `bun test` run from workspace root after this change, **then** all previously passing tests continue to pass.

## Tasks / Subtasks

- [x] Task 1: Update `MapViewerProps` and `MapViewer.tsx` (AC: 1, 2, 5, 6)
  - [x] 1.1 Add `preview?: boolean` to `MapViewerProps` interface in `MapViewer.tsx`
  - [x] 1.2 Conditionally skip `<FilterPanel>` render when `preview === true`
  - [x] 1.3 Add `<div data-testid="preview-badge">` overlay element when `preview === true` (position absolute, bottom-left, small chip style)
  - [x] 1.4 Pass `preview` prop down to `<MapCanvas>`

- [x] Task 2: Update `MapCanvas.tsx` to support preview mode (AC: 3, 4, 5)
  - [x] 2.1 Add `preview?: boolean` to `MapCanvasProps` interface
  - [x] 2.2 Update `PoiPin` private sub-component to accept and use `preview` prop: when `preview=true`, set `pointerEvents: none` on the `<g>` element and remove the `onClick` / `onPointerDown` handlers
  - [x] 2.3 In `MapCanvas`, skip rendering `<RoutePath>` when `preview === true`
  - [x] 2.4 Pass `preview` to each `<PoiPin>` render call

- [x] Task 3: Write tests (RED before GREEN) (AC: 1–7)
  - [x] 3.1 In `MapViewer.test.tsx`: add test — preview=true hides FilterPanel
  - [x] 3.2 In `MapViewer.test.tsx`: add test — preview=true shows preview badge
  - [x] 3.3 In `MapCanvas.test.tsx`: add test — preview=true POI click does NOT dispatch SELECT_POI
  - [x] 3.4 In `MapCanvas.test.tsx`: add test — preview=true suppresses RoutePath
  - [x] 3.5 In `MapViewer.test.tsx`: add test — preview absent, filter-panel still visible (regression guard)
  - [x] 3.6 Run `bun test` — confirm all existing tests still pass

- [x] Task 4: Verify `index.ts` exports (AC: 6)
  - [x] 4.1 Confirm `MapViewerProps` is already re-exported from `src/index.ts` (it is — no change needed)
  - [x] 4.2 Run TypeScript check: `bun build src/index.ts --external react --external react-dom --dry-run` (or `tsc --noEmit`) to verify no type errors

## Dev Notes

### Files to Modify (UPDATE — read current state before touching)

| File | Change |
|------|--------|
| `packages/view-react/src/MapViewer.tsx` | Add `preview?: boolean` to props; conditionally skip FilterPanel; add preview badge; pass `preview` to MapCanvas |
| `packages/view-react/src/components/MapCanvas.tsx` | Add `preview?: boolean` to props; disable PoiPin interaction; suppress RoutePath |
| `packages/view-react/src/__tests__/MapViewer.test.tsx` | Add 3 new test cases for preview behavior |
| `packages/view-react/src/__tests__/MapCanvas.test.tsx` | Add 2 new test cases for preview behavior in MapCanvas |

No new files. No package.json changes. No index.ts changes.

### Current `MapViewer.tsx` State (critical — read before modifying)

```tsx
export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
}

export function MapViewer({ source, onRouteRequest, onFilterChange }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);
  // renders MapCanvas + FilterPanel when state.status === 'ready'
}
```

Add `preview` to destructuring: `{ source, onRouteRequest, onFilterChange, preview }`.

### Current `MapCanvas.tsx` — PoiPin interaction pattern

`PoiPin` is a **private sub-component** (collocated in `MapCanvas.tsx`, not exported). It currently sets:
```tsx
<g data-poi-id={poi.id} onClick={onClick} onPointerDown={(e) => e.stopPropagation()} style={{ cursor: 'pointer', pointerEvents: 'all' }}>
```

In preview mode, the `<g>` must become:
```tsx
<g data-poi-id={poi.id} style={{ pointerEvents: 'none' }}>
```
— no `onClick`, no `onPointerDown`, no `cursor: pointer`.

The `PoiPin` component must accept a `preview?: boolean` prop. When `preview=true`, render the display-only variant. Visual appearance (circle, label when selected) remains the same.

### Current `MapCanvas.tsx` — RoutePath rendering

Currently: `{route && <RoutePath route={route} />}`

In preview mode, even if `route` is non-null (defensive), skip rendering: `{!preview && route && <RoutePath route={route} />}`

### Preview Badge Design

Minimal inline style (no MUI — this is the viewer package, no MUI dependency):
```tsx
{preview && (
  <div
    data-testid="preview-badge"
    style={{
      position: 'absolute',
      bottom: 8,
      left: 8,
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 12,
      pointerEvents: 'none',
      zIndex: 10,
    }}
  >
    Preview
  </div>
)}
```

Place it inside the `<div style={{ position: 'relative', width: '100%', height: '100%' }}>` that wraps `MapCanvas` + `FilterPanel`.

### Architecture Compliance (mandatory)

- **`import type` for type-only imports** — `preview` is a `boolean` value prop, no type import needed.
- **Props interface above component function** — `MapViewerProps` is already correctly placed; `MapCanvasProps` is already correctly placed.
- **Private sub-components collocated** — `PoiPin` stays in `MapCanvas.tsx`, not exported.
- **No prop spreading onto host elements** — do not spread `...rest` onto `<div>`.
- **Explicit return types** — `MapViewer` and `MapCanvas` are not exported with explicit return type in current code; do not add them (not required for existing code, only for new exported functions).
- **No `@resort-map/view-core` imports needed** — this story adds no new view-core calls.
- **No MUI** — `@resort-map/view-react` has zero MUI dependency. Preview badge uses inline styles only.

### Testing Patterns (from existing test files)

Tests use `@testing-library/react` + `bun:test`:
```ts
import { test, expect, describe, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
afterEach(cleanup);
```

Fixture import pattern (used in all existing test files):
```ts
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
const config = complexMap as unknown as MapConfig;
```

**Existing test to preserve (do not break):**
```ts
test('renders FilterPanel when source is a valid MapConfig', async () => {
  render(<MapViewer source={config} />);
  await waitFor(() => expect(screen.getByTestId('filter-panel')).toBeDefined());
});
```
The new `preview={true}` variant must NOT affect this test — it uses no `preview` prop.

**New test patterns:**
```ts
test('does not render FilterPanel when preview={true}', async () => {
  render(<MapViewer source={config} preview={true} />);
  await waitFor(() => {
    expect(document.querySelector('[data-testid="filter-panel"]')).toBeNull();
  });
});

test('renders preview badge when preview={true}', async () => {
  render(<MapViewer source={config} preview={true} />);
  await waitFor(() => {
    expect(screen.getByTestId('preview-badge')).toBeDefined();
  });
});
```

For MapCanvas preview tests, dispatch mock pattern:
```ts
test('POI pin does not dispatch SELECT_POI when preview={true}', () => {
  const dispatched: ViewerAction[] = [];
  render(
    <MapCanvas
      mapConfig={config}
      imageSize={{ width: 1024, height: 800 }}
      dispatch={(a) => dispatched.push(a)}
      filteredPois={config.pois}
      preview={true}
    />
  );
  const pin = document.querySelector('[data-poi-id="poi-001"]') as Element;
  fireEvent.click(pin);
  expect(dispatched.filter(a => a.type === 'SELECT_POI')).toHaveLength(0);
});
```

### TDD Order (mandatory — red before green)

1. Write all new test cases first → run `bun test` → confirm new tests FAIL, existing tests PASS
2. Implement `MapViewerProps` + `MapViewer.tsx` changes
3. Implement `MapCanvasProps` + `MapCanvas.tsx` changes
4. Run `bun test` → confirm ALL tests pass (new + existing)

### Project Structure Notes

- Story touches only `packages/view-react/src/` — no other package affected
- No new files; no `package.json` changes; no workspace root changes
- `src/index.ts` already exports `MapViewerProps` — no change required
- The builder (Story 7.5) will import `MapViewer` as `workspace:*` dependency — the `preview` prop will be available when that story is developed

### References

- Current `MapViewer.tsx`: `packages/view-react/src/MapViewer.tsx`
- Current `MapCanvas.tsx`: `packages/view-react/src/components/MapCanvas.tsx`
- Current `FilterPanel.tsx`: `packages/view-react/src/components/FilterPanel.tsx`
- Existing MapViewer tests: `packages/view-react/src/__tests__/MapViewer.test.tsx`
- Existing MapCanvas tests: `packages/view-react/src/__tests__/MapCanvas.test.tsx`
- Architecture — component patterns: `_bmad-output/planning-artifacts/architecture.md` §"Component Patterns"
- PRD FR-21: `_bmad-output/planning-artifacts/prds/prd-resortMap-2026-06-24/prd.md` §4.5

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- TDD cycle: 4 new tests written first (RED: 4 fail, 56 pass), then implementation applied (GREEN: 60 pass).
- `MapViewerProps` extended with `preview?: boolean`; FilterPanel conditionally skipped; preview badge added as absolute-positioned overlay.
- `PoiPinProps` extended with `preview?: boolean`; preview variant renders `<g>` with `pointerEvents: none` and no event handlers.
- `RoutePath` skipped in `MapCanvas` when `preview === true` via `{!preview && route && <RoutePath />}`.
- Full workspace suite: 269/269 pass, 0 regressions.

### File List

- packages/view-react/src/MapViewer.tsx
- packages/view-react/src/components/MapCanvas.tsx
- packages/view-react/src/__tests__/MapViewer.test.tsx
- packages/view-react/src/__tests__/MapCanvas.test.tsx

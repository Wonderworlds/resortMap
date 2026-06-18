---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 4.2: view-react — MapCanvas: Pan & Zoom

Status: review

## Story

**As a** map viewer user,
**I want** to pan the map by dragging and zoom by scrolling (mouse wheel or pinch trackpad),
**So that** I can explore the full map and inspect areas in detail.

## Acceptance Criteria

1. **Given** the map is loaded and `status` is `"ready"` **When** the MapCanvas renders **Then** a CSS-transformed `<div>` wraps both the background `<img>` and an SVG overlay as siblings (per ADR-003 web pattern)

2. **Given** I click and drag on the canvas **When** pointer events fire **Then** the transform `div` translates in real time with the drag delta **And** releasing the pointer commits the new pan offset

3. **Given** I scroll with the mouse wheel over the canvas **When** the wheel event fires **Then** the transform `div` scales around the cursor position **And** zoom level stays within sensible bounds (0.5× – 5×)

4. **Given** the background image loads successfully **When** `onLoad` fires **Then** action `IMAGE_LOADED` is dispatched with the image's `naturalWidth` and `naturalHeight` **And** the SVG overlay's `viewBox` is set to `"0 0 {naturalWidth} {naturalHeight}"`

## Tasks / Subtasks

- [x] Update `packages/view-react/src/components/MapCanvas.tsx` — replace stub with full pan/zoom implementation (AC: 1, 2, 3, 4)
  - [x] Add `dispatch: Dispatch<ViewerAction>` to `MapCanvasProps` interface
  - [x] Implement `{ tx, ty, scale }` transform state using `useState`
  - [x] Add `isPanningRef` and `lastPosRef` refs to track drag state
  - [x] Implement `handlePointerDown` — set `isPanningRef`, record start position, call `setPointerCapture` (with try-catch for happy-dom)
  - [x] Implement `handlePointerMove` — compute dx/dy, update `{ tx, ty }` via functional setState
  - [x] Implement `handlePointerUp` — clear `isPanningRef`
  - [x] Implement `handleWheel` — compute `newScale = clamp(prev * factor, 0.5, 5)`, translate to zoom around cursor position
  - [x] Implement `handleImageLoad` — dispatch `IMAGE_LOADED` with `e.currentTarget.naturalWidth/naturalHeight`
  - [x] Render outer container `<div data-testid="map-canvas">` with pointer + wheel handlers
  - [x] Render inner transform `<div data-testid="map-transform">` with CSS transform style
  - [x] Render `<img src={mapConfig.map.backgroundImageUrl}>` with `onLoad` handler
  - [x] Render `<svg data-testid="map-overlay">` with `viewBox` from `imageSize`

- [x] Update `packages/view-react/src/MapViewer.tsx` — pass `dispatch` to `<MapCanvas>` (AC: 4)
  - [x] Add `dispatch` to the `<MapCanvas>` props in the render output

- [x] Write RED tests in `packages/view-react/src/__tests__/MapCanvas.test.tsx` first (import MapCanvas, verify it fails) (AC: 1–4)

- [x] Verify GREEN: all 5 MapCanvas tests pass (AC: 1–4)

- [x] Run `bun test packages/view-react` — all 11 view-react tests pass (6 from Story 4.1 + 5 new) (AC: 1–4)

- [x] Run `bun test` from workspace root — confirm no regressions in existing 163 tests (AC: 1–5)

## Dev Notes

### Package Context — What Exists After Story 4.1

**Current `packages/view-react/src/components/MapCanvas.tsx` (STUB — to be REPLACED):**
```tsx
import type { MapConfig } from '@resort-map/types';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
}

export function MapCanvas({ mapConfig: _mapConfig }: MapCanvasProps) {
  // Full CSS-transform pan/zoom implementation in Story 4.2
  return <div data-testid="map-canvas" />;
}
```

**Current `packages/view-react/src/MapViewer.tsx`:**
```tsx
import type { MapConfig } from '@resort-map/types';
import type { ViewerStatus } from '@resort-map/types';
import { useMapViewer } from './hooks/useMapViewer.ts';
import { MapCanvas } from './components/MapCanvas.tsx';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  if (state.status === 'error') {
    return <div role="alert">{state.error}</div>;
  }

  if (state.status === 'ready' && state.mapConfig) {
    return (
      <MapCanvas
        mapConfig={state.mapConfig}
        imageSize={state.imageSize}
      />
    );
  }

  return null;
}
```

Note: `dispatch` is already destructured from `useMapViewer` but not yet passed to `MapCanvas`. Story 4.2 adds it.

**Current test files (must remain passing):**
- `src/__tests__/useMapViewer.test.ts` — 3 tests (hook behavior)
- `src/__tests__/MapViewer.test.tsx` — 3 tests using `screen.getByTestId('map-canvas')`

The existing `MapViewer` tests check for `data-testid="map-canvas"` — the new `MapCanvas` implementation must keep this testid on the outer container. ✓

**Current config files (unchanged):**
- `package.json`: already has `@testing-library/react`, `happy-dom`, `@resort-map/types`
- `tsconfig.json`: already has `"jsx": "react-jsx"`, `"types": ["bun", "react"]`
- `bunfig.toml` (package-level): `preload = ["./src/__tests__/setup.ts"]`
- `bunfig.toml` (workspace root): `preload = ["./packages/view-react/src/__tests__/setup.ts"]`

### Architecture Constraints (MUST FOLLOW — ADR-003)

From ADR-003 (Pan/Zoom: Single animated transform container):
> One CSS-transformed `<div>` (web) wraps the background `<Image>` and `<Svg>` overlay **as siblings**.
> POI pins render at raw pixel coordinates from the `.gwmap` file — zero coordinate conversion at render time.
> Web equivalent: `react-zoom-pan-pinch` or equivalent CSS transform container.

**For Story 4.2: implement with native CSS transforms and pointer events (no external library).**

Structure mandated by ADR-003:
```
<div data-testid="map-canvas">        ← outer: clips overflow, captures events
  <div data-testid="map-transform">   ← inner: CSS transform, position absolute
    <img src={backgroundImageUrl} />  ← background image (sibling #1)
    <svg viewBox="0 0 W H">           ← overlay (sibling #2, Stories 4.3/4.4 add content)
  </div>
</div>
```

### TypeScript Constraints (MUST FOLLOW — unchanged from prior stories)

- `verbatimModuleSyntax: true` → `import type` mandatory for all type-only imports
- Named imports from react: `import { useState, useRef, useCallback } from 'react'`
- Type imports: `import type { Dispatch } from 'react'`
- Cross-package types: `import type { MapConfig, ViewerAction } from '@resort-map/types'`
- No `any` — use `unknown` at boundaries
- Explicit return types on all exported functions
- `.tsx` extension on all relative imports of component files

### MapConfig Field Name — CRITICAL

`MapConfig.map.backgroundImageUrl` — the top-level key is `map`, NOT `meta`:
```ts
// CORRECT
mapConfig.map.backgroundImageUrl
mapConfig.map.center
mapConfig.map.scale

// WRONG (will cause TypeScript error)
mapConfig.meta.backgroundImageUrl
```

### Full `MapCanvas.tsx` Implementation

```tsx
import { useState, useRef, useCallback } from 'react';
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction } from '@resort-map/types';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

export function MapCanvas({ mapConfig, imageSize, dispatch }: MapCanvasProps) {
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // happy-dom may not support setPointerCapture
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setTransform(prev => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setTransform(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * zoomFactor));
      return {
        scale: newScale,
        tx: cx - (cx - prev.tx) * (newScale / prev.scale),
        ty: cy - (cy - prev.ty) * (newScale / prev.scale),
      };
    });
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    dispatch({
      type: 'IMAGE_LOADED',
      payload: { width: img.naturalWidth, height: img.naturalHeight },
    });
  }, [dispatch]);

  const { tx, ty, scale } = transform;

  return (
    <div
      data-testid="map-canvas"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        data-testid="map-transform"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
        }}
      >
        <img
          src={mapConfig.map.backgroundImageUrl}
          alt=""
          draggable={false}
          onLoad={handleImageLoad}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
        <svg
          data-testid="map-overlay"
          viewBox={imageSize ? `0 0 ${imageSize.width} ${imageSize.height}` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize?.width ?? 0,
            height: imageSize?.height ?? 0,
            pointerEvents: 'none',
          }}
        >
          {/* POI pins (Story 4.3) and route path (Story 4.4) will render here as children */}
        </svg>
      </div>
    </div>
  );
}
```

**Zoom math explanation (for cursor-anchored zoom):**
- `cx`, `cy` = cursor position relative to the outer container
- Before zoom: point at `(cx, cy)` in screen space corresponds to image point `((cx - tx) / scale, (cy - ty) / scale)`
- After zoom: we want that same image point to stay at `(cx, cy)`:
  - `cx = imgX * newScale + newTx` → `newTx = cx - (cx - tx) * (newScale / scale)`
  - Same for Y

**`e.preventDefault()` in wheel handler:** React's `onWheel` is an active (non-passive) listener, so `e.preventDefault()` correctly prevents page scroll.

### Updated `MapViewer.tsx` (only the JSX output for ready state changes)

Only change needed: add `dispatch` to the `<MapCanvas>` call:

```tsx
  if (state.status === 'ready' && state.mapConfig) {
    return (
      <MapCanvas
        mapConfig={state.mapConfig}
        imageSize={state.imageSize}
        dispatch={dispatch}
      />
    );
  }
```

The full `import` block in `MapViewer.tsx` needs no changes — `dispatch` is already returned by `useMapViewer`.

### Test File — `src/__tests__/MapCanvas.test.tsx`

**Testing approach:**
- The test file uses the same `afterEach(cleanup)` pattern established in Story 4.1
- `dispatch` is mocked via a simple closure to capture calls
- `fireEvent.pointerDown/Move/Up` drive pan tests
- `fireEvent.wheel` drives zoom test
- `fireEvent.load(img)` drives the IMAGE_LOADED test
- For `naturalWidth`/`naturalHeight`: happy-dom images have 0 natural dimensions by default; `Object.defineProperty` can override this at the instance level

```tsx
import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { MapCanvas } from '../components/MapCanvas.tsx';

const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('MapCanvas', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders outer container, transform div, and SVG overlay', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    expect(screen.getByTestId('map-canvas')).toBeDefined();
    expect(screen.getByTestId('map-transform')).toBeDefined();
    expect(screen.getByTestId('map-overlay')).toBeDefined();
  });

  test('dispatches IMAGE_LOADED on image load', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const img = document.querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 800, configurable: true });
    fireEvent.load(img);
    expect(dispatchCalls).toContainEqual({ type: 'IMAGE_LOADED', payload: { width: 1000, height: 800 } });
  });

  test('sets SVG viewBox when imageSize is provided', () => {
    render(<MapCanvas mapConfig={config} imageSize={{ width: 1000, height: 800 }} dispatch={mockDispatch} />);
    const svg = screen.getByTestId('map-overlay');
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 800');
  });

  test('translates transform div when dragging', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const container = screen.getByTestId('map-canvas');
    fireEvent.pointerDown(container, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(container, { clientX: 150, clientY: 120 });
    fireEvent.pointerUp(container);
    const transform = screen.getByTestId('map-transform');
    expect(transform.style.transform).toContain('translate(50px, 20px)');
  });

  test('scales transform div on wheel scroll', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const container = screen.getByTestId('map-canvas');
    fireEvent.wheel(container, { deltaY: -100 }); // scroll up = zoom in
    const transform = screen.getByTestId('map-transform');
    const scaleMatch = transform.style.transform.match(/scale\(([^)]+)\)/);
    expect(scaleMatch).not.toBeNull();
    if (scaleMatch) {
      expect(parseFloat(scaleMatch[1])).toBeGreaterThan(1);
    }
  });
});
```

**Notes on test reliability:**
- `Object.defineProperty` for `naturalWidth`/`naturalHeight`: if happy-dom defines these as non-configurable on the prototype, you may need to use `Object.defineProperty(img, 'naturalWidth', { get: () => 1000, configurable: true })` with a getter. As a last resort, test that `dispatchCalls` contains an `IMAGE_LOADED` action with `{ width: 0, height: 0 }` (happy-dom default).
- `fireEvent.wheel` does not prevent default scroll in tests; this is OK since we test state change only.
- `setPointerCapture` failure in happy-dom is handled by try-catch in the implementation — tests still work.
- `screen.getByTestId('map-canvas')` from the existing `MapViewer.test.tsx` must still resolve to the outer container — it will, since we keep `data-testid="map-canvas"` on the outer div. ✓

### Files to Create / Modify

```
packages/view-react/
  src/
    MapViewer.tsx                    ← UPDATE: add dispatch prop to <MapCanvas>
    components/
      MapCanvas.tsx                  ← UPDATE: replace stub with full implementation
    __tests__/
      MapCanvas.test.tsx             ← CREATE: 5 tests
```

### Previous Story Learnings (from Story 4.1)

- `dom = "happy-dom"` in per-package `bunfig.toml` is NOT applied when running `bun test` from workspace root (Bun 1.3.14). Use the workspace-root `bunfig.toml` preload (already configured).
- `@testing-library/react` does NOT auto-cleanup with `bun:test` — every test file with `render()` needs `afterEach(cleanup)`.
- `@resort-map/types` must be an explicit dependency of `view-react` (already added in Story 4.1). ✓
- Test files with `.tsx` extension need to be placed in `src/__tests__/` — file discovery works with that path.
- Existing `MapViewer.test.tsx` queries `screen.getByTestId('map-canvas')` — keep this testid on the outer container.

### Expected Test Count

Current total: 163 tests (across 15 files)
New tests added in this story: 5 (in MapCanvas.test.tsx)
Expected total: 168 tests across 16 files

Run with: `bun test packages/view-react` from workspace root (applies bunfig.toml preload via root-level config)
Full regression: `bun test` from workspace root

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `MapViewer.tsx` from Story 4.1 only destructured `state` from `useMapViewer`, not `dispatch`. The story spec noted `dispatch` was "already destructured" but the actual code didn't include it. Fixed by adding `dispatch` to the destructuring: `const { state, dispatch } = useMapViewer(source)`.

### Completion Notes List

- Replaced `MapCanvas.tsx` stub with full CSS-transform pan/zoom implementation per ADR-003: outer container div (event capture) + inner transform div (CSS translate+scale) + `<img>` + `<svg>` overlay as siblings.
- Transform state managed as a single `{ tx, ty, scale }` object via `useState` for atomic updates in wheel handler.
- Drag uses `isPanningRef`/`lastPosRef` refs to avoid stale closures; `setPointerCapture` wrapped in try-catch for happy-dom compatibility.
- Wheel handler uses `getBoundingClientRect()` to compute cursor-relative position for zoom anchoring; functional `setTransform` guarantees correct prev values.
- `handleImageLoad` dispatches `IMAGE_LOADED` with `naturalWidth`/`naturalHeight` from the img element.
- Updated `MapViewer.tsx` to destructure and pass `dispatch` down to `<MapCanvas>`.
- 5 new tests: structure, IMAGE_LOADED dispatch, SVG viewBox, pointer drag, wheel zoom.
- All 168 tests pass (163 existing + 5 new), 0 regressions.

### File List

- `packages/view-react/src/components/MapCanvas.tsx` — updated: full pan/zoom implementation replacing stub
- `packages/view-react/src/MapViewer.tsx` — updated: destructure and pass dispatch to MapCanvas
- `packages/view-react/src/__tests__/MapCanvas.test.tsx` — created: 5 tests covering AC1-4

### Change Log

- 2026-06-18: Story 4.2 implemented — MapCanvas pan/zoom via CSS transforms and pointer/wheel events, IMAGE_LOADED dispatch, 5 new tests (168 total)

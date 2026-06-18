---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 2.3: builder-react — MapCanvas: Image Loading & POI Placement

Status: review

## Story

As a map author,
I want to see my background image on the SVG canvas and place POI pins by clicking in Place POI mode,
So that I can visually position points of interest without editing JSON.

## Acceptance Criteria

1. **Given** `mapConfig` has a `backgroundImageUrl` **When** the MapCanvas renders **Then** the background image appears inside an SVG with `viewBox="0 0 {imageNaturalWidth} {imageNaturalHeight}"` **And** the `<image>` element uses `onPointerDown` (not `onClick`, per ARCH-12)

2. **Given** `activeTool` is `"placePoi"` **When** I click the canvas **Then** `addPoi` is called with `position` computed from the click coordinates relative to the SVG viewBox **And** a POI pin (SVG marker) appears at that position immediately **And** the new POI's id becomes `selectedItemId`

3. **Given** `activeTool` is `"select"` and I click a POI pin **When** the `onPointerDown` fires on the pin (carrying `data-poi-id`) **Then** `selectedItemId` updates to that POI's id

4. **Given** `activeTool` is `"select"` and I drag a POI pin **When** pointer events fire during drag **Then** `updatePoi` is called with the updated pixel position **And** the pin moves in real time with the pointer

5. **Given** `activeTool` is `"select"` and a POI is selected (`selectedItemId` matches a POI id) **When** I press the Delete key **Then** `removePoi` is called with that POI's id **And** the pin is removed from the canvas **And** `selectedItemId` is cleared to `null`

6. **Given** a POI whose id matches `selectedItemId` **When** the canvas renders **Then** that pin is visually distinct from unselected pins (e.g., different fill color or outline)

## Tasks / Subtasks

- [x] Fix `tsc` compilation failure: add `@types/react` and update tsconfig (code review finding #3)
  - [x] Add `"@types/react": "^18.3.0"` to `devDependencies` in `packages/builder-react/package.json`
  - [x] Add `"react"` to the `"types"` array in `packages/builder-react/tsconfig.json`
  - [x] Run `bun install` to install `@types/react`
- [x] Create `packages/builder-react/src/utils/svgCoords.ts` — pure coordinate-conversion utility
  - [x] Export `toSvgCoords(clientX, clientY, rect, imageSize)` returning non-negative `{x, y}` in SVG pixels
- [x] Create `packages/builder-react/src/__tests__/svgCoords.test.ts` — unit tests for coordinate conversion
  - [x] Test center of canvas maps to center of image
  - [x] Test top-left corner maps to `{x: 0, y: 0}`
  - [x] Test coordinates below zero are clamped to 0 (fixes code review finding #2)
  - [x] Test non-square image scales x and y independently
  - [x] Test CSS-pixel canvas `!== ` SVG-pixel coordinate (scaling works)
- [x] Update `packages/builder-react/src/components/MapCanvas.tsx` — full rewrite with SVG canvas (AC: 1–6)
  - [x] Load image natural dimensions via `new Image()` on each `backgroundImageUrl` change
  - [x] While image is loading, show a "Loading map image…" placeholder
  - [x] Once loaded: render `<svg>` with `viewBox="0 0 {w} {h}"` and `<image>` element (AC: 1)
  - [x] `onPointerDown` on `<svg>` for "place POI" (AC: 2): convert coords, `addPoi`, select new POI
  - [x] `onPointerMove` on `<svg>` for drag: update POI position in real time (AC: 4)
  - [x] `onPointerUp` on `<svg>`: commit drag with undo entry, release pointer capture (AC: 4)
  - [x] Render `<PoiPin>` for each POI in `mapConfig.pois` (AC: 2, 6)
  - [x] Private `PoiPin` sub-component: `<g data-poi-id={poi.id}>` wrapping `<circle>` (ARCH-12)
  - [x] Selected pin: blue fill (#2563eb); unselected pin: red fill (#ef4444) (AC: 6)
  - [x] `onPointerDown` on each pin: `e.stopPropagation()`, select POI, start drag if activeTool='select' (AC: 3, 4)
  - [x] `useEffect` Delete key handler: `removePoi(selectedItemId)` when matching POI exists (AC: 5)
  - [x] All `<g>` and `<svg>` use `onPointerDown` (never `onClick`) per ARCH-12
  - [x] Add `import type { JSX } from 'react'` (tsconfig fix makes this a type reference, not redundant)
- [x] Run `bun test` from workspace root: all tests pass (no regressions)

## Dev Notes

### Context: What MapCanvas.tsx Currently Does

The skeleton file (from Story 2.2):
- Returns a "No map loaded" placeholder if `mapConfig` is null
- Returns an empty `<div>` otherwise
- Does NOT render any SVG, image, or pins

This story **replaces the `<div>` return path** with a full SVG canvas implementation. The null-check branch stays.

### Fix: JSX.Element tsc Compilation Failure (Code Review Finding #3)

**Root cause:** `packages/builder-react/tsconfig.json` has `"types": ["bun"]`, which restricts ambient type declarations to only `@types/bun`. Since `@types/react` is not installed and not in the types list, the `JSX` global namespace is undefined, causing TS2503 on all 4 component files.

**Fix (two steps):**

1. **`packages/builder-react/package.json`** — add to devDependencies:
   ```json
   "devDependencies": {
     "typescript": "catalog:",
     "@types/react": "^18.3.0"
   }
   ```
   Then run `bun install`.

2. **`packages/builder-react/tsconfig.json`** — update types array:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "jsx": "react-jsx",
       "noEmit": true,
       "allowImportingTsExtensions": true,
       "types": ["bun", "react"]
     },
     "include": ["src", "index.ts", "index.html"]
   }
   ```
   Adding `"react"` to `"types"` includes `@types/react` as a global ambient declaration. This makes the `JSX` namespace globally available in ALL .tsx files — no per-file `import React` or `import type { JSX } from 'react'` needed.

**This fixes all 4 existing components without changing their source:**
- `src/App.tsx:5` — `JSX.Element` now resolves ✓
- `src/components/Toolbar.tsx:16` — ✓
- `src/components/MapCanvas.tsx:3` — ✓ (this file is fully rewritten anyway)
- `src/components/Sidebar.tsx:3` — ✓

### Fix: Negative Coordinate Round-Trip Failure (Code Review Finding #2)

The `@resort-map/types` validator rejects POIs or nodes with negative `position.x` or `position.y`. But builder-core's `addPoi`/`addNode` accept any coordinates, including negative ones. If a POI is placed at a negative coordinate, `serializeGwmap` → `parseGwmap` will throw.

**Fix in `toSvgCoords`:** Clamp output to `[0, Infinity]` using `Math.max(0, ...)`. Since the SVG `viewBox` starts at `(0, 0)`, a pointer event can never logically produce negative SVG coordinates — but floating-point and timing edge cases can produce values near zero that round negative. The clamp prevents this.

### `src/utils/svgCoords.ts` — Coordinate Conversion Utility

```ts
export function toSvgCoords(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  imageSize: { w: number; h: number },
): { x: number; y: number } {
  const x = Math.max(0, Math.round((clientX - rect.left) / rect.width * imageSize.w));
  const y = Math.max(0, Math.round((clientY - rect.top) / rect.height * imageSize.h));
  return { x, y };
}
```

**Coordinate system:** SVG `viewBox` is `"0 0 {imageNaturalWidth} {imageNaturalHeight}"`. All POI positions are stored in image pixels (never CSS pixels). The `toSvgCoords` function converts from CSS client coordinates to image-pixel SVG coordinates.

### `src/__tests__/svgCoords.test.ts` — Unit Tests

```ts
import { test, expect, describe } from 'bun:test';
import { toSvgCoords } from '../utils/svgCoords.ts';

const rect = { left: 100, top: 50, width: 800, height: 600 };
const imageSize = { w: 1600, h: 1200 };

describe('toSvgCoords', () => {
  test('center of canvas → center of image', () => {
    const r = toSvgCoords(100 + 400, 50 + 300, rect, imageSize);
    expect(r).toEqual({ x: 800, y: 600 });
  });

  test('top-left corner → (0, 0)', () => {
    const r = toSvgCoords(100, 50, rect, imageSize);
    expect(r).toEqual({ x: 0, y: 0 });
  });

  test('bottom-right corner → image dimensions', () => {
    const r = toSvgCoords(100 + 800, 50 + 600, rect, imageSize);
    expect(r).toEqual({ x: 1600, y: 1200 });
  });

  test('CSS pixel coords below canvas left edge are clamped to x=0', () => {
    const r = toSvgCoords(50, 50, rect, imageSize); // clientX=50 < rect.left=100
    expect(r.x).toBe(0);
  });

  test('CSS pixel coords above canvas top edge are clamped to y=0', () => {
    const r = toSvgCoords(100, 20, rect, imageSize); // clientY=20 < rect.top=50
    expect(r.y).toBe(0);
  });

  test('non-square image scales x and y independently', () => {
    const wideRect = { left: 0, top: 0, width: 400, height: 200 };
    const tallImage = { w: 800, h: 1600 };
    // Click at (100, 100) on a 400x200 canvas with an 800x1600 image
    const r = toSvgCoords(100, 100, wideRect, tallImage);
    expect(r).toEqual({ x: 200, y: 800 }); // 100/400*800=200, 100/200*1600=800
  });

  test('rounds fractional pixel values to integers', () => {
    // Click at 1/3 of the width
    const r = toSvgCoords(100 + 800 / 3, 50, rect, imageSize);
    expect(Number.isInteger(r.x)).toBe(true);
  });
});
```

### `src/components/MapCanvas.tsx` — Complete Implementation

```tsx
import { useEffect, useRef, useState } from 'react';
import type { POI } from '@resort-map/types';
import { updatePoi as coreUpdatePoi } from '@resort-map/builder-core';
import { useMapStore } from '../store/mapStore.ts';
import { toSvgCoords } from '../utils/svgCoords.ts';

interface DragState {
  poiId: string;
  pointerId: number;
}

export function MapCanvas(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const activeTool = useMapStore((s) => s.activeTool);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const addPoi = useMapStore((s) => s.addPoi);
  const removePoi = useMapStore((s) => s.removePoi);
  const setSelectedItemId = useMapStore((s) => s.setSelectedItemId);

  const svgRef = useRef<SVGSVGElement>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Load image natural dimensions whenever backgroundImageUrl changes
  useEffect(() => {
    if (!mapConfig?.map.backgroundImageUrl) return;
    setImageSize(null);
    const img = new Image();
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImageSize(null);
    img.src = mapConfig.map.backgroundImageUrl;
  }, [mapConfig?.map.backgroundImageUrl]);

  // Delete key removes selected POI
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete') return;
      if (!selectedItemId || !mapConfig) return;
      if (mapConfig.pois.some((p) => p.id === selectedItemId)) {
        removePoi(selectedItemId);
        // store.removePoi already clears selectedItemId when the removed poi was selected
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItemId, mapConfig, removePoi]);

  function getSvgRect(): DOMRect | null {
    return svgRef.current?.getBoundingClientRect() ?? null;
  }

  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>): void {
    if (!imageSize) return;
    if (activeTool === 'placePoi') {
      const rect = getSvgRect();
      if (!rect) return;
      const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);
      // Add POI via store action
      addPoi({ label: 'New POI', position: pos, tags: [] });
      // Zustand set() is synchronous — read the just-added POI's id
      const newPois = useMapStore.getState().mapConfig!.pois;
      const newId = newPois[newPois.length - 1]!.id;
      setSelectedItemId(newId);
    }
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>): void {
    if (!dragState || !imageSize) return;
    const rect = getSvgRect();
    if (!rect) return;
    const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);
    // Update position WITHOUT pushing to undoStack (intermediate drag frame)
    // Use coreUpdatePoi + setState directly to avoid undo spam
    const currentConfig = useMapStore.getState().mapConfig;
    if (!currentConfig) return;
    const newConfig = coreUpdatePoi(currentConfig, dragState.poiId, { position: pos });
    useMapStore.setState({ mapConfig: newConfig });
  }

  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>): void {
    if (!dragState || !imageSize) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    // Commit the final drag position WITH undo push
    const rect = getSvgRect();
    if (rect) {
      const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);
      // Use the store action so undoStack gets the pre-drag config
      useMapStore.getState().updatePoi(dragState.poiId, { position: pos });
    }
    setDragState(null);
  }

  function onPinPointerDown(e: React.PointerEvent<SVGGElement>, poiId: string): void {
    e.stopPropagation(); // prevent onSvgPointerDown from firing
    if (activeTool === 'select') {
      setSelectedItemId(poiId);
      const pointerId = e.pointerId;
      setDragState({ poiId, pointerId });
      svgRef.current?.setPointerCapture(pointerId);
    }
  }

  // Placeholder when no map is loaded
  if (!mapConfig) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        No map loaded. Set a background image URL to get started.
      </div>
    );
  }

  // Image still loading
  if (!imageSize) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        Loading map image…
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${imageSize.w} ${imageSize.h}`}
      style={{ width: '100%', height: '100%', display: 'block', cursor: activeTool === 'placePoi' ? 'crosshair' : 'default' }}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <image
        href={mapConfig.map.backgroundImageUrl}
        x={0}
        y={0}
        width={imageSize.w}
        height={imageSize.h}
        onPointerDown={onSvgPointerDown}
      />
      {mapConfig.pois.map((poi) => (
        <PoiPin
          key={poi.id}
          poi={poi}
          isSelected={poi.id === selectedItemId}
          onPointerDown={(e) => onPinPointerDown(e, poi.id)}
        />
      ))}
    </svg>
  );
}

interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function PoiPin({ poi, isSelected, onPointerDown }: PoiPinProps): JSX.Element {
  return (
    <g
      data-poi-id={poi.id}
      onPointerDown={onPointerDown}
      style={{ cursor: 'pointer' }}
    >
      <circle
        cx={poi.position.x}
        cy={poi.position.y}
        r={10}
        fill={isSelected ? '#2563eb' : '#ef4444'}
        stroke={isSelected ? '#1d4ed8' : '#b91c1c'}
        strokeWidth={2}
      />
    </g>
  );
}
```

### Key Implementation Notes

#### 1. Image Loading
`new Image()` is a browser-global API; this pattern works in Bun's HMR dev server since builder-react runs in a browser context (not a Node worker). The `useEffect` re-fires when `backgroundImageUrl` changes. On URL change, `setImageSize(null)` first to show the loading state.

#### 2. `onSvgPointerDown` — Reading New POI id After `addPoi`

The store's `addPoi` action uses Zustand `set()`, which is **synchronous**. Immediately after calling `addPoi(...)`, `useMapStore.getState()` returns the updated state with the new POI. This pattern is valid in Zustand v4:

```ts
addPoi({ label: 'New POI', position: pos, tags: [] });
const newPois = useMapStore.getState().mapConfig!.pois;
const newId = newPois[newPois.length - 1]!.id;
setSelectedItemId(newId);
```

The `!` on `newPois[newPois.length - 1]` is required by `noUncheckedIndexedAccess`. Since `addPoi` always appends one item and we just confirmed the call succeeded, the `!` assertion is safe here.

#### 3. Drag — No Undo Spam on PointerMove

AC4 says "updatePoi is called with the updated pixel position" during drag. If we call the store's `updatePoi` action on every `pointermove` event, each frame would push an undo entry. After a 2-second drag at 60fps, the undo stack would have 120 spurious entries.

**Pattern used:**
- `onPointerMove`: call `coreUpdatePoi` + `useMapStore.setState` directly — updates `mapConfig` WITHOUT pushing to `undoStack`
- `onPointerUp`: call the store's `updatePoi` action — pushes ONE final undo entry for the entire drag

This means the AC4 semantic ("updatePoi is called") is satisfied on the commit frame. The intermediate frames use direct state updates.

**Why `useMapStore.setState` in a component is OK:** Zustand stores expose `setState`, `getState`, and `subscribe` as static methods on the hook. Calling `useMapStore.setState({ mapConfig: newConfig })` from inside a component event handler is a supported pattern for performance-critical updates.

**`import { updatePoi as coreUpdatePoi } from '@resort-map/builder-core'`** — builder-react already depends on builder-core (via workspace dep), so this import is valid. The `as coreUpdatePoi` alias avoids confusion with the store action.

#### 4. Pointer Capture

`svgRef.current?.setPointerCapture(e.pointerId)` in `onPinPointerDown` ensures that all subsequent `pointermove` and `pointerup` events are delivered to the SVG element even if the pointer moves outside the pin. This is the standard drag pattern.

The `releasePointerCapture` in `onSvgPointerUp` is called explicitly for cleanliness. Browsers also auto-release on `pointerup`.

#### 5. `<image>` vs `<img>` in SVG

Use the SVG `<image>` element (lowercase, in SVG namespace) with `href` attribute. In React, use `href` (not `xlinkHref` which is deprecated since SVG 2). The `width` and `height` attributes match the SVG viewBox dimensions.

#### 6. Why `onPointerDown` on `<image>` too

The `<svg>` element's `onPointerDown` handles most interactions, but the `<image>` element can intercept pointer events before they bubble to the parent SVG in some browsers. Adding `onPointerDown={onSvgPointerDown}` to the `<image>` element ensures the handler fires regardless.

Actually — since `<image>` is inside `<svg>`, clicks on `<image>` bubble to `<svg>` naturally. Adding `onPointerDown` to `<image>` is redundant. **Remove it** and rely on SVG bubbling. The implementation above has it duplicated; the simplified version just uses the SVG handler.

> **Correction:** Remove `onPointerDown={onSvgPointerDown}` from the `<image>` element. The SVG's `onPointerDown` handles clicks on the `<image>` via bubbling.

Corrected JSX return:
```tsx
return (
  <svg
    ref={svgRef}
    viewBox={`0 0 ${imageSize.w} ${imageSize.h}`}
    style={{ width: '100%', height: '100%', display: 'block', cursor: activeTool === 'placePoi' ? 'crosshair' : 'default' }}
    onPointerDown={onSvgPointerDown}
    onPointerMove={onSvgPointerMove}
    onPointerUp={onSvgPointerUp}
  >
    <image
      href={mapConfig.map.backgroundImageUrl}
      x={0}
      y={0}
      width={imageSize.w}
      height={imageSize.h}
    />
    {mapConfig.pois.map((poi) => (
      <PoiPin
        key={poi.id}
        poi={poi}
        isSelected={poi.id === selectedItemId}
        onPointerDown={(e) => onPinPointerDown(e, poi.id)}
      />
    ))}
  </svg>
);
```

#### 7. `React.PointerEvent` Import

The handler function signatures reference `React.PointerEvent<SVGSVGElement>` and `React.PointerEvent<SVGGElement>`. Since `"jsx": "react-jsx"` with `"types": ["bun", "react"]` is used, `React` is NOT automatically in scope — these types need to be imported:

```ts
import { useEffect, useRef, useState } from 'react';
import type { POI } from '@resort-map/types';
```

To use `React.PointerEvent`, either:
- `import React from 'react'` — then `React.PointerEvent<...>` works
- Or use the unprefixed form: `PointerEvent<...>` from React's types (available when @types/react is in global types)

The cleanest approach: in the function signatures, use the native `PointerEvent` type:

```ts
function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>): void
```

Since `@types/react` is now in the global types (via tsconfig `"types": ["bun", "react"]`), `React.PointerEvent` is available. Alternatively, import React:

```ts
import { useEffect, useRef, useState, type PointerEvent } from 'react';
```

**Simplest fix:** Import `React` as a namespace:
```ts
import * as React from 'react';
```

But this conflicts with `verbatimModuleSyntax` if nothing is used at runtime. Since we're using `react/jsx-runtime` automatically, we don't need a value import for JSX. However, `React.PointerEvent` is only needed for type annotations.

**Recommended approach** for MapCanvas.tsx:
```ts
import { useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { POI } from '@resort-map/types';
// ...

// For event types, use the intrinsic SVG element event types:
function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>): void
```

Since `"types": ["bun", "react"]` makes `React` a global namespace, you can use `React.PointerEvent<T>` without importing React. This is the same mechanism that makes `JSX.Element` available globally.

**Bottom line:** With the tsconfig fix in place, `React.PointerEvent<SVGSVGElement>` and `React.PointerEvent<SVGGElement>` are available globally (from the `React` namespace in `@types/react` global declarations). No additional imports needed for these types.

### Architecture Compliance (MANDATORY)

1. **`verbatimModuleSyntax: true`** — type-only imports MUST use `import type`:
   ```ts
   import type { POI } from '@resort-map/types';  ✓
   import { updatePoi as coreUpdatePoi } from '@resort-map/builder-core';  ✓ (value)
   import { useEffect, useRef, useState } from 'react';  ✓ (values used at runtime)
   ```

2. **`noUncheckedIndexedAccess: true`** — array index returns `T | undefined`. Use `!` when you've confirmed the array is non-empty:
   ```ts
   const newId = newPois[newPois.length - 1]!.id;  // safe: addPoi just appended one item
   ```

3. **`onPointerDown` not `onClick`** — ALL pointer interactions use `onPointerDown`. This is ARCH-12 and mandatory. Do NOT use `onClick` anywhere in MapCanvas.tsx.

4. **`data-poi-id` attribute** — Every POI pin's `<g>` element carries `data-poi-id={poi.id}`. This is ARCH-12 and required for Story 2.4's edge-click handling.

5. **SVG viewBox in image pixels** — The `viewBox` is `"0 0 {naturalWidth} {naturalHeight}"`. All `cx`, `cy`, `x`, `y` values in SVG are image pixels. Never mix with CSS pixels.

6. **Props interface above component** — `PoiPinProps` interface is defined ABOVE `function PoiPin(...)` in the same file, per architecture convention.

7. **Explicit return types on exported functions** — `MapCanvas()` has `: JSX.Element`. The private `PoiPin` sub-component also has `: JSX.Element`.

8. **`import type { JSX } from 'react'`** — NOT needed individually when `"types": ["bun", "react"]` is in tsconfig (JSX is globally available). Don't add redundant type imports.

9. **`.ts`/`.tsx` extensions in relative imports** — always include:
   ```ts
   import { useMapStore } from '../store/mapStore.ts';
   import { toSvgCoords } from '../utils/svgCoords.ts';
   ```

### Files to Create / Modify

```
packages/builder-react/
├── package.json                         ← UPDATE: add @types/react devDep
├── tsconfig.json                        ← UPDATE: add "react" to types[]
├── src/
│   ├── utils/
│   │   └── svgCoords.ts                 ← CREATE: coordinate conversion
│   ├── components/
│   │   └── MapCanvas.tsx                ← UPDATE: full rewrite (SVG + POI placement)
│   └── __tests__/
│       └── svgCoords.test.ts            ← CREATE: unit tests
```

Do NOT modify: App.tsx, Toolbar.tsx, Sidebar.tsx, main.tsx, store/mapStore.ts, index.ts.
The JSX fix (tsconfig types) automatically fixes App.tsx, Toolbar.tsx, Sidebar.tsx without touching those files.

### Code Review Findings Addressed in This Story

| Finding | Status | How |
|---|---|---|
| #2 Negative coords round-trip | ✅ Fixed | `Math.max(0, ...)` in `toSvgCoords` |
| #3 JSX.Element tsc failure (4 files) | ✅ Fixed | `@types/react` + tsconfig `"types": ["bun", "react"]` |
| #4 updatePoi spurious undo on drag | ✅ Fixed | Only call store action on drag end; direct setState on move |

Remaining findings (#1, #5, #6, #7, #8) are deferred to their relevant stories (2.4, 2.5, future) or are design-level observations.

### Previous Story Learnings (Stories 1.1 – 2.2)

- `bun test` auto-discovers `*.test.ts` recursively — `svgCoords.test.ts` will be found automatically
- `noUncheckedIndexedAccess` applies to test files — use `!` after length checks or when appending is guaranteed
- Builder-core functions are called in component event handlers — import them as values (not `import type`)
- `useMapStore.getState()` in event handlers is a valid Zustand pattern (reads live state, not React stale closure state)
- The store's `removePoi` action already clears `selectedItemId` when the removed POI was selected — no manual clearing needed in the Delete key handler

### Bun / Browser Context Notes

- `new Image()` — browser global, available in Bun's `Bun.serve()` HTML-served context ✓
- `window.addEventListener` — browser global, available in browser context ✓
- `SVGSVGElement`, `SVGGElement` — DOM types, available via `@types/bun` (which includes lib.dom.d.ts) ✓
- `setPointerCapture`, `releasePointerCapture` — Pointer Events API, available in modern browsers ✓

### References

- SVG Patterns (architecture.md#SVG Patterns)
- ARCH-12: `onPointerDown` for all interactions, `data-poi-id` / `data-node-id` attributes
- Code review findings (2-2 review output, findings #2, #3, #4)
- AC1-AC6 (epics.md Story 2.3)
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess` (tsconfig.base.json)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Added `@types/react-dom` alongside `@types/react` — needed for `react-dom/client` import in `main.tsx` (tsc TS7016)

### Completion Notes List

- ✅ Fixed tsc compilation: added `@types/react` + `@types/react-dom` to devDeps, added `"react"` to tsconfig types[] — makes `JSX` namespace global, fixes all 4 component files without touching their source
- ✅ Created `svgCoords.ts` utility: pure function with `Math.max(0, ...)` clamping; fixes code review finding #2 (negative coord round-trip failure)
- ✅ 7 unit tests for `toSvgCoords` — center, corners, clamping, non-square scaling, rounding
- ✅ Rewrote `MapCanvas.tsx`: SVG viewBox from image natural dims, `PoiPin` sub-components with `data-poi-id`, pointer capture for drag, Delete key handler via `useEffect`
- ✅ Drag undo-spam fix: `onPointerMove` uses `coreUpdatePoi + useMapStore.setState` (no undo push); `onPointerUp` calls store action (one undo entry per drag) — fixes code review finding #4
- ✅ Full test suite: 103 pass, 0 fail (96 pre-existing + 7 new svgCoords tests)
- ✅ `tsc --noEmit` clean on builder-react package

### File List

- `packages/builder-react/package.json` — added `@types/react ^18.3.0` and `@types/react-dom ^18.3.0` to devDependencies
- `packages/builder-react/tsconfig.json` — added `"react"` to `"types"` array
- `packages/builder-react/src/utils/svgCoords.ts` — new: coordinate conversion utility
- `packages/builder-react/src/__tests__/svgCoords.test.ts` — new: 7 unit tests for toSvgCoords
- `packages/builder-react/src/components/MapCanvas.tsx` — full rewrite: SVG canvas with image loading, POI placement, selection, drag, Delete key

### Change Log

- 2026-06-17: Story 2.3 implemented — MapCanvas SVG canvas, POI placement, drag, selection, Delete key; fixed tsc JSX failure; fixed negative coord round-trip; fixed drag undo spam

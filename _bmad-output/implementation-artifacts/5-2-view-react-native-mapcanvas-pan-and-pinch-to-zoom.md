---
baseline_commit: 4b921bfddecbd50c96e4127573b7bedfa3dc966b
---

# Story 5.2: view-react-native — MapCanvas: Pan & Pinch-to-Zoom

Status: review

## Story

**As a** mobile map viewer user,
**I want** to pan by dragging one finger and zoom by pinching,
**So that** I can explore the full map on a phone screen with natural mobile gestures.

## Acceptance Criteria

1. **Given** the map is loaded **When** MapCanvas renders **Then** a single `Animated.View` (Reanimated v2) wraps both the `<Image>` background and `<Svg>` overlay as siblings (ADR-003 / ARCH-3 RN pattern)

2. **Given** I drag one finger across the screen **When** the pan gesture fires **Then** the `Animated.View` translates using `useAnimatedStyle` + `useSharedValue` for `translateX`/`translateY`

3. **Given** I pinch with two fingers **When** the pinch gesture fires **Then** the `Animated.View` scales using `useAnimatedStyle` + `useSharedValue` for `scale` **And** zoom is bounded to 0.5× – 5×

4. **Given** the `<Image>` loads **When** `onLoad` fires **Then** `IMAGE_LOADED` is dispatched with the image dimensions **And** the `<Svg>` overlay's `viewBox` is set to `"0 0 {width} {height}"`

5. **Given** the canvas **When** inspected **Then** all gesture handling is done via `react-native-gesture-handler` primitives (`Gesture`, `GestureDetector`) **And** all animation uses Reanimated v2 (`useSharedValue`, `useAnimatedStyle`) — **NEVER** `Animated` from core `react-native` (ARCH-13)

## Tasks / Subtasks

- [x] Write RED tests — create `packages/view-react-native/src/__tests__/MapCanvas.test.tsx` (AC: 1, 4)
  - [x] Mock `react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg` before dynamic import
  - [x] Test: MapCanvas renders `data-testid="map-canvas"` wrapper
  - [x] Test: `data-testid="map-image"` renders with correct `src` URI from mapConfig
  - [x] Test: `data-testid="map-overlay"` (Svg) has no viewBox when `imageSize` is null
  - [x] Test: `data-testid="map-overlay"` has `viewBox="0 0 1024 768"` when imageSize is `{ width: 1024, height: 768 }`
  - [x] Test: `IMAGE_LOADED` dispatched with image dimensions when `onLoad` fires on the image

- [x] Write RED tests — update `packages/view-react-native/src/__tests__/MapViewer.test.tsx` (AC: 1)
  - [x] Add mocks for `react-native-reanimated` and `react-native-svg` (needed because MapViewer now renders MapCanvas)
  - [x] Add test: `data-testid="map-canvas"` appears in ready state

- [x] Create `packages/view-react-native/src/hooks/useGestures.ts` (AC: 2, 3, 5)
  - [x] `useSharedValue` for `translateX`, `translateY`, `scale`, `savedX`, `savedY`, `savedScale`
  - [x] `Gesture.Pan()` with `.onUpdate(e => translate)` and `.onEnd(() => save)`
  - [x] `Gesture.Pinch()` with `.onUpdate(e => clamp scale 0.5–5)` and `.onEnd(() => save)`
  - [x] `Gesture.Simultaneous(panGesture, pinchGesture)` → `composedGesture`
  - [x] `useAnimatedStyle` returning transform array
  - [x] Return `{ composedGesture, animatedStyle }`

- [x] Create `packages/view-react-native/src/components/MapCanvas.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Import `Animated`, `useSharedValue`, `useAnimatedStyle` from `react-native-reanimated`
  - [x] Import `GestureDetector` from `react-native-gesture-handler`
  - [x] Import `Image` from `react-native`
  - [x] Import `Svg` from `react-native-svg`
  - [x] Call `useGestures()` from `../hooks/useGestures`
  - [x] Render `<GestureDetector gesture={composedGesture}><Animated.View testID="map-canvas" style={[{ flex: 1 }, animatedStyle]}>`
  - [x] Render `<Image testID="map-image" source={{ uri: mapConfig.map.backgroundImageUrl }} onLoad={handleImageLoad} />`
  - [x] Render `<Svg testID="map-overlay" viewBox={imageSize ? "0 0 W H" : undefined} style={{ position: 'absolute', ... }}>`
  - [x] `handleImageLoad(e)` dispatches `IMAGE_LOADED` with `e.nativeEvent.source.{width, height}`

- [x] Update `packages/view-react-native/src/MapViewer.tsx` (AC: 1)
  - [x] Import `MapCanvas` from `./components/MapCanvas`
  - [x] In ready state, render `<MapCanvas mapConfig={state.mapConfig} imageSize={state.imageSize} dispatch={dispatch} />` inside the GestureHandlerRootView
  - [x] Keep error state rendering unchanged

- [x] Verify GREEN: all 198 tests pass (192 existing + 6 new)

- [x] Run `bun test packages/view-react-native` — all 13 tests pass (7 existing + 6 new)

- [x] Run `bun test` from workspace root — confirm no regressions (AC: all)

## Dev Notes

### Critical Learning from Story 5.1: `mock.module` Is NOT Hoisted in Bun

**Bun does NOT hoist `mock.module` calls** (unlike Jest's `jest.mock` hoisting). In bun, ES module static imports are resolved BEFORE any runtime code runs. This means:

```ts
// THIS DOES NOT WORK — static import runs before mock.module
import { MapCanvas } from '../components/MapCanvas';  // loads real react-native-reanimated → CRASH
mock.module('react-native-reanimated', () => ({...})); // too late!
```

**The required pattern** — use `await import()` AFTER `mock.module` calls:

```ts
import { mock } from 'bun:test';
import React from 'react';   // react doesn't import RN, safe as static
import { render, ... } from '@testing-library/react';  // safe as static

// Register mocks FIRST
mock.module('react-native', () => ({...}));
mock.module('react-native-reanimated', () => ({...}));
mock.module('react-native-gesture-handler', () => ({...}));
mock.module('react-native-svg', () => ({...}));

// Dynamic import AFTER mocks — MapCanvas (and useGestures) get the mocked modules
const { MapCanvas } = await import('../components/MapCanvas');
```

Top-level `await import()` is supported in bun test files.

### Architecture Constraint: `useGestures.ts` Separation

The architecture specifies `src/hooks/useGestures.ts` as a separate file. Put the Reanimated shared values and gesture setup in this hook, called from `MapCanvas.tsx`. The constraint "Pan/zoom shared values defined once in parent MapViewer" means: child components (PoiPin, RoutePath) MUST NOT create their own `useSharedValue` calls — they receive animated values from their parent context (MapCanvas) if needed.

### Library Imports

**From `react-native-reanimated`:**
- `import Animated from 'react-native-reanimated'` — default export contains `Animated.View`
- `import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated'` — named exports

**From `react-native-gesture-handler`:**
- `import { GestureDetector, Gesture } from 'react-native-gesture-handler'`
- Modern API: `Gesture.Pan()`, `Gesture.Pinch()`, `Gesture.Simultaneous()`

**From `react-native-svg`:**
- `import { Svg } from 'react-native-svg'` — SVG root element

**From `react-native`:**
- `import { Image } from 'react-native'` — for the map background image

### `useGestures.ts` Implementation

```ts
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

export function useGestures() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { composedGesture, animatedStyle };
}
```

**No `'worklet'` directive needed** — Reanimated v3 automatically detects worklet context for gesture callbacks. Do NOT add `'worklet'` manually as it may cause TypeScript or transpiler issues in the test environment.

**Gesture API chain** — `Gesture.Pan()` returns a fluent builder. `.onUpdate()`, `.onEnd()` each return `this` (the gesture) for chaining.

### `MapCanvas.tsx` Implementation

```tsx
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction } from '@resort-map/types';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'react-native';
import { Svg } from 'react-native-svg';
import { useGestures } from '../hooks/useGestures';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
}

export function MapCanvas({ mapConfig, imageSize, dispatch }: MapCanvasProps) {
  const { composedGesture, animatedStyle } = useGestures();

  const handleImageLoad = (e: { nativeEvent: { source: { width: number; height: number } } }) => {
    dispatch({
      type: 'IMAGE_LOADED',
      payload: { width: e.nativeEvent.source.width, height: e.nativeEvent.source.height },
    });
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View testID="map-canvas" style={[{ flex: 1 }, animatedStyle]}>
        <Image
          testID="map-image"
          source={{ uri: mapConfig.map.backgroundImageUrl }}
          style={{ flex: 1 }}
          resizeMode="contain"
          onLoad={handleImageLoad}
        />
        <Svg
          testID="map-overlay"
          viewBox={imageSize ? `0 0 ${imageSize.width} ${imageSize.height}` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize?.width ?? 0,
            height: imageSize?.height ?? 0,
          }}
        >
          {/* POI pins added in Story 5.3, route path in Story 5.4 */}
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}
```

**`handleImageLoad` type:** `react-native`'s `Image.onLoad` passes `{ nativeEvent: { source: { width, height, url } } }`. The type annotation above is a subset that satisfies TypeScript without requiring `@types/react-native`.

**`style={[{ flex: 1 }, animatedStyle]}`** — Reanimated's `Animated.View` accepts style arrays where one element is the animated style. Since `animatedStyle` is typed as `Animated.AnimateStyle<ViewStyle>`, TypeScript might warn about the array format. Use `as any` on the style prop if TypeScript strict mode complains: `style={[{ flex: 1 }, animatedStyle] as any}`.

### `MapViewer.tsx` Update

Add `MapCanvas` import and render it in the ready state:

```tsx
import type { MapConfig, ViewerStatus } from '@resort-map/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import { useMapViewer } from './hooks/useMapViewer';
import { MapCanvas } from './components/MapCanvas';  // NEW

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  return (
    <GestureHandlerRootView testID="map-viewer" style={{ flex: 1 }}>
      {state.status === 'error' && (
        <Text testID="error-message">{state.error}</Text>
      )}
      {state.status === 'ready' && state.mapConfig && (
        <MapCanvas
          mapConfig={state.mapConfig}
          imageSize={state.imageSize}
          dispatch={dispatch}
        />
      )}
    </GestureHandlerRootView>
  );
}
```

**Note:** `GestureHandlerRootView` stays in `MapViewer` (ARCH-13). `GestureDetector` lives inside `MapCanvas`. This is correct — `GestureHandlerRootView` must be an ancestor of `GestureDetector`, not a sibling.

### Mock Factories for Tests

**`MapCanvas.test.tsx` — complete mock set:**

```tsx
import { test, expect, describe, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

mock.module('react-native', () => ({
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  View: ({ children, testID, style }: { children?: React.ReactNode; testID?: string; style?: unknown }) =>
    React.createElement('div', { 'data-testid': testID, style }, children),
  Image: ({ testID, onLoad, source, style, resizeMode }: {
    testID?: string;
    onLoad?: (e: { nativeEvent: { source: { width: number; height: number } } }) => void;
    source?: { uri?: string };
    style?: unknown;
    resizeMode?: string;
  }) => React.createElement('img', {
    'data-testid': testID,
    src: source?.uri,
    // Wraps DOM load event → calls RN onLoad signature with fixed dimensions
    onLoad: () => onLoad?.({ nativeEvent: { source: { width: 1024, height: 768 } } }),
  }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

mock.module('react-native-reanimated', () => ({
  default: {
    View: ({ children, testID, style }: { children?: React.ReactNode; testID?: string; style?: unknown }) =>
      React.createElement('div', { 'data-testid': testID, style }, children),
  },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (factory: () => unknown) => factory(),
}));

mock.module('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, testID, style }: { children?: React.ReactNode; testID?: string; style?: unknown }) =>
    React.createElement('div', { 'data-testid': testID ?? 'ghroot', style }, children),
  GestureDetector: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  Gesture: {
    Pan: () => ({
      onUpdate: function(this: unknown) { return this; },
      onEnd: function(this: unknown) { return this; },
      onStart: function(this: unknown) { return this; },
      enabled: function(this: unknown) { return this; },
    }),
    Pinch: () => ({
      onUpdate: function(this: unknown) { return this; },
      onEnd: function(this: unknown) { return this; },
      onStart: function(this: unknown) { return this; },
    }),
    Simultaneous: (...gestures: unknown[]) => ({ type: 'simultaneous', gestures }),
  },
}));

mock.module('react-native-svg', () => ({
  Svg: ({ children, testID, viewBox, style }: { children?: React.ReactNode; testID?: string; viewBox?: string; style?: unknown }) =>
    React.createElement('svg', { 'data-testid': testID, viewBox, style }, children),
}));

// Dynamic import AFTER all mocks
const { MapCanvas } = await import('../components/MapCanvas');
const config = complexMap as unknown as MapConfig;

let dispatchCalls: ViewerAction[];
let mockDispatch: (action: ViewerAction) => void;

afterEach(cleanup);

// beforeEach to reset dispatch between tests — use describe block
```

**Why `function(this: unknown) { return this; }` in gesture mock?** Arrow functions don't have their own `this`, so `return this` in an arrow function returns `undefined`. Use regular function syntax for the fluent builder chain to work correctly.

**`useAnimatedStyle` mock calls factory eagerly** — the factory reads `.value` from `useSharedValue` mocks which return `{ value: initialValue }`. So `translateX.value` = 0, `scale.value` = 1. This produces `{ transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] }` — a valid style object the mock `Animated.View` accepts.

### `MapViewer.test.tsx` — Updated Mocks

The existing `MapViewer.test.tsx` currently only mocks `react-native` and `react-native-gesture-handler`. After this story, `MapViewer.tsx` renders `MapCanvas`, which imports `react-native-reanimated` and `react-native-svg`. These NEW mocks must be added to `MapViewer.test.tsx`:

```ts
// ADD THESE before the existing mock.module calls
mock.module('react-native-reanimated', () => ({
  default: {
    View: ({ children, testID, style }) =>
      React.createElement('div', { 'data-testid': testID, style }, children),
  },
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (factory) => factory(),
}));

mock.module('react-native-svg', () => ({
  Svg: ({ children, testID, viewBox, style }) =>
    React.createElement('svg', { 'data-testid': testID, viewBox, style }, children),
}));
```

The existing `mock.module('react-native-gesture-handler', ...)` must also gain `GestureDetector` and `Gesture` exports (needed by MapCanvas). Update it:

```ts
mock.module('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, testID, style }) =>
    React.createElement('div', { 'data-testid': testID ?? 'ghroot', style }, children),
  GestureDetector: ({ children }) => React.createElement('div', null, children),  // ADD
  Gesture: {                                                                        // ADD
    Pan: () => ({ onUpdate: function(this) { return this; }, onEnd: function(this) { return this; } }),
    Pinch: () => ({ onUpdate: function(this) { return this; }, onEnd: function(this) { return this; } }),
    Simultaneous: (...g) => ({ type: 'simultaneous', gestures: g }),
  },
}));
```

The `react-native` mock must also gain `Image` (needed by MapCanvas):
```ts
mock.module('react-native', () => ({
  Text: ...,              // existing
  View: ...,              // existing
  Image: ({ testID, onLoad, source }) =>  // ADD
    React.createElement('img', { 'data-testid': testID, src: source?.uri,
      onLoad: () => onLoad?.({ nativeEvent: { source: { width: 1024, height: 768 } } }) }),
  StyleSheet: { create: s => s },
}));
```

**New `MapViewer` test to add** (total: 5 MapViewer tests after this story):
```ts
test('renders MapCanvas in ready state', async () => {
  render(<MapViewer source={config} />);
  await waitFor(() => {
    expect(screen.getByTestId('map-canvas')).toBeDefined();
  });
});
```

### `IMAGE_LOADED` Dispatch Test via `fireEvent`

When `fireEvent.load(imgElement)` is called, the DOM dispatches a `load` event on the `<img>`. React's synthetic event system calls our `onLoad` handler, which is:
```ts
() => onLoad?.({ nativeEvent: { source: { width: 1024, height: 768 } } })
```

This calls `handleImageLoad` in `MapCanvas.tsx` with `{ nativeEvent: { source: { width: 1024, height: 768 } } }`.

```ts
test('IMAGE_LOADED dispatched with dimensions when image loads', async () => {
  const dispatchCalls: ViewerAction[] = [];
  const mockDispatch = (a: ViewerAction) => { dispatchCalls.push(a); };

  render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);

  const img = screen.getByTestId('map-image');
  fireEvent.load(img);

  expect(dispatchCalls).toContainEqual({
    type: 'IMAGE_LOADED',
    payload: { width: 1024, height: 768 },
  });
});
```

### AC4: `onLoad` vs `onLoadEnd`

The epic AC says "when `onLoadEnd` fires" but the correct React Native `Image` API for getting dimensions is `onLoad` (not `onLoadEnd`). The `onLoad` callback receives `{ nativeEvent: { source: { width, height, url } } }`. `onLoadEnd` fires on completion but provides no dimensions. **Use `onLoad`** in the implementation — this satisfies the intent of AC4.

### TypeScript Notes

- `verbatimModuleSyntax: true` → all type-only imports use `import type`
- `Animated.View` style type: if strict TypeScript complains about `style={[{ flex: 1 }, animatedStyle]}`, use `style={[{ flex: 1 }, animatedStyle] as any}`
- `Image`'s `onLoad` type: `(e: { nativeEvent: { source: { width: number; height: number } } }) => void` — this is a simplified subset of the full RN type, sufficient without `@types/react-native`
- No `import React` in source files — bun handles JSX automatically
- Bare imports (no `.ts`/`.tsx` extension) — enforced by linter

### What `viewerReducer` Does with `IMAGE_LOADED`

From `view-core/src/viewerState.ts`:
```ts
case 'IMAGE_LOADED':
  return { ...state, imageSize: action.payload };
```

`state.imageSize` becomes `{ width: number; height: number }`. `MapViewer.tsx` passes `state.imageSize` to `MapCanvas`. The `<Svg>` sets `viewBox` from this value.

### Files to Create / Modify

```
packages/view-react-native/
  src/
    MapViewer.tsx                           ← UPDATE: import MapCanvas, render in ready state
    components/
      MapCanvas.tsx                         ← CREATE: GestureDetector + Animated.View + Image + Svg
    hooks/
      useGestures.ts                        ← CREATE: pan + pinch gestures, shared values
    __tests__/
      MapCanvas.test.tsx                    ← CREATE: 5 new tests
      MapViewer.test.tsx                    ← UPDATE: add reanimated+svg mocks, add 1 test
```

### Expected Test Count

Current total: 192 tests across 20 files
New tests in this story:
- `MapCanvas.test.tsx` (new file — 21st): 5 tests
- `MapViewer.test.tsx` (updated): +1 test (5 total in that file)
Total new: **6 tests**

Expected total: **198 tests across 21 files**

### Previous Story Learnings (Story 5.1)

- **`mock.module` NOT hoisted** — ALWAYS use `await import()` for modules that depend on mocked RN packages. Static imports cannot be used after `mock.module` for RN-dependent code.
- **`react-native` not installed at test time** — `mock.module('react-native', factory)` works even when the package is not in node_modules (bun intercepts before filesystem lookup). Same applies to `react-native-reanimated`, `react-native-gesture-handler`, `react-native-svg`.
- **`@testing-library/react` and `react-dom` must be in devDependencies** — not automatically hoisted from view-react. Already added in Story 5.1.
- **`@resort-map/types` must be in dependencies** — for fixture import path `@resort-map/types/fixtures/...`. Already added in Story 5.1.
- **Linter removes `.tsx`/`.ts` from import paths** — write bare imports from the start.
- **`afterEach(cleanup)` required for render tests** — `@testing-library/react` v16 does not auto-cleanup with `bun:test`.
- **No `import React` in source files** — bun handles JSX. Only test files need `import React from 'react'` for `React.createElement` in mock factories.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `Animated.View` mock must NOT forward `style` prop to DOM `<div>` — RN transform arrays (`[{ translateX: 0 }, ...]`) are not valid CSS and React DOM throws "Attempted to assign to readonly property" when it tries to apply them. Fix: omit `style` in the mock `Animated.View`.

### Completion Notes List

- Created `src/components/MapCanvas.tsx` with `GestureDetector > Animated.View > Image + Svg` structure (AC1, AC5)
- Created `src/hooks/useGestures.ts` with Pan + Pinch gestures via `Gesture.Simultaneous`, scale bounded 0.5×–5×, `useAnimatedStyle` returning transform array (AC2, AC3)
- Updated `src/MapViewer.tsx` to render `<MapCanvas>` in ready state, passing `mapConfig`, `imageSize`, `dispatch` (AC1)
- Created `MapCanvas.test.tsx` with 5 tests: wrapper render, image src, viewBox null, viewBox set, IMAGE_LOADED dispatch (AC4)
- Updated `MapViewer.test.tsx`: added reanimated + svg mocks, extended gesture-handler mock with `GestureDetector`/`Gesture`, added Image to react-native mock, added 1 new test for map-canvas in ready state
- Total: 198 tests across 21 files, 0 failures

### File List

- `packages/view-react-native/src/components/MapCanvas.tsx` — CREATED
- `packages/view-react-native/src/hooks/useGestures.ts` — CREATED
- `packages/view-react-native/src/MapViewer.tsx` — UPDATED
- `packages/view-react-native/src/__tests__/MapCanvas.test.tsx` — CREATED
- `packages/view-react-native/src/__tests__/MapViewer.test.tsx` — UPDATED

### Change Log

- 2026-06-18: Implemented story 5.2 — MapCanvas pan/zoom with Reanimated v2 + gesture handler; 6 new tests; 198 total

---
baseline_commit: 7aea8126f6f585f79a3c5dbffc90a0af846e1d35
---

# Story 5.1: view-react-native — MapViewer Shell & Source Parsing

Status: review

## Story

**As an** Expo developer,
**I want** to mount `<MapViewer source={...} />` in my Expo app and have it parse a `.gwmap` string or accept a pre-parsed config,
**So that** the RN viewer self-manages its state using the same `viewerReducer` as the web viewer.

## Acceptance Criteria

1. **Given** `<MapViewer source={rawGwmapJsonString} />` **When** the component mounts **Then** it calls `parseGwmap(source)` from view-core, dispatches `MAP_LOADED`, and `state.status` becomes `"ready"`

2. **Given** `<MapViewer source={alreadyParsedMapConfig} />` **When** the component mounts **Then** it dispatches `MAP_LOADED` directly

3. **Given** `source` is invalid **When** the component mounts **Then** `SET_ERROR` is dispatched and a `<Text>` error message is rendered

4. **Given** the component tree **When** `<MapViewer>` renders **Then** `GestureHandlerRootView` wraps the entire component tree (ARCH-13)

5. **Given** view-react-native source files **When** I grep for `import.*view-core` **Then** only wrapper imports (`viewerReducer`, `parseGwmap`, `computeRoute`, `filterPois`) are present — no routing or filtering logic is duplicated

6. **Given** view-react-native `package.json` **When** I inspect it **Then** `react-native-svg`, `react-native-gesture-handler`, and `react-native-reanimated` are listed as peer dependencies with no `"main"` / `"bun build"` step (ships TS source for Metro)

## Tasks / Subtasks

- [x] Write RED tests — create `packages/view-react-native/src/__tests__/useMapViewer.test.ts` (AC: 1, 2, 3)
  - [x] Test: MapConfig source → `state.status === 'ready'`, `state.mapConfig` set
  - [x] Test: valid JSON string source → `state.status === 'ready'`
  - [x] Test: invalid JSON string → `state.status === 'error'`, `state.error` defined

- [x] Write RED tests — create `packages/view-react-native/src/__tests__/MapViewer.test.tsx` (AC: 1, 2, 3, 4)
  - [x] Mock `react-native` and `react-native-gesture-handler` modules before importing MapViewer
  - [x] Test: MapConfig source → `data-testid="map-viewer"` renders, no error element present
  - [x] Test: valid JSON string → `data-testid="map-viewer"` renders
  - [x] Test: invalid source → `data-testid="error-message"` renders with error text content
  - [x] Test: error state → `data-testid="map-viewer"` (GestureHandlerRootView) still present (ARCH-13 wraps all states)

- [x] Create `packages/view-react-native/src/hooks/useMapViewer.ts` (AC: 1, 2, 3)
  - [x] `useReducer(viewerReducer, initialViewerState)` from `@resort-map/view-core`
  - [x] `useEffect` — if `string`, call `parseGwmap(source)` + `dispatch MAP_LOADED`; if object, `dispatch MAP_LOADED` directly
  - [x] Catch parse errors → `dispatch SET_ERROR` with message
  - [x] Return `{ state, dispatch }`

- [x] Create `packages/view-react-native/src/MapViewer.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Import `GestureHandlerRootView` from `react-native-gesture-handler`
  - [x] Import `Text` from `react-native`
  - [x] Use `useMapViewer` hook from `./hooks/useMapViewer`
  - [x] Render `<GestureHandlerRootView testID="map-viewer" style={{ flex: 1 }}>` as root
  - [x] Conditionally render `<Text testID="error-message">` when `state.status === 'error'`
  - [x] No MapCanvas yet (placeholder — added in Story 5.2)

- [x] Update `packages/view-react-native/src/index.ts` (AC: 5)
  - [x] Export `MapViewer` and `MapViewerProps` from `./MapViewer`

- [x] Verify AC6: `package.json` peer deps already correct (no changes needed — confirmed in analysis)

- [x] Verify GREEN: all 192 tests pass (185 existing + 7 new)

- [x] Run `bun test packages/view-react-native` (scoped) — all 7 new tests pass (AC: all)

- [x] Run `bun test` from workspace root — confirm no regressions across all 192 tests (AC: all)

## Dev Notes

### Package Already Initialized

The `packages/view-react-native/` package is already scaffolded with:
- `package.json` — correct name, exports, peer deps (react-native-svg, gesture-handler, reanimated)
- `tsconfig.json` — `"jsx": "react-native"`, `"extends": "../../tsconfig.base.json"`
- `src/index.ts` — stub `export {};` (to be replaced)

**No package.json changes needed for AC6** — peer deps are already listed correctly.

### `react-native` and `react-native-gesture-handler` Are NOT Installed

`react-native` and `react-native-gesture-handler` are `peerDependencies` in view-react-native/package.json. They are NOT in `node_modules` — they would be provided by a host Expo application at runtime. This matters for testing:

- **`bun mock.module('react-native', factory)` works even when the module is not installed** — bun intercepts the module resolution before attempting the filesystem lookup. The factory replaces the real module entirely.
- The tests mock both `react-native` and `react-native-gesture-handler` so that `MapViewer.tsx` can be tested without installing native deps.

### Test Environment: `@testing-library/react` with DOM Mocking

view-react-native tests use `@testing-library/react` (NOT `@testing-library/react-native`) and mock all React Native primitives as HTML elements. This works because:

1. The root `bunfig.toml` preloads `./packages/view-react/src/__tests__/setup.ts` which installs happy-dom globals — this applies to ALL `bun test` invocations from the workspace root, including view-react-native tests.
2. React Native primitives (`Text`, `View`, `GestureHandlerRootView`) are mocked as `<span>` / `<div>` elements.
3. `useMapViewer` is a pure React hook (`useReducer` + `useEffect`) — no RN APIs — so it can be tested with `@testing-library/react`'s `renderHook` directly.

**`@testing-library/react` is available via workspace hoisting** (it's in view-react's devDependencies and bun hoists it to the root `node_modules`). No package.json changes are needed.

### `mock.module` Hoisting Pattern

In bun:test, `mock.module()` calls at the top level of a test file are processed **before** the module graph is resolved. This means even static `import` statements that appear after `mock.module()` calls will see the mocked module.

**Correct pattern** (`MapViewer.test.tsx`):

```ts
import { test, expect, describe, afterEach, mock } from 'bun:test';
import React from 'react'; // needed for createElement in mock factories
import { render, screen, waitFor, cleanup } from '@testing-library/react';

// These mock.module calls are hoisted BEFORE the module graph is built.
// MapViewer.tsx will import the mocked versions, not the real packages.
mock.module('react-native', () => ({
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

mock.module('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, testID, style }: {
    children?: React.ReactNode; testID?: string; style?: unknown;
  }) => React.createElement('div', { 'data-testid': testID ?? 'ghroot', style }, children),
}));

// Static import of MapViewer — gets mocked react-native due to hoisting above
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { MapViewer } from '../MapViewer';
```

**Why `import React from 'react'` (default import)?** The mock factory functions call `React.createElement()`. The default React import is needed for this. NOTE: `MapViewer.tsx` itself does NOT need `import React from 'react'` — bun's transpiler handles JSX automatically. Only the test file needs it for the mock factories.

### `useMapViewer.ts` (view-react-native) — Mirrors view-react Exactly

The hook is intentionally identical to `packages/view-react/src/hooks/useMapViewer.ts`. The architecture explicitly anticipated this divergence risk and solved it by exporting `viewerReducer` as a pure function from view-core (both adapters wrap it with `useReducer`). Do NOT try to DRY this into a shared utility — keeping them independent per-package is the architectural intent.

```ts
import { useReducer, useEffect } from 'react';
import type { MapConfig } from '@resort-map/types';
import { viewerReducer, initialViewerState, parseGwmap } from '@resort-map/view-core';

export function useMapViewer(source: string | MapConfig) {
  const [state, dispatch] = useReducer(viewerReducer, initialViewerState);

  useEffect(() => {
    if (typeof source === 'string') {
      try {
        const config = parseGwmap(source);
        dispatch({ type: 'MAP_LOADED', payload: config });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load map';
        dispatch({ type: 'SET_ERROR', payload: message });
      }
    } else {
      dispatch({ type: 'MAP_LOADED', payload: source });
    }
  }, []); // mount-only: source reactivity is post-v1

  return { state, dispatch };
}
```

Import pattern: only `viewerReducer`, `initialViewerState`, `parseGwmap` from `@resort-map/view-core` (satisfies AC5).

### `MapViewer.tsx` Component Structure

```tsx
import type { MapConfig, ViewerStatus } from '@resort-map/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import { useMapViewer } from './hooks/useMapViewer';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source }: MapViewerProps) {
  const { state } = useMapViewer(source);

  return (
    <GestureHandlerRootView testID="map-viewer" style={{ flex: 1 }}>
      {state.status === 'error' && (
        <Text testID="error-message">{state.error}</Text>
      )}
    </GestureHandlerRootView>
  );
}
```

**Why `style={{ flex: 1 }}`?** ARCH-13 specifies `GestureHandlerRootView style={{ flex: 1 }}`. The inline object is valid — no need to import `StyleSheet` for this simple case. If TypeScript complains about `ViewStyle`, add `as any` or import `StyleSheet` from `'react-native'`.

**`testID` prop on `GestureHandlerRootView`:** React Native uses `testID` (not `data-testid`) for test queries. Our mock maps `testID` → `data-testid` so that `@testing-library/react`'s `getByTestId('map-viewer')` works.

**No MapCanvas yet:** Story 5.1 is the shell only. The ready state renders the GestureHandlerRootView wrapper with nothing inside. MapCanvas is added in Story 5.2.

**Import style — NO `.ts`/`.tsx` extensions:** The linter enforces bare imports. Use `'./hooks/useMapViewer'` not `'./hooks/useMapViewer.ts'`. The workspace linter removes extensions in test and source files.

### `index.ts` Update

Replace the stub with:

```ts
export { MapViewer } from './MapViewer';
export type { MapViewerProps } from './MapViewer';
```

### Test Files Detail

#### `useMapViewer.test.ts` (3 tests — hook-only, no cleanup needed)

```ts
import { test, expect, describe } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { useMapViewer } from '../hooks/useMapViewer';

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid json}';

describe('useMapViewer (view-react-native)', () => {
  test('MapConfig source dispatches MAP_LOADED → status becomes ready', async () => {
    const { result } = renderHook(() => useMapViewer(config));
    await act(async () => {});
    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.mapConfig).toEqual(config);
  });

  test('valid JSON string source dispatches MAP_LOADED → status becomes ready', async () => {
    const { result } = renderHook(() => useMapViewer(validJson));
    await act(async () => {});
    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.mapConfig).not.toBeNull();
  });

  test('invalid JSON string source dispatches SET_ERROR → status becomes error', async () => {
    const { result } = renderHook(() => useMapViewer(invalidJson));
    await act(async () => {});
    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toBeDefined();
  });
});
```

**No `afterEach(cleanup)` needed here** — `renderHook` doesn't create DOM elements that persist between tests. This matches view-react's `useMapViewer.test.ts` pattern.

#### `MapViewer.test.tsx` (4 tests — component, needs cleanup)

```tsx
import { test, expect, describe, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

mock.module('react-native', () => ({
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

mock.module('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, testID, style }: {
    children?: React.ReactNode; testID?: string; style?: unknown;
  }) => React.createElement('div', { 'data-testid': testID ?? 'ghroot', style }, children),
}));

import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { MapViewer } from '../MapViewer';

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid json}';

afterEach(cleanup);

describe('MapViewer (view-react-native)', () => {
  test('MapConfig source renders map-viewer wrapper', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-viewer')).toBeDefined();
    });
    expect(screen.queryByTestId('error-message')).toBeNull();
  });

  test('valid JSON string source renders map-viewer wrapper', async () => {
    render(<MapViewer source={validJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-viewer')).toBeDefined();
    });
  });

  test('invalid source renders error-message Text', async () => {
    render(<MapViewer source={invalidJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeDefined();
    });
    expect(screen.getByTestId('error-message').textContent).toBeTruthy();
  });

  test('GestureHandlerRootView (map-viewer) wraps tree in error state', async () => {
    render(<MapViewer source={invalidJson} />);
    await waitFor(() => {
      // Both the wrapper AND error message are present — wrapper wraps error
      expect(screen.getByTestId('map-viewer')).toBeDefined();
      expect(screen.getByTestId('error-message')).toBeDefined();
    });
    // Error message is inside the GestureHandlerRootView wrapper
    const root = screen.getByTestId('map-viewer');
    expect(root.contains(screen.getByTestId('error-message'))).toBe(true);
  });
});
```

**Why `import React from 'react'` in the test file?** The mock factory functions reference `React.createElement`. This is a VALUE import (not `import type`) required for the factory functions. The production component files do NOT need this — bun handles JSX automatically.

### TypeScript Constraints (same as prior stories)

- `verbatimModuleSyntax: true` → all type-only imports MUST use `import type`
- `noUncheckedIndexedAccess: true` → array access returns `T | undefined`; use `!` or guard
- `"jsx": "react-native"` in view-react-native's tsconfig → classic `React.createElement` transform, but bun auto-handles JSX — no explicit `import React` needed in source files
- Bare imports (no `.ts`/`.tsx`): `'./hooks/useMapViewer'` not `'./hooks/useMapViewer.ts'` — the linter enforces this (as observed in story 4.5 post-implementation)

### Architecture Constraints (ARCH-13)

From `architecture.md`:
> "Expo patterns — `GestureHandlerRootView` at root of RN `MapViewer`; all overlays via `react-native-svg`; animations via Reanimated v2 `useSharedValue` + `useAnimatedStyle`"

`GestureHandlerRootView` MUST be the outermost element in `MapViewer` — not inside a conditional. It wraps ALL states (idle, loading, ready, error). Violating this causes gesture failures in nested components added in Stories 5.2–5.5.

### AC5 Verification (Static Analysis)

AC5 is a grep check, not a runtime test. After implementation, verify:

```bash
grep -r "from '@resort-map/view-core'" packages/view-react-native/src/
```

Should only find:
- `import { viewerReducer, initialViewerState, parseGwmap } from '@resort-map/view-core'` in `useMapViewer.ts`

Imports of `computeRoute` and `filterPois` will appear in future stories (5.3, 5.5). For Story 5.1, only `viewerReducer`, `initialViewerState`, `parseGwmap` are needed.

### AC6 Verification (Package.json Check)

`packages/view-react-native/package.json` already has:
```json
"peerDependencies": {
  "react": "catalog:",
  "react-native": "*",
  "react-native-svg": "catalog:",
  "react-native-gesture-handler": "catalog:",
  "react-native-reanimated": "catalog:"
}
```

No `"main"` field, no `"bun build"` script — ships TS source for Metro to process. **No package.json changes required for AC6.**

### Files to Create / Modify

```
packages/view-react-native/
  src/
    index.ts                            ← UPDATE: replace stub with MapViewer export
    MapViewer.tsx                       ← CREATE: shell component with GestureHandlerRootView
    hooks/
      useMapViewer.ts                   ← CREATE: mirrors view-react's useMapViewer
    __tests__/
      useMapViewer.test.ts              ← CREATE: 3 hook tests (new test file)
      MapViewer.test.tsx                ← CREATE: 4 component tests with RN mocks (new test file)
```

### Expected Test Count

Current total: 185 tests across 18 files
New tests in this story:
- `useMapViewer.test.ts` (view-react-native): 3 tests (new file — 19th)
- `MapViewer.test.tsx` (view-react-native): 4 tests (new file — 20th)
Total new: **7 tests**

Expected total: **192 tests across 20 files**

Run package tests: `bun test packages/view-react-native`
Full regression: `bun test` from workspace root

### Previous Story Learnings (Stories 4.1–4.5)

- **`afterEach(cleanup)` is REQUIRED for component tests** — `@testing-library/react` v16 does NOT auto-cleanup with `bun:test`. Hook-only tests (`renderHook`) do not need it.
- **Bare imports enforced by linter** — The linter strips `.tsx`/`.ts` from import paths. Write `'../MapViewer'` not `'../MapViewer.tsx'`. Observed in Story 4.5 post-commit.
- **`waitFor` + `act(async () => {})` for hook effects** — `useEffect` runs asynchronously. Hook tests need `await act(async () => {})`. Component tests need `waitFor`.
- **Optional props with defaults** — new components should have optional props where possible for forward compatibility.
- **`import type`** — ALL type-only imports MUST use `import type { ... }` due to `verbatimModuleSyntax: true`.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **Discovered: `mock.module` is NOT hoisted in bun (unlike Jest).** Static `import { MapViewer }` fires before any runtime code, so `mock.module` registrations after the static import have no effect — the real react-native was already loaded. react-native's `index.js` uses Flow's `import typeof` syntax which bun cannot parse, causing "Unexpected typeof" error. Fix: use `await import('../MapViewer')` AFTER `mock.module` calls. bun supports top-level await in test files.
- **`@testing-library/react` not hoisted:** Not available via workspace hoisting for view-react-native — had to add it explicitly to `devDependencies`. Also added `react` and `react-dom` as devDeps.
- **`@resort-map/types` not in view-react-native direct deps:** Fixtures (`@resort-map/types/fixtures/complex.gwmap.json`) couldn't be imported until `@resort-map/types` was added to `dependencies`.

### Completion Notes List

- Created `src/hooks/useMapViewer.ts` — mirrors view-react's implementation exactly (intentional per architecture); uses `viewerReducer`, `initialViewerState`, `parseGwmap` from view-core only.
- Created `src/MapViewer.tsx` — `GestureHandlerRootView testID="map-viewer"` is the unconditional root (ARCH-13); `<Text testID="error-message">` rendered conditionally in error state; ready state is an empty wrapper (MapCanvas added in 5.2).
- Updated `src/index.ts` — exports `MapViewer` and `MapViewerProps`.
- Updated `package.json` — added `@resort-map/types` to dependencies; added `react`, `react-dom`, `@testing-library/react` to devDependencies for test support.
- `MapViewer.test.tsx` uses dynamic `await import('../MapViewer')` after `mock.module` calls to ensure mocks are registered before the RN imports are resolved.
- Both `react-native` and `react-native-gesture-handler` are mocked as HTML elements to run in the DOM test environment already set up by the root bunfig.toml preload.
- All ACs verified: hook-level (1, 2, 3) via `useMapViewer.test.ts`; component-level (3, 4) via `MapViewer.test.tsx`; AC5 (only view-core wrapper imports) via code inspection; AC6 (peer deps) already satisfied in package.json.

### File List

- `packages/view-react-native/src/MapViewer.tsx` — CREATED
- `packages/view-react-native/src/hooks/useMapViewer.ts` — CREATED
- `packages/view-react-native/src/index.ts` — UPDATED (replaced stub)
- `packages/view-react-native/src/__tests__/useMapViewer.test.ts` — CREATED
- `packages/view-react-native/src/__tests__/MapViewer.test.tsx` — CREATED
- `packages/view-react-native/package.json` — UPDATED (added @resort-map/types dep, test devDeps)
- `bun.lock` — UPDATED (new deps)

### Change Log

- 2026-06-18: Implemented story 5.1 — view-react-native MapViewer shell with GestureHandlerRootView root (ARCH-13), useMapViewer hook mirroring view-react, source parsing (string and MapConfig), error rendering via Text; 7 new tests; discovered bun mock.module is not hoisted (requires dynamic import pattern for RN mocks).

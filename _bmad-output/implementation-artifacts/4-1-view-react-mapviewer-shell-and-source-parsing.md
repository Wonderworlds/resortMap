---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 4.1: view-react — MapViewer Shell & Source Parsing

Status: review

## Story

**As a** React ≥18 developer,
**I want** to mount `<MapViewer source={...} />` with a `.gwmap` JSON string or a pre-parsed `MapConfig` and have the component parse, validate, and hold the map data in a reducer,
**So that** the viewer self-manages its own state without requiring the host app to call view-core directly.

## Acceptance Criteria

1. **Given** `<MapViewer source={rawGwmapJsonString} />` **When** the component mounts **Then** it calls `parseGwmap(source)` from view-core, dispatches `MAP_LOADED`, and `state.status` becomes `"ready"`

2. **Given** `<MapViewer source={alreadyParsedMapConfig} />` **When** the component mounts **Then** it dispatches `MAP_LOADED` directly without re-parsing

3. **Given** `source` is an invalid JSON string **When** the component mounts **Then** `SET_ERROR` is dispatched with the error message **And** an error message is rendered to the user

4. **Given** `state.status` is `"ready"` **When** the component renders **Then** it renders `<MapCanvas>` passing `mapConfig` and `imageSize`

5. **Given** view-react source files **When** I grep for `import.*view-core` **Then** only wrapper imports (`viewerReducer`, `parseGwmap`, `computeRoute`, `filterPois`, etc.) are found — no logic is duplicated

## Tasks / Subtasks

- [x] Update `packages/view-react/package.json` — add devDependencies for React types and testing (AC: all)
  - [x] Add `@types/react: ^18.3.0`, `@types/react-dom: ^18.3.0` to devDependencies
  - [x] Add `react: catalog:`, `react-dom: catalog:` to devDependencies (needed at test-time even though peerDeps)
  - [x] Add `@testing-library/react: ^16.3.0`, `happy-dom: ^20.10.6` to devDependencies
  - [x] Run `bun install` from workspace root

- [x] Update `packages/view-react/tsconfig.json` — add JSX support (AC: all)
  - [x] Add `"jsx": "react-jsx"`, `"types": ["bun", "react"]` to compilerOptions

- [x] Create `packages/view-react/bunfig.toml` — enable happy-dom for tests (AC: 3, 4)
  - [x] Add `[test]` section with `dom = "happy-dom"` (bun 1.1+ syntax)

- [x] Create `packages/view-react/src/hooks/useMapViewer.ts` — encapsulate reducer + source parsing logic (AC: 1, 2, 3)
  - [x] Write RED test in `useMapViewer.test.ts` first (import the hook, verify it fails)
  - [x] Implement hook: `useReducer(viewerReducer, initialViewerState)` + `useEffect` that dispatches based on source type
  - [x] Verify GREEN: 3 tests pass

- [x] Create `packages/view-react/src/components/MapCanvas.tsx` — stub for Story 4.1 (AC: 4)
  - [x] Render a minimal `<div data-testid="map-canvas" />` placeholder (full pan/zoom implementation in Story 4.2)
  - [x] Accept `mapConfig: MapConfig` and `imageSize: { width: number; height: number } | null` props

- [x] Create `packages/view-react/src/MapViewer.tsx` — root component (AC: 1–5)
  - [x] Write RED test in `MapViewer.test.tsx` first
  - [x] Implement: use `useMapViewer`, render `<MapCanvas>` when ready, render error `<div role="alert">` on error, return `null` when idle
  - [x] Verify GREEN: 3 tests pass

- [x] Update `packages/view-react/src/index.ts` — export `MapViewer` and `MapViewerProps` (AC: 5)

- [x] Run `bun test packages/view-react` to verify all new tests pass (AC: 1–5)

- [x] Run `bun test` from workspace root — confirm no regressions in existing 157 tests (AC: 5)

## Dev Notes

### Package Context — What Exists Before Story 4.1

**`packages/view-react/src/index.ts` (current):**
```ts
export {}; // populated in Story 4.1
```

**`packages/view-react/package.json` (current):**
```json
{
  "name": "@resort-map/view-react",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build src/index.ts --external react --external react-dom --outdir dist"
  },
  "dependencies": { "@resort-map/view-core": "workspace:*" },
  "peerDependencies": { "react": "catalog:", "react-dom": "catalog:" },
  "devDependencies": { "typescript": "catalog:" }
}
```

**`packages/view-react/tsconfig.json` (current):**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src"]
}
```

### CRITICAL: Package Dependency and Config Changes

**Updated `packages/view-react/package.json`:**
```json
{
  "name": "@resort-map/view-react",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build src/index.ts --external react --external react-dom --outdir dist"
  },
  "dependencies": {
    "@resort-map/view-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "react": "catalog:",
    "react-dom": "catalog:",
    "@testing-library/react": "^16.3.0",
    "happy-dom": "^20.10.6"
  }
}
```

Note: `react` and `react-dom` appear in BOTH peerDependencies (for consumers) AND devDependencies (for test-time resolution). This is intentional — bun needs them available during `bun test`.

**Updated `packages/view-react/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun", "react"]
  },
  "include": ["src"]
}
```

The `"jsx": "react-jsx"` enables the automatic JSX transform (React 18 default). No `import React from 'react'` needed in component files — just `import { useState, useEffect } from 'react'`.

**Create `packages/view-react/bunfig.toml`:**
```toml
[test]
dom = "happy-dom"
```

This enables happy-dom DOM environment for ALL test files in this package. Requires `happy-dom` devDependency to be installed. When running `bun test packages/view-react` from root, this config applies. When running `bun test` from root workspace, bun discovers and applies per-package bunfig.toml for each package's test files.

### Architecture Constraints (MUST FOLLOW)

From ADR-002 and the architecture doc:
- `view-react` adapters hold all UI state via `useReducer` — no shared state library
- State is managed with `useReducer(viewerReducer, initialViewerState)` where both are imported from `@resort-map/view-core`
- No logic duplication: `parseGwmap`, `computeRoute`, `filterPois` are called from view-core, never reimplemented
- State never exposed via refs or context — only via `onRouteRequest`, `onFilterChange`, `onStatusChange` callback props
- Component naming: `MapViewerProps`, `MapCanvasProps` (`${ComponentName}Props` pattern)
- Props interfaces: named and exported from the component file
- File naming: `MapViewer.tsx`, `MapCanvas.tsx` (PascalCase)

### TypeScript Constraints (MUST FOLLOW — same as all prior stories)

- `verbatimModuleSyntax: true` → `import type` mandatory for all type-only imports
- React named imports (no default): `import { useState, useEffect, useReducer } from 'react'`
- View-core imports: `import { viewerReducer, initialViewerState, parseGwmap } from '@resort-map/view-core'`
- Type imports: `import type { MapConfig, ViewerStatus, PoiFilterOptions } from '@resort-map/types'`
- `import type { ViewerState, ViewerAction } from '@resort-map/types'`
- `.tsx` extension on all relative imports of component files

### `useMapViewer.ts` — Hook Implementation

This hook encapsulates the `useReducer` state machine and the source-parsing effect:

```ts
import { useReducer, useEffect } from 'react';
import type { MapConfig } from '@resort-map/types';
import type { ViewerState, ViewerAction } from '@resort-map/types';
import { viewerReducer, initialViewerState, parseGwmap } from '@resort-map/view-core';

export function useMapViewer(source: string | MapConfig): {
  state: ViewerState;
  dispatch: React.Dispatch<ViewerAction>;
} {
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
  }, []); // Intentionally empty deps: dispatch on mount only. Source reactivity is post-v1.

  return { state, dispatch };
}
```

**Design decisions:**
- Empty `useEffect` deps `[]`: The effect runs on mount only. If `source` changes after mount, the state does not update. This is intentional for Story 4.1 (per ACs saying "when the component mounts"). Reactivity to `source` prop changes can be added post-v1.
- `React.Dispatch<ViewerAction>` type: `Dispatch` comes from React's type system; with `verbatimModuleSyntax`, we need `import type { Dispatch } from 'react'` OR reference it via `React.Dispatch`. Choose whichever TypeScript accepts.

**Import note for `React.Dispatch`**: With `verbatimModuleSyntax: true`, you cannot use `import type { Dispatch } from 'react'` and reference `React.Dispatch`. Choose one approach:

```ts
// Option A: explicit type import
import type { Dispatch } from 'react';
// then: dispatch: Dispatch<ViewerAction>

// Option B: ReturnType inference (no explicit type needed)
// Just return { state, dispatch } — TypeScript infers the types
```

Option B (inference) is simplest — just return `{ state, dispatch }` and let TypeScript infer.

### `MapViewer.tsx` — Root Component

```tsx
import { useReducer, useEffect } from 'react';
import type { MapConfig } from '@resort-map/types';
import type { ViewerStatus } from '@resort-map/types';
import { useMapViewer } from './hooks/useMapViewer.ts';
import { MapCanvas } from './components/MapCanvas.tsx';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source, onStatusChange }: MapViewerProps) {
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

  return null; // idle or loading
}
```

**Story 4.1 scope**: `MapViewerProps` only includes `source` and `onStatusChange` in this story. `onRouteRequest` and `onFilterChange` are wired in Stories 4.3 and 4.5. Do NOT add those props now.

**Error rendering**: The `<div role="alert">` with `{state.error}` renders the error message string. No built-in spinner or styled error UI — per architecture: "No built-in spinner or error UI — host app decides presentation."

### `components/MapCanvas.tsx` — Stub for Story 4.1

```tsx
import type { MapConfig } from '@resort-map/types';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
}

export function MapCanvas({ mapConfig }: MapCanvasProps) {
  // Full CSS-transform pan/zoom implementation in Story 4.2
  return <div data-testid="map-canvas" />;
}
```

The `mapConfig` prop is received but unused in the stub. TypeScript may warn about unused variables — prefix with `_mapConfig` if needed: `{ mapConfig: _mapConfig }`.

Actually: keep it as `mapConfig` since Story 4.2 will use it. TypeScript won't warn about unused destructured params in function params with the project's strict settings.

### `index.ts` — Final State After Story 4.1

```ts
export { MapViewer } from './MapViewer.tsx';
export type { MapViewerProps } from './MapViewer.tsx';
```

The `MapCanvas`, `useMapViewer`, and `MapCanvasProps` are internal — not exported from `index.ts`. Only `MapViewer` is the public API.

### DOM Testing Setup

**bunfig.toml** tells bun to use happy-dom for tests in this package:
```toml
[test]
dom = "happy-dom"
```

This makes `document`, `window`, `HTMLElement`, etc. available in all test files within `packages/view-react`. Running `bun test packages/view-react` from the workspace root picks up this bunfig.toml. Running bare `bun test` from root also discovers tests in `packages/view-react/` and applies the per-package config.

`@testing-library/react@16` works with Bun 1.3+ and React 18 in happy-dom. The `render`, `screen`, `waitFor`, `renderHook`, and `act` exports all function correctly.

### Test Files — Complete Implementation

**`src/__tests__/useMapViewer.test.ts`**

Since `useMapViewer` is a React hook (uses `useReducer` and `useEffect`), testing it in isolation requires either:
- `renderHook` from `@testing-library/react`
- Testing it via the `MapViewer` component (which exercises the hook)

For this story, test the hook via `renderHook`:

```ts
import { test, expect, describe } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { useMapViewer } from '../hooks/useMapViewer.ts';

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid json}';

describe('useMapViewer', () => {
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

**`src/__tests__/MapViewer.test.tsx`**

```tsx
import { test, expect, describe } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { MapViewer } from '../MapViewer.tsx';

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid}';

describe('MapViewer', () => {
  test('renders MapCanvas when source is a valid MapConfig', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
  });

  test('renders MapCanvas when source is a valid JSON string', async () => {
    render(<MapViewer source={validJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
  });

  test('renders error alert when source is invalid JSON', async () => {
    render(<MapViewer source={invalidJson} />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });
});
```

**Note on `@testing-library/react` with `bun:test`**: `@testing-library/react@16` is compatible with bun's test runner when happy-dom is enabled via `bunfig.toml`. The `render` function uses `ReactDOM.createRoot` internally. `act` handles state updates. `screen.getByTestId` and `screen.getByRole` query the happy-dom document.

**If `dom = "happy-dom"` syntax is not supported by bun 1.3.14**, use the preload approach instead:

Create `packages/view-react/src/__tests__/setup.ts`:
```ts
import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow({ url: 'http://localhost/' });
(globalThis as Record<string, unknown>).window = window;
(globalThis as Record<string, unknown>).document = window.document;
(globalThis as Record<string, unknown>).navigator = window.navigator;
(globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
(globalThis as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;
(globalThis as Record<string, unknown>).Event = window.Event;
```

And update `bunfig.toml`:
```toml
[test]
preload = ["./src/__tests__/setup.ts"]
```

### Files to Create / Modify

```
packages/view-react/
  package.json                             ← UPDATE: add testing devDeps
  tsconfig.json                            ← UPDATE: add jsx, types
  bunfig.toml                              ← CREATE: DOM testing
  src/
    index.ts                               ← UPDATE: export MapViewer
    MapViewer.tsx                          ← CREATE
    hooks/
      useMapViewer.ts                      ← CREATE
    components/
      MapCanvas.tsx                        ← CREATE (stub)
    __tests__/
      useMapViewer.test.ts                 ← CREATE (3 tests)
      MapViewer.test.tsx                   ← CREATE (3 tests)
```

### Previous Story Learnings (from Story 3.4, 3.5)

- `verbatimModuleSyntax: true` → `import type` for all type-only imports
- Use `.at(-1)!` with non-null assertion for test data setup  
- `noUncheckedIndexedAccess` requires optional chaining on array index access: `arr[0]?.field`
- `complexMap as unknown as MapConfig` to cast JSON fixture

### From builder-react (established React patterns in this project)

- `"jsx": "react-jsx"` in tsconfig enables automatic JSX transform (builder-react uses this)
- React named imports: `import { useState, useEffect, useReducer } from 'react'` — no default `React` import needed with automatic transform
- `"types": ["bun", "react"]` in tsconfig for type resolution

### AC5 Import Compliance

AC5 requires that `view-react` source files only import WRAPPER FUNCTIONS from view-core (not reimplemented logic). After implementation, verify:

```bash
grep -r "import.*view-core" packages/view-react/src/
```

Expected matches (all acceptable wrappers):
- `viewerReducer` — using view-core's pure reducer, not duplicating logic
- `initialViewerState` — using view-core's initial state
- `parseGwmap` — calling view-core's parser, not reimplementing JSON parsing
- `computeRoute` — will be called in Story 4.3
- `filterPois` — will be called in Story 4.5

### Expected Test Count

Current total: 157 tests (across 13 files)
New tests added in this story: 6 (3 in useMapViewer.test.ts + 3 in MapViewer.test.tsx)
Expected total: 163 tests across 15 files

Run with: `bun test packages/view-react` (applies bunfig.toml DOM config)
Full regression: `bun test` from workspace root

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `dom = "happy-dom"` in per-package `bunfig.toml` is NOT applied when running `bun test` from workspace root (Bun 1.3.14). Switched to `preload` approach and created a root-level `bunfig.toml` pointing to the happy-dom setup file.
- `@resort-map/types` needed as an explicit dependency of `view-react` (not just transitive through `view-core`) for fixture imports to resolve in tests.
- `@testing-library/react` does not call `cleanup` automatically with `bun:test` — added `afterEach(cleanup)` to `MapViewer.test.tsx`.

### Completion Notes List

- Implemented `useMapViewer` hook using `useReducer(viewerReducer, initialViewerState)` + `useEffect` that parses string sources via `parseGwmap` and dispatches MAP_LOADED or SET_ERROR on mount.
- Created `MapCanvas.tsx` stub that renders `<div data-testid="map-canvas" />` with correct props interface (full implementation deferred to Story 4.2).
- Created `MapViewer.tsx` root component that delegates state to `useMapViewer` and conditionally renders `<MapCanvas>` (ready) or `<div role="alert">` (error) or `null` (idle).
- Created root-level `bunfig.toml` with preload for happy-dom setup to enable DOM environment for all workspace tests.
- Added `@resort-map/types` as explicit dependency to `view-react` package.json.
- All 6 new tests pass (3 useMapViewer + 3 MapViewer). Full regression: 163/163 tests pass across 15 files.
- AC5 verified: only `viewerReducer`, `initialViewerState`, `parseGwmap` imported from view-core — no logic duplication.

### File List

- `packages/view-react/package.json` — updated: added devDependencies for React types, testing-library, happy-dom; added @resort-map/types dependency
- `packages/view-react/tsconfig.json` — updated: added jsx=react-jsx, types=[bun, react]
- `packages/view-react/bunfig.toml` — created: preload happy-dom setup for per-package test runs
- `packages/view-react/src/index.ts` — updated: exports MapViewer and MapViewerProps
- `packages/view-react/src/MapViewer.tsx` — created: root component with error/ready/idle states
- `packages/view-react/src/hooks/useMapViewer.ts` — created: useReducer + useEffect hook for source parsing
- `packages/view-react/src/components/MapCanvas.tsx` — created: stub with data-testid
- `packages/view-react/src/__tests__/useMapViewer.test.ts` — created: 3 hook tests
- `packages/view-react/src/__tests__/MapViewer.test.tsx` — created: 3 component tests
- `packages/view-react/src/__tests__/setup.ts` — created: happy-dom global setup for testing-library
- `bunfig.toml` — created: root-level preload for happy-dom setup (workspace-wide test DOM support)
- `bun.lock` — updated: new dependencies locked

### Change Log

- 2026-06-18: Story 4.1 implemented — MapViewer shell with source parsing, useMapViewer hook, MapCanvas stub, DOM test setup, 6 new tests (163 total)

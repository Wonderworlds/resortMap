---
baseline_commit: b5de591237e3a12c9d6f34939117810ecfa6745c
---

# Story 2.2: builder-react — App Skeleton & Zustand Store

Status: review

## Story

As a map author,
I want builder-react to start as a working Bun.serve() app with the Zustand store wired up, undo/redo operational, and tool selection available in a toolbar,
So that all subsequent story features have a stable foundation to build on.

## Acceptance Criteria

1. **Given** I run `bun --hot packages/builder-react/index.ts` **When** I open `http://localhost:3000` **Then** the app renders without errors and shows a three-zone layout: toolbar (top), canvas area (center), sidebar (right)

   > **Note:** The epic file lists the entry as `./packages/builder-react/src/index.ts` — this is a typo. The real server entry is `packages/builder-react/index.ts` (already exists). Do NOT create a new `src/index.ts`.

2. **Given** the Zustand store at `src/store/mapStore.ts` **When** I inspect its state shape **Then** it contains: `mapConfig: MapConfig | null`, `activeTool: "select" | "placePoi" | "placeNode" | "drawEdge"`, `selectedItemId: string | null`, `undoStack: MapConfig[]`

3. **Given** any store action that mutates `mapConfig` **When** the action executes **Then** the current `mapConfig` is pushed onto `undoStack` before mutation **And** if `undoStack` would exceed 50 entries, the oldest entry is dropped

4. **Given** `undoStack` has at least one entry **When** I call `undo()` **Then** the top entry is popped from `undoStack` and becomes the current `mapConfig`

5. **Given** the toolbar **When** I click a tool button (Select, Place POI, Place Node, Draw Edge) **Then** `activeTool` updates to the corresponding value **And** the active button is visually highlighted

## Tasks / Subtasks

- [x] Update `packages/builder-react/package.json` — add `zustand` and `@resort-map/types` dependencies
  - [x] Add `"zustand": "catalog:"` to `"dependencies"`
  - [x] Add `"@resort-map/types": "workspace:*"` to `"dependencies"`
  - [x] Run `bun install` from workspace root to install zustand
- [x] Create `packages/builder-react/src/store/mapStore.ts` — Zustand store with all state and actions (AC: 2–4)
  - [x] Export `type ActiveTool = 'select' | 'placePoi' | 'placeNode' | 'drawEdge'`
  - [x] Define `interface MapStore` with all state fields and action signatures
  - [x] Implement `setActiveTool(tool: ActiveTool): void`
  - [x] Implement `setSelectedItemId(id: string | null): void`
  - [x] Implement `undo(): void` — pops undoStack
  - [x] Implement `initMap(meta: MapMeta): void` — resets to fresh MapConfig (no undo push)
  - [x] Implement all builder-core wrappers: `addPoi`, `removePoi`, `updatePoi`, `addNode`, `removeNode`, `addEdge`, `removeEdge` — each pushes to undoStack (capped at 50) before mutating
  - [x] Export `useMapStore` as the default Zustand hook
- [x] Create `packages/builder-react/src/App.tsx` — three-zone root layout (AC: 1)
  - [x] Import and render `<Toolbar />`, `<MapCanvas />`, `<Sidebar />`
  - [x] Toolbar spans top; canvas and sidebar fill remaining height as a flex row
- [x] Create `packages/builder-react/src/components/Toolbar.tsx` — tool selection UI (AC: 5)
  - [x] Render 4 tool buttons: Select, Place POI, Place Node, Draw Edge
  - [x] Read `activeTool` from store; dispatch `setActiveTool` on click
  - [x] Visually highlight the active tool button (e.g., different background color)
  - [x] Include Undo button (disabled when undoStack is empty)
- [x] Create `packages/builder-react/src/components/MapCanvas.tsx` — skeleton (Stories 2.3–2.4 fill this)
  - [x] If `mapConfig` is null, show a placeholder message
  - [x] Otherwise render an empty div container (canvas logic added in Story 2.3)
- [x] Create `packages/builder-react/src/components/Sidebar.tsx` — skeleton (Story 2.5 fills this)
  - [x] Show "Select a POI or node to edit its properties" when `selectedItemId` is null
  - [x] Show selected id otherwise (detail UI added in Story 2.5)
- [x] Update `packages/builder-react/src/main.tsx` — replace placeholder with `<App />`
  - [x] Remove old placeholder `<div>builder-react placeholder</div>`
  - [x] Render `<App />` via `createRoot`
- [x] Create `packages/builder-react/src/__tests__/mapStore.test.ts` — store unit tests (AC: 2–4)
  - [x] Test initial state shape
  - [x] Test `setActiveTool` for all four tool values
  - [x] Test `initMap` creates a valid MapConfig, clears selectedItemId, does NOT push to undoStack
  - [x] Test `addPoi` pushes to undoStack and returns new config
  - [x] Test `removePoi` pushes to undoStack and clears selectedItemId if removed POI was selected
  - [x] Test `updatePoi` pushes to undoStack
  - [x] Test `addNode` / `removeNode` push to undoStack; `removeNode` clears selectedItemId if selected
  - [x] Test `addEdge` / `removeEdge` push to undoStack; `removeEdge` clears selectedItemId if edge was selected (key = `"{from}:{to}"`)
  - [x] Test `undo()` restores previous mapConfig, pops undoStack
  - [x] Test `undo()` does nothing when undoStack is empty
  - [x] Test undoStack is capped at 50 entries
  - [x] Reset store state in `beforeEach`
- [x] Run `bun test` from workspace root and verify all tests pass (AC: 2–4)

## Dev Notes

### Files to Create / Modify

```
packages/builder-react/
├── package.json                    ← UPDATE: add zustand + @resort-map/types
├── src/
│   ├── main.tsx                    ← UPDATE: render <App />
│   ├── App.tsx                     ← CREATE: three-zone layout
│   ├── store/
│   │   └── mapStore.ts             ← CREATE: Zustand store
│   ├── components/
│   │   ├── Toolbar.tsx             ← CREATE: tool buttons
│   │   ├── MapCanvas.tsx           ← CREATE: skeleton
│   │   └── Sidebar.tsx             ← CREATE: skeleton
│   └── __tests__/
│       └── mapStore.test.ts        ← CREATE: store unit tests
```

Do NOT create `src/index.ts` — the server entry is already at `packages/builder-react/index.ts`.

### Current State of Existing Files

**`packages/builder-react/index.ts`** (DO NOT MODIFY):
```ts
import index from "./index.html";
Bun.serve({
  routes: { "/": index },
  development: { hmr: true },
});
```
This already serves `index.html` on port 3000 (Bun default). Dev command: `bun --hot packages/builder-react/index.ts`.

**`packages/builder-react/index.html`** (DO NOT MODIFY):
```html
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
```

**`packages/builder-react/src/main.tsx`** (REPLACE contents):
```tsx
import React from "react";
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("root")!);
root.render(<div>builder-react placeholder</div>);
```
Replace this with the new `<App />` render (see below).

**`packages/builder-react/package.json`** (MUST UPDATE before writing store):
Currently only has `@resort-map/builder-core` in dependencies. Must add `zustand` and `@resort-map/types`.

### `package.json` — Updated Content

```json
{
  "name": "@resort-map/builder-react",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun --hot index.ts"
  },
  "dependencies": {
    "@resort-map/builder-core": "workspace:*",
    "@resort-map/types": "workspace:*",
    "zustand": "catalog:"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

After writing this file, run `bun install` from the workspace root to install `zustand`.

### Architecture Notes — Discrepancies to Follow Story ACs

The architecture document (`architecture.md`) has two differences from the story ACs:

1. **State field name:** Architecture uses `config: MapConfig` (non-null) — story AC says `mapConfig: MapConfig | null`. **Use `mapConfig: MapConfig | null` per the story AC.** This allows the app to start without a loaded map.

2. **`activeTool` type:** Architecture uses `'select' | 'placePoi' | 'drawRoad'` — story AC says `"select" | "placePoi" | "placeNode" | "drawEdge"`. **Use the story AC definition** (more granular: separate `placeNode` and `drawEdge`).

### `mapStore.ts` — Complete Implementation

```ts
import { create } from 'zustand';
import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge } from '@resort-map/types';
import {
  createMapConfig,
  addPoi as coreAddPoi,
  removePoi as coreRemovePoi,
  updatePoi as coreUpdatePoi,
  addNode as coreAddNode,
  removeNode as coreRemoveNode,
  addEdge as coreAddEdge,
  removeEdge as coreRemoveEdge,
} from '@resort-map/builder-core';

export type ActiveTool = 'select' | 'placePoi' | 'placeNode' | 'drawEdge';

const MAX_UNDO = 50;

function pushUndo(stack: MapConfig[], config: MapConfig): MapConfig[] {
  return [...stack.slice(-(MAX_UNDO - 1)), config];
}

interface MapStore {
  mapConfig: MapConfig | null;
  activeTool: ActiveTool;
  selectedItemId: string | null;
  undoStack: MapConfig[];

  setActiveTool: (tool: ActiveTool) => void;
  setSelectedItemId: (id: string | null) => void;
  undo: () => void;
  initMap: (meta: MapMeta) => void;
  addPoi: (poi: Omit<POI, 'id'>) => void;
  removePoi: (poiId: string) => void;
  updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
  addNode: (node: Omit<GraphNode, 'id'>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (from: string, to: string) => void;
}

export const useMapStore = create<MapStore>()((set) => ({
  mapConfig: null,
  activeTool: 'select',
  selectedItemId: null,
  undoStack: [],

  setActiveTool: (tool) => set({ activeTool: tool }),

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const prev = state.undoStack[state.undoStack.length - 1]!;
      return { mapConfig: prev, undoStack: state.undoStack.slice(0, -1) };
    }),

  initMap: (meta) =>
    set({ mapConfig: createMapConfig(meta), undoStack: [], selectedItemId: null }),

  addPoi: (poi) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddPoi(state.mapConfig, poi),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  removePoi: (poiId) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreRemovePoi(state.mapConfig, poiId),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        selectedItemId: state.selectedItemId === poiId ? null : state.selectedItemId,
      };
    }),

  updatePoi: (poiId, patch) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreUpdatePoi(state.mapConfig, poiId, patch),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  addNode: (node) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddNode(state.mapConfig, node),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  removeNode: (nodeId) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreRemoveNode(state.mapConfig, nodeId),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        selectedItemId: state.selectedItemId === nodeId ? null : state.selectedItemId,
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddEdge(state.mapConfig, edge),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  removeEdge: (from, to) =>
    set((state) => {
      if (!state.mapConfig) return {};
      const edgeKey = `${from}:${to}`;
      return {
        mapConfig: coreRemoveEdge(state.mapConfig, from, to),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        selectedItemId: state.selectedItemId === edgeKey ? null : state.selectedItemId,
      };
    }),
}));
```

**`pushUndo` behavior:** `stack.slice(-(MAX_UNDO - 1))` takes the last 49 entries; appending `config` yields at most 50.

**Returning `{}`:** In Zustand v4, returning `{}` from a `set` updater performs no-op (partial merge with nothing). This is the correct pattern when `mapConfig` is null — just skip the action.

**`create<MapStore>()(...)` — double invocation:** This is Zustand v4's TypeScript-safe `create` signature. The outer `create<MapStore>()` sets the type; the inner `(...)` is the initializer.

### `main.tsx` — Updated Content

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');
createRoot(rootEl).render(<App />);
```

No `import React` needed — `tsconfig.json` uses `"jsx": "react-jsx"` (automatic runtime).

### `App.tsx` — Complete Implementation

```tsx
import { Toolbar } from './components/Toolbar.tsx';
import { MapCanvas } from './components/MapCanvas.tsx';
import { Sidebar } from './components/Sidebar.tsx';

export function App(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0, fontFamily: 'sans-serif' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas />
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
```

### `Toolbar.tsx` — Complete Implementation

```tsx
import { useMapStore } from '../store/mapStore.ts';
import type { ActiveTool } from '../store/mapStore.ts';

interface ToolItem {
  tool: ActiveTool;
  label: string;
}

const TOOLS: ToolItem[] = [
  { tool: 'select', label: 'Select' },
  { tool: 'placePoi', label: 'Place POI' },
  { tool: 'placeNode', label: 'Place Node' },
  { tool: 'drawEdge', label: 'Draw Edge' },
];

export function Toolbar(): JSX.Element {
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const undo = useMapStore((s) => s.undo);
  const undoStackLen = useMapStore((s) => s.undoStack.length);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid #d1d5db',
        background: '#f9fafb',
        flexShrink: 0,
      }}
    >
      {TOOLS.map(({ tool, label }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          style={{
            padding: '6px 14px',
            fontWeight: activeTool === tool ? '600' : '400',
            background: activeTool === tool ? '#2563eb' : '#ffffff',
            color: activeTool === tool ? '#ffffff' : '#374151',
            border: `1px solid ${activeTool === tool ? '#2563eb' : '#d1d5db'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {label}
        </button>
      ))}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={undo}
          disabled={undoStackLen === 0}
          style={{
            padding: '6px 14px',
            background: '#ffffff',
            color: undoStackLen === 0 ? '#9ca3af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: undoStackLen === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Undo
        </button>
      </div>
    </div>
  );
}
```

### `MapCanvas.tsx` — Skeleton (Story 2.3 fills this)

```tsx
import { useMapStore } from '../store/mapStore.ts';

export function MapCanvas(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);

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

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#e5e7eb' }}>
      {/* SVG canvas added in Story 2.3 */}
    </div>
  );
}
```

### `Sidebar.tsx` — Skeleton (Story 2.5 fills this)

```tsx
import { useMapStore } from '../store/mapStore.ts';

export function Sidebar(): JSX.Element {
  const selectedItemId = useMapStore((s) => s.selectedItemId);

  return (
    <div
      style={{
        width: '280px',
        borderLeft: '1px solid #d1d5db',
        padding: '16px',
        overflowY: 'auto',
        background: '#fafafa',
        flexShrink: 0,
      }}
    >
      {selectedItemId == null ? (
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
          Select a POI or node to edit its properties
        </p>
      ) : (
        <p style={{ fontSize: '14px', margin: 0 }}>Selected: {selectedItemId}</p>
      )}
    </div>
  );
}
```

### `mapStore.test.ts` — Complete Test File

Tests use `useMapStore.getState()` / `useMapStore.setState()` directly — no React rendering needed. This is valid in Bun's test environment since Zustand stores work outside React.

```ts
import { test, expect, describe, beforeEach } from 'bun:test';
import { useMapStore } from '../store/mapStore.ts';
import type { MapMeta } from '@resort-map/types';

const validMeta: MapMeta = {
  backgroundImageUrl: 'https://example.com/map.png',
  center: { x: 512, y: 384 },
  scale: 0.05,
};

beforeEach(() => {
  useMapStore.setState({
    mapConfig: null,
    activeTool: 'select',
    selectedItemId: null,
    undoStack: [],
  });
});

describe('initial state', () => {
  test('has correct shape', () => {
    const s = useMapStore.getState();
    expect(s.mapConfig).toBeNull();
    expect(s.activeTool).toBe('select');
    expect(s.selectedItemId).toBeNull();
    expect(s.undoStack).toHaveLength(0);
  });
});

describe('setActiveTool', () => {
  test('updates to placePoi', () => {
    useMapStore.getState().setActiveTool('placePoi');
    expect(useMapStore.getState().activeTool).toBe('placePoi');
  });

  test('updates to placeNode', () => {
    useMapStore.getState().setActiveTool('placeNode');
    expect(useMapStore.getState().activeTool).toBe('placeNode');
  });

  test('updates to drawEdge', () => {
    useMapStore.getState().setActiveTool('drawEdge');
    expect(useMapStore.getState().activeTool).toBe('drawEdge');
  });

  test('updates back to select', () => {
    useMapStore.getState().setActiveTool('placePoi');
    useMapStore.getState().setActiveTool('select');
    expect(useMapStore.getState().activeTool).toBe('select');
  });
});

describe('initMap', () => {
  test('creates MapConfig from meta', () => {
    useMapStore.getState().initMap(validMeta);
    const s = useMapStore.getState();
    expect(s.mapConfig).not.toBeNull();
    expect(s.mapConfig?.version).toBe('1.0');
    expect(s.mapConfig?.pois).toHaveLength(0);
    expect(s.mapConfig?.graph.nodes).toHaveLength(0);
    expect(s.mapConfig?.graph.edges).toHaveLength(0);
  });

  test('clears undoStack on init', () => {
    // Pre-populate undoStack via setState
    useMapStore.setState({ undoStack: [{ version: '1.0', map: validMeta, pois: [], graph: { nodes: [], edges: [] } }] });
    useMapStore.getState().initMap(validMeta);
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });

  test('clears selectedItemId on init', () => {
    useMapStore.setState({ selectedItemId: 'some-id' });
    useMapStore.getState().initMap(validMeta);
    expect(useMapStore.getState().selectedItemId).toBeNull();
  });

  test('does NOT push to undoStack on init', () => {
    useMapStore.getState().initMap(validMeta);
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });
});

describe('addPoi', () => {
  test('does nothing when mapConfig is null', () => {
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    expect(useMapStore.getState().mapConfig).toBeNull();
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });

  test('adds a POI and pushes previous config to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    const before = useMapStore.getState().mapConfig!;
    useMapStore.getState().addPoi({ label: 'Restaurant', position: { x: 100, y: 200 }, tags: ['food'] });
    const s = useMapStore.getState();
    expect(s.mapConfig?.pois).toHaveLength(1);
    expect(s.mapConfig?.pois[0]!.label).toBe('Restaurant');
    expect(s.undoStack).toHaveLength(1);
    expect(s.undoStack[0]).toBe(before);
  });
});

describe('removePoi', () => {
  test('removes a POI and pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.getState().removePoi(poiId);
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(0);
    expect(useMapStore.getState().undoStack).toHaveLength(2);
  });

  test('clears selectedItemId when the removed POI was selected', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.setState({ selectedItemId: poiId });
    useMapStore.getState().removePoi(poiId);
    expect(useMapStore.getState().selectedItemId).toBeNull();
  });

  test('preserves selectedItemId when a different POI is removed', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    useMapStore.getState().addPoi({ label: 'B', position: { x: 10, y: 10 }, tags: [] });
    const pois = useMapStore.getState().mapConfig!.pois;
    const idA = pois[0]!.id;
    const idB = pois[1]!.id;
    useMapStore.setState({ selectedItemId: idB });
    useMapStore.getState().removePoi(idA);
    expect(useMapStore.getState().selectedItemId).toBe(idB);
  });
});

describe('updatePoi', () => {
  test('patches POI fields and pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'Original', position: { x: 0, y: 0 }, tags: ['a'] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.getState().updatePoi(poiId, { label: 'Updated' });
    expect(useMapStore.getState().mapConfig?.pois[0]!.label).toBe('Updated');
    expect(useMapStore.getState().mapConfig?.pois[0]!.tags).toEqual(['a']); // unchanged
    expect(useMapStore.getState().undoStack).toHaveLength(2);
  });
});

describe('undo', () => {
  test('does nothing when undoStack is empty', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().undo();
    const s = useMapStore.getState();
    expect(s.mapConfig?.pois).toHaveLength(0); // config from initMap unchanged
    expect(s.undoStack).toHaveLength(0);
  });

  test('undo when mapConfig is null does nothing', () => {
    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig).toBeNull();
  });

  test('pops undoStack and restores previous mapConfig', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(1);
    expect(useMapStore.getState().undoStack).toHaveLength(1);

    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(0);
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });

  test('multiple undos work sequentially', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    useMapStore.getState().addPoi({ label: 'B', position: { x: 10, y: 10 }, tags: [] });
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(2);

    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(1);

    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(0);
  });
});

describe('addNode / removeNode', () => {
  test('addNode pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 50, y: 100 } });
    expect(useMapStore.getState().mapConfig?.graph.nodes).toHaveLength(1);
    expect(useMapStore.getState().undoStack).toHaveLength(1);
  });

  test('removeNode removes the node from graph', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    const nodeId = useMapStore.getState().mapConfig!.graph.nodes[0]!.id;
    useMapStore.getState().removeNode(nodeId);
    expect(useMapStore.getState().mapConfig?.graph.nodes).toHaveLength(0);
  });

  test('removeNode clears selectedItemId when node was selected', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    const nodeId = useMapStore.getState().mapConfig!.graph.nodes[0]!.id;
    useMapStore.setState({ selectedItemId: nodeId });
    useMapStore.getState().removeNode(nodeId);
    expect(useMapStore.getState().selectedItemId).toBeNull();
  });
});

describe('addEdge / removeEdge', () => {
  function setupTwoNodes() {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    useMapStore.getState().addNode({ position: { x: 10, y: 10 } });
    const nodes = useMapStore.getState().mapConfig!.graph.nodes;
    return { nodeA: nodes[0]!, nodeB: nodes[1]! };
  }

  test('addEdge appends edge and pushes to undoStack', () => {
    const { nodeA, nodeB } = setupTwoNodes();
    useMapStore.getState().addEdge({ from: nodeA.id, to: nodeB.id });
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(1);
    expect(useMapStore.getState().undoStack.length).toBeGreaterThan(0);
  });

  test('removeEdge clears selectedItemId when edge "{from}:{to}" was selected', () => {
    const { nodeA, nodeB } = setupTwoNodes();
    useMapStore.getState().addEdge({ from: nodeA.id, to: nodeB.id });
    const edgeKey = `${nodeA.id}:${nodeB.id}`;
    useMapStore.setState({ selectedItemId: edgeKey });
    useMapStore.getState().removeEdge(nodeA.id, nodeB.id);
    expect(useMapStore.getState().selectedItemId).toBeNull();
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(0);
  });
});

describe('undoStack cap (50 entries)', () => {
  test('undoStack stays at 50 after 55 mutations', () => {
    useMapStore.getState().initMap(validMeta);
    for (let i = 0; i < 55; i++) {
      useMapStore.getState().addPoi({ label: `P${i}`, position: { x: i, y: i }, tags: [] });
    }
    expect(useMapStore.getState().undoStack).toHaveLength(50);
  });
});
```

### Architecture Compliance (MANDATORY)

1. **`verbatimModuleSyntax: true`** — ALL type-only imports MUST use `import type`:
   ```ts
   import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge } from '@resort-map/types';
   import type { ActiveTool } from '../store/mapStore.ts';
   // Values (functions, runtime objects):
   import { create } from 'zustand';
   import { useMapStore } from '../store/mapStore.ts';
   ```

2. **`noUncheckedIndexedAccess: true`** — Array subscripts return `T | undefined` in TypeScript. In test files use `!` after confirming the array has elements:
   ```ts
   const pois = state.mapConfig!.pois;
   // Don't do: pois[0].id  → error
   // Do: pois[0]!.id       ✓
   ```

3. **JSX — no explicit React import needed** — `tsconfig.json` has `"jsx": "react-jsx"` (automatic runtime). Do NOT add `import React from 'react'` to new component files. Just write JSX directly.

4. **`.ts` file extensions in imports** — within-package relative imports always use `.ts`/`.tsx`:
   ```ts
   import { Toolbar } from './components/Toolbar.tsx';
   import { useMapStore } from '../store/mapStore.ts';
   ```

5. **Explicit return types on exported functions** — all exported React components use `: JSX.Element` return type annotation.

6. **Builder-core functions renamed on import** — to avoid collision with store action names:
   ```ts
   import {
     addPoi as coreAddPoi,
     removePoi as coreRemovePoi,
     // etc.
   } from '@resort-map/builder-core';
   ```

7. **`create<MapStore>()((set) => ...)` — double invocation** — This is the correct Zustand v4 TypeScript API. Do NOT use `create((set) => ...)` without the type parameter.

8. **Returning `{}` from Zustand `set` updaters** — valid no-op in Zustand v4 partial state pattern. Used when `mapConfig` is null.

9. **`useMapStore.setState({ ... })` in tests** — merges into existing state, preserving action functions. Do NOT use `replace: true` (it would delete action functions from the store).

### Zustand v4 API Summary

```ts
import { create } from 'zustand';

const useStore = create<MyState>()((set, get) => ({
  // state fields
  count: 0,
  // actions
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// In tests (outside React):
useStore.getState().increment();
useStore.setState({ count: 0 }); // reset (merge)
const state = useStore.getState();
```

Zustand v4 ships with built-in TypeScript types — no `@types/zustand` needed.

### Previous Story Learnings (Stories 1.1 – 2.1)

- **`verbatimModuleSyntax: true` causes compile failures for type-value confusion** — always check whether an import is a type or a value
- **`noUncheckedIndexedAccess: true` affects test files** — accessing `arr[0]` returns `T | undefined`; always use `arr[0]!` or check length first
- **`bun test` auto-discovers `*.test.ts` recursively** — tests in `src/__tests__/` are found automatically from workspace root
- **Within-package imports need `.ts`/`.tsx` extension** — always include the extension in relative imports
- **`bun test` runs from workspace root** — command is always `bun test` at the workspace root
- **`crypto.randomUUID()` is a global** — no import needed
- **Builder-core functions return new objects** — store actions correctly call them and push the PREVIOUS state to undoStack

### `removeEdge` Selected ID Semantics (Story 2.4 Preview)

When an edge is selected in the canvas (Story 2.4), `selectedItemId` will be set to a synthetic key `"{from}:{to}"`. The `removeEdge` action in the store clears `selectedItemId` when it matches this key. This is pre-wired in the store so Story 2.4 doesn't need to modify the store.

### References

- Zustand store shape and naming [Source: architecture.md#State Management Patterns]
- `activeTool` four-value enum [Source: epics.md#Story 2.2 AC2]
- `mapConfig: MapConfig | null` [Source: epics.md#Story 2.2 AC2]
- `undoStack` max 50, undo pops top [Source: epics.md#Story 2.2 AC3, AC4]
- SVG patterns for canvas (preview) [Source: architecture.md#SVG Patterns]
- Dev server command: `bun --hot packages/builder-react/index.ts` [Source: architecture.md#Development Workflow]
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess` [Source: tsconfig.base.json]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_none — implementation matched spec exactly on first run; 96/96 tests pass_

### Completion Notes List

- Updated `builder-react/package.json`: added `zustand: "catalog:"` and `@resort-map/types: "workspace:*"` to dependencies; ran `bun install` (4 packages installed)
- Created `src/store/mapStore.ts`: Zustand v4 `create<MapStore>()((set) => ...)` store with 11 actions — `setActiveTool`, `setSelectedItemId`, `undo`, `initMap`, `addPoi`, `removePoi`, `updatePoi`, `addNode`, `removeNode`, `addEdge`, `removeEdge`. All builder-core wrappers push previous `mapConfig` to `undoStack` (capped at 50) before mutation; `initMap` clears undoStack. `removeEdge` uses `"{from}:{to}"` synthetic key for edge deselection (pre-wired for Story 2.4).
- Created `src/App.tsx`: three-zone layout — Toolbar (top flex row), canvas+sidebar (bottom flex row). Canvas area is `flex: 1` and sidebar is `280px` fixed width.
- Created `src/components/Toolbar.tsx`: 4 tool buttons (Select, Place POI, Place Node, Draw Edge) + Undo button. Active tool highlighted with blue background; Undo disabled when `undoStack.length === 0`.
- Created `src/components/MapCanvas.tsx`: skeleton — shows placeholder text when `mapConfig` is null; shows empty div otherwise (canvas SVG added in Story 2.3).
- Created `src/components/Sidebar.tsx`: skeleton — shows "Select a POI or node to edit its properties" when `selectedItemId` is null (Story 2.5 fills editor UI).
- Updated `src/main.tsx`: replaced placeholder render with `<App />` via `createRoot`. No `import React` (react-jsx automatic runtime).
- Created `src/__tests__/mapStore.test.ts`: 25 tests covering all store actions, undo behavior, undo cap at 50, `selectedItemId` clearing on `removePoi`/`removeNode`/`removeEdge`.
- `bun test` workspace result: 96 pass, 0 fail across 5 files (63ms)
- AC1 (three-zone layout): implemented in App.tsx — toolbar top, canvas center, sidebar right
- AC2 (state shape): `mapConfig: MapConfig | null`, `activeTool: ActiveTool`, `selectedItemId: string | null`, `undoStack: MapConfig[]`
- AC3 (undo push + cap): `pushUndo()` helper uses `stack.slice(-(MAX_UNDO - 1))` to cap at 50
- AC4 (`undo()` pops): restores `undoStack[length - 1]!` as `mapConfig`
- AC5 (toolbar tool highlighting): active tool button uses blue background/white text; others use white/grey

### File List

- packages/builder-react/package.json (modified — added zustand + @resort-map/types)
- packages/builder-react/src/store/mapStore.ts (created)
- packages/builder-react/src/App.tsx (created)
- packages/builder-react/src/components/Toolbar.tsx (created)
- packages/builder-react/src/components/MapCanvas.tsx (created)
- packages/builder-react/src/components/Sidebar.tsx (created)
- packages/builder-react/src/main.tsx (modified — replaced placeholder with App)
- packages/builder-react/src/__tests__/mapStore.test.ts (created)

### Change Log

- Implemented Story 2.2: builder-react app skeleton with Zustand store, three-zone layout, toolbar, and skeleton components (Date: 2026-06-17)

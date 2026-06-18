---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 2.6: builder-react — Map Metadata Panel & .gwmap Export

Status: review

## Story

**As a** map author,
**I want** to set the background image URL, define the map center, enter the scale, and download the completed map as a `.gwmap` file,
**So that** I can produce a complete, valid file for consumption by view-react and view-react-native.

## Acceptance Criteria

1. **Given** the metadata panel **When** I enter a background image URL and press Enter or blur **Then** `mapConfig.map.backgroundImageUrl` is updated **And** the canvas attempts to load the new image (image URL input also serves as the "start a map" action when `mapConfig` is null)

2. **Given** I click the "Set Center" button **And** then click a point on the canvas **When** the click position is recorded **Then** `mapConfig.map.center` updates to that pixel coordinate **And** a green crosshair center marker renders on the canvas at that position

3. **Given** I enter a numeric value in the Scale (m/px) field and blur **When** the value is committed **Then** `mapConfig.map.scale` updates to the parsed float (NaN or ≤ 0 → no-op)

4. **Given** a valid `mapConfig` **When** I click "Export .gwmap" **Then** `serializeGwmap(mapConfig)` is called **And** a browser file download is triggered with filename `map.gwmap` and the serialized JSON as content **And** the downloaded file passes `validateGwmap` without error

5. **Given** `mapConfig` is null **When** I look at the "Export .gwmap" button **Then** it is disabled (no download triggered on click)

## Tasks / Subtasks

- [x] Add `updateMapMeta` store action to `mapStore.ts`
  - [x] Add `updateMapMeta: (patch: Partial<MapMeta>) => void` to `MapStore` interface
  - [x] Implement action: merges patch into `mapConfig.map`, pushes to undoStack, no-ops if `mapConfig` is null (AC: 1, 2, 3)
  - [x] Write RED tests in `mapStore.test.ts` first (confirm they fail), then verify GREEN after implementation
  - [x] Tests: updates `backgroundImageUrl`; updates `scale` + pushes undo; updates `center`; undo after update restores prior values; no-op when `mapConfig` is null (5 tests)

- [x] Add `'setCenter'` to `ActiveTool` type and update `MapCanvas.tsx`
  - [x] Add `'setCenter'` to the `ActiveTool` union in `mapStore.ts` (AC: 2)
  - [x] Add `updateMapMeta` and `setActiveTool` bindings to `MapCanvas.tsx`
  - [x] Add `'setCenter'` branch in `onSvgPointerDown`: call `updateMapMeta({ center: pos })` then `setActiveTool('select')` (AC: 2)
  - [x] Update cursor for `setCenter`: `'crosshair'` (same as `placePoi`/`placeNode`) (AC: 2)
  - [x] Add Escape reset for `setCenter` in the keydown `useEffect`: when `activeTool === 'setCenter'`, Escape calls `setActiveTool('select')` (AC: 2)
  - [x] Add green crosshair center marker in SVG render: a `<g pointerEvents="none">` with two crossing `<line>` and a `<circle>` at `mapConfig.map.center.{x,y}` (AC: 2)

- [x] Create `MapMetaPanel.tsx` with URL, Scale, Set Center, and Export fields (AC: 1, 2, 3, 4, 5)
  - [x] Read `mapConfig`, `activeTool`, `initMap`, `updateMapMeta`, `setActiveTool` from store
  - [x] URL field: local `urlDraft` state synced via `useEffect` on `mapConfig?.map.backgroundImageUrl`; blur/Enter → if `mapConfig` null call `initMap(...)`, else call `updateMapMeta({ backgroundImageUrl })` (AC: 1)
  - [x] Scale field: local `scaleDraft` state synced via `useEffect` on `mapConfig?.map.scale`; disabled when `mapConfig` null; blur → `parseFloat(draft)`, skip if NaN or ≤ 0 (AC: 3)
  - [x] Set Center button: disabled when `mapConfig` null; text changes to "Click on canvas…" when `activeTool === 'setCenter'`; click → `setActiveTool('setCenter')` (AC: 2)
  - [x] Export button: disabled when `mapConfig` null; click → `serializeGwmap(mapConfig)` + `triggerDownload('map.gwmap', json)` (AC: 4, 5)
  - [x] Inline `triggerDownload` helper using `Blob` + `URL.createObjectURL` + `<a>` click pattern (AC: 4)

- [x] Update `Sidebar.tsx` to mount `MapMetaPanel` at the top
  - [x] Import and render `<MapMetaPanel />` above the existing selected-item editor section
  - [x] Add a visual divider (`borderTop` style) between `MapMetaPanel` and the selected-item section (AC: n/a — layout)

- [x] Run `bun test` — all tests pass (106 existing + 5 new = 111 total); run `bunx tsc --noEmit` — clean

## Dev Notes

### Architecture Overview — What Exists Today

**`mapStore.ts` (current `MapStore` interface, abridged):**
```ts
export type ActiveTool = 'select' | 'placePoi' | 'placeNode' | 'drawEdge';

interface MapStore {
  mapConfig: MapConfig | null;
  activeTool: ActiveTool;
  selectedItemId: string | null;
  undoStack: MapConfig[];

  setActiveTool: (tool: ActiveTool) => void;
  setSelectedItemId: (id: string | null) => void;
  undo: () => void;
  initMap: (meta: MapMeta) => void;
  addPoi / removePoi / updatePoi / addNode / removeNode / addEdge / removeEdge;
  // updateMapMeta is MISSING — must be added by this story
}
```

**`MapMeta` type (from `@resort-map/types`):**
```ts
interface MapMeta {
  backgroundImageUrl: string;  // required
  center: Position;            // required — { x: number; y: number }
  scale: number;               // required — meters per pixel
}
```

**`App.tsx` layout (unchanged):**
```
<div flexDirection="column" height="100vh">
  <Toolbar />
  <div flex=1>
    <div flex=1><MapCanvas /></div>
    <Sidebar />
  </div>
</div>
```

**`Sidebar.tsx` (current, after Story 2.5):**
- Reads `mapConfig`, `selectedItemId`, `updatePoi` from store
- Shows `PoiEditor`, `NodeInfo`, or placeholder based on selection
- MapMetaPanel goes at the TOP of this component

**`MapCanvas.tsx` (current):**
- Returns "No map loaded" div when `mapConfig` is null (line 150–165)
- Returns "Loading map image…" div when `imageSize` is null (lines 167–182)
- SVG `onPointerDown` has `placePoi` and `placeNode` branches
- `activeTool` is read from store; `'setCenter'` needs a new branch
- `setActiveTool` is NOT currently bound in MapCanvas — must be added
- Escape keydown handler resets `edgeStartId` only — needs `setCenter` reset

**`serializeGwmap`** already exists in `packages/builder-core/src/serialization.ts`:
```ts
export function serializeGwmap(config: MapConfig): string {
  return JSON.stringify(config);
}
```
Exported from `@resort-map/builder-core`. Already tested, zero changes needed.

### New `updateMapMeta` Store Action

Add to `MapStore` interface:
```ts
updateMapMeta: (patch: Partial<MapMeta>) => void;
```

Implementation (add after `removeEdge` in the `create` call):
```ts
updateMapMeta: (patch) =>
  set((state) => {
    if (!state.mapConfig) return {};
    return {
      mapConfig: { ...state.mapConfig, map: { ...state.mapConfig.map, ...patch } },
      undoStack: pushUndo(state.undoStack, state.mapConfig),
    };
  }),
```

**Undo behavior:** Each `updateMapMeta` call pushes the current `mapConfig` to `undoStack`. Undo after changing `backgroundImageUrl` restores the old URL and the canvas reloads the previous image.

### Updated `ActiveTool` Type

```ts
export type ActiveTool = 'select' | 'placePoi' | 'placeNode' | 'drawEdge' | 'setCenter';
```

`Toolbar.tsx` is NOT affected — `TOOLS` array uses explicit `ActiveTool` values and doesn't include `'setCenter'`. TypeScript allows it because the union is wider.

### MapCanvas Modifications

**New store bindings (add to existing `const ... = useMapStore(...)` section):**
```ts
const updateMapMeta = useMapStore((s) => s.updateMapMeta);
const setActiveTool = useMapStore((s) => s.setActiveTool);
```

**`onSvgPointerDown` — add new branch AFTER `placeNode` branch:**
```ts
} else if (activeTool === 'setCenter') {
  updateMapMeta({ center: pos });
  setActiveTool('select');
}
```
This is inside the existing guard `if (!imageSize) return;` so `pos` is always valid when reached.

**Cursor update:**
```ts
const cursor = (() => {
  if (activeTool === 'placePoi' || activeTool === 'placeNode' || activeTool === 'setCenter') return 'crosshair';
  if (activeTool === 'drawEdge') return edgeStartId ? 'crosshair' : 'copy';
  return 'default';
})();
```

**Escape keydown update** (inside `onKeyDown`):
```ts
if (e.key === 'Escape') {
  setEdgeStartId(null);
  if (activeTool === 'setCenter') setActiveTool('select');
  return;
}
```
Note: `activeTool` must be in the `useEffect` dependency array (it's already there via `[selectedItemId, mapConfig, removePoi, removeNode, removeEdge]` — add `activeTool` and `setActiveTool`).

**Center marker in SVG render** (add after the `<image>` element, before edge renders):
```tsx
<g style={{ pointerEvents: 'none' }}>
  <line
    x1={mapConfig.map.center.x - 14}
    y1={mapConfig.map.center.y}
    x2={mapConfig.map.center.x + 14}
    y2={mapConfig.map.center.y}
    stroke="#059669"
    strokeWidth={2}
  />
  <line
    x1={mapConfig.map.center.x}
    y1={mapConfig.map.center.y - 14}
    x2={mapConfig.map.center.x}
    y2={mapConfig.map.center.y + 14}
    stroke="#059669"
    strokeWidth={2}
  />
  <circle
    cx={mapConfig.map.center.x}
    cy={mapConfig.map.center.y}
    r={5}
    fill="none"
    stroke="#059669"
    strokeWidth={2}
  />
</g>
```

`pointerEvents: 'none'` ensures the marker doesn't intercept clicks meant for the canvas or underlying items.

### `MapMetaPanel.tsx` — Complete Spec

**Location:** `packages/builder-react/src/components/MapMetaPanel.tsx`

**Imports:**
```ts
import { useEffect, useState } from 'react';
import type { MapMeta } from '@resort-map/types';
import { serializeGwmap } from '@resort-map/builder-core';
import { useMapStore } from '../store/mapStore.ts';
```

**Store bindings:**
```ts
const mapConfig = useMapStore((s) => s.mapConfig);
const activeTool = useMapStore((s) => s.activeTool);
const initMap = useMapStore((s) => s.initMap);
const updateMapMeta = useMapStore((s) => s.updateMapMeta);
const setActiveTool = useMapStore((s) => s.setActiveTool);
```

**Local state:**
```ts
const [urlDraft, setUrlDraft] = useState(mapConfig?.map.backgroundImageUrl ?? '');
const [scaleDraft, setScaleDraft] = useState(String(mapConfig?.map.scale ?? 1));
```

**Sync effects** (to handle external changes like Undo):
```ts
useEffect(() => {
  setUrlDraft(mapConfig?.map.backgroundImageUrl ?? '');
}, [mapConfig?.map.backgroundImageUrl]);

useEffect(() => {
  setScaleDraft(String(mapConfig?.map.scale ?? 1));
}, [mapConfig?.map.scale]);
```

**URL commit logic:**
```ts
function commitUrl(): void {
  const trimmed = urlDraft.trim();
  if (!trimmed) return;
  if (!mapConfig) {
    initMap({ backgroundImageUrl: trimmed, center: { x: 0, y: 0 }, scale: 1 });
  } else {
    updateMapMeta({ backgroundImageUrl: trimmed });
  }
}
```

**Scale commit logic:**
```ts
function commitScale(): void {
  if (!mapConfig) return;
  const parsed = parseFloat(scaleDraft);
  if (isNaN(parsed) || parsed <= 0) return;
  updateMapMeta({ scale: parsed });
}
```

**Set Center handler:**
```ts
function startSetCenter(): void {
  setActiveTool('setCenter');
}
const isSettingCenter = activeTool === 'setCenter';
```

**Export handler (inline `triggerDownload`):**
```ts
function exportGwmap(): void {
  if (!mapConfig) return;
  const json = serializeGwmap(mapConfig);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'map.gwmap';
  a.click();
  URL.revokeObjectURL(url);
}
```

**Full render:**
```tsx
export function MapMetaPanel(): JSX.Element {
  // ... (bindings + state + functions above)
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={sectionHeadingStyle}>Map Properties</h3>

      {/* Background Image URL */}
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Background Image URL</label>
        <input
          style={inputStyle}
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={commitUrl}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          placeholder="https://…/map.png"
        />
      </div>

      {/* Scale */}
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Scale (m/px)</label>
        <input
          style={inputStyle}
          type="number"
          step="0.01"
          min="0"
          value={scaleDraft}
          disabled={!mapConfig}
          onChange={(e) => setScaleDraft(e.target.value)}
          onBlur={commitScale}
        />
      </div>

      {/* Set Center */}
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Map Center</label>
        <button
          type="button"
          disabled={!mapConfig || isSettingCenter}
          onClick={startSetCenter}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '13px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: !mapConfig || isSettingCenter ? 'not-allowed' : 'pointer',
            background: isSettingCenter ? '#ecfdf5' : '#ffffff',
            color: isSettingCenter ? '#059669' : '#374151',
          }}
        >
          {isSettingCenter ? 'Click on canvas…' : 'Set Center'}
        </button>
      </div>

      {/* Export */}
      <div>
        <button
          type="button"
          disabled={!mapConfig}
          onClick={exportGwmap}
          style={{
            width: '100%',
            padding: '7px 10px',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            cursor: !mapConfig ? 'not-allowed' : 'pointer',
            background: !mapConfig ? '#e5e7eb' : '#2563eb',
            color: !mapConfig ? '#9ca3af' : '#ffffff',
          }}
        >
          Export .gwmap
        </button>
      </div>
    </div>
  );
}
```

**Style constants (at file level):**
```ts
const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  margin: '0 0 10px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '13px',
  outline: 'none',
};
```

### Updated `Sidebar.tsx`

Add `MapMetaPanel` at the top, with a visual divider between it and the selected-item section:

```tsx
import { MapMetaPanel } from './MapMetaPanel.tsx';

export function Sidebar(): JSX.Element {
  // ... existing store bindings + selectedPoi/selectedNode detection ...

  return (
    <div style={{ width: '280px', borderLeft: '1px solid #d1d5db', padding: '16px',
                  overflowY: 'auto', background: '#fafafa', flexShrink: 0 }}>
      <MapMetaPanel />
      <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: '16px' }} />
      {selectedPoi ? (
        <PoiEditor key={selectedPoi.id} poi={selectedPoi} updatePoi={updatePoi} />
      ) : selectedNode ? (
        <NodeInfo node={selectedNode} />
      ) : (
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
          Select a POI or node to edit its properties
        </p>
      )}
    </div>
  );
}
```

Only the import and the `<MapMetaPanel />` + divider are new. All existing `PoiEditor`, `NodeInfo`, placeholder, style constants remain unchanged.

### New Tests for `mapStore.test.ts`

Add a new `describe` block after the existing tests:

```ts
describe('updateMapMeta', () => {
  beforeEach(() => {
    useMapStore.setState({
      mapConfig: null,
      undoStack: [],
      activeTool: 'select',
      selectedItemId: null,
    });
  });

  const baseMeta: MapMeta = {
    backgroundImageUrl: 'http://example.com/map.png',
    center: { x: 0, y: 0 },
    scale: 1,
  };

  test('updates backgroundImageUrl on existing mapConfig', () => {
    useMapStore.getState().initMap(baseMeta);
    useMapStore.getState().updateMapMeta({ backgroundImageUrl: 'http://new.jpg' });
    expect(useMapStore.getState().mapConfig!.map.backgroundImageUrl).toBe('http://new.jpg');
  });

  test('updates scale and pushes to undoStack', () => {
    useMapStore.getState().initMap(baseMeta);
    useMapStore.getState().updateMapMeta({ scale: 0.5 });
    expect(useMapStore.getState().mapConfig!.map.scale).toBe(0.5);
    expect(useMapStore.getState().undoStack.length).toBe(1);
  });

  test('updates center', () => {
    useMapStore.getState().initMap(baseMeta);
    useMapStore.getState().updateMapMeta({ center: { x: 400, y: 300 } });
    expect(useMapStore.getState().mapConfig!.map.center).toEqual({ x: 400, y: 300 });
  });

  test('undo after updateMapMeta restores prior values', () => {
    useMapStore.getState().initMap(baseMeta);
    useMapStore.getState().updateMapMeta({ scale: 2 });
    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig!.map.scale).toBe(1);
  });

  test('does nothing when mapConfig is null', () => {
    useMapStore.getState().updateMapMeta({ backgroundImageUrl: 'http://x.jpg' });
    expect(useMapStore.getState().mapConfig).toBeNull();
    expect(useMapStore.getState().undoStack.length).toBe(0);
  });
});
```

Import `MapMeta` at the top of the test file (type-only):
```ts
import type { MapMeta } from '@resort-map/types';
```

### TypeScript Compliance

- `verbatimModuleSyntax: true` → `import type { MapMeta }` everywhere `MapMeta` is only used as a type
- `noUncheckedIndexedAccess: true` → no array subscripts in MapMetaPanel; `mapConfig?.map.center` uses optional chaining safely
- `React.CSSProperties` → available globally via `"types": ["bun", "react"]` in builder-react tsconfig
- Explicit `: JSX.Element` return type on `MapMetaPanel`
- Props interfaces above component functions (MapMetaPanel has no props, so no interface needed)
- Relative imports with `.ts`/`.tsx` suffix

### `initMap` Default Center and Scale

When the user enters the first URL with `mapConfig === null`:
```ts
initMap({ backgroundImageUrl: trimmed, center: { x: 0, y: 0 }, scale: 1 });
```
- `center: { x: 0, y: 0 }` → center marker appears at top-left corner. User then clicks "Set Center" to move it.
- `scale: 1` → 1 m/px default. User then edits the Scale field.

These defaults allow the canvas to load immediately without blocking on center/scale configuration.

### `serializeGwmap` → `parseGwmap` Round-Trip (AC4 verification)

AC4 states the exported file "passes `validateGwmap` without error." Since:
1. `serializeGwmap(config)` = `JSON.stringify(config)`
2. The store always holds a valid `MapConfig` (enforced by the typed store actions)
3. `validateGwmap(JSON.parse(JSON.stringify(config)))` must pass

This is guaranteed by design — no additional validation needed in the component itself.

### `useEffect` Dependency Arrays

**URL sync effect:** `[mapConfig?.map.backgroundImageUrl]`
**Scale sync effect:** `[mapConfig?.map.scale]`

Both effects will run on mount (with the initial store values) and whenever the store value changes (e.g., after Undo). This prevents the draft from showing stale values after undo while the user isn't editing.

### Files to Create / Modify

```
packages/builder-react/
└── src/
    ├── store/
    │   └── mapStore.ts                  ← UPDATE: add updateMapMeta to interface + impl
    ├── components/
    │   ├── MapCanvas.tsx               ← UPDATE: setCenter tool, center marker, Escape fix
    │   ├── MapMetaPanel.tsx            ← CREATE: URL, Scale, Set Center, Export
    │   └── Sidebar.tsx                 ← UPDATE: add MapMetaPanel import + render at top
    └── __tests__/
        └── mapStore.test.ts            ← UPDATE: add updateMapMeta describe block (5 tests)
```

### Previous Story Learnings

From Stories 2.4 and 2.5:
- **`useMapStore.getState()`** for sync-after-dispatch reads (used in MapCanvas after `addPoi`/`addNode`). Not needed in MapMetaPanel — store updates happen in event handlers, no sync reads needed.
- **`useMapStore.setState()`** is used in MapCanvas for drag-move (direct state mutation during pointer capture). Not used in Story 2.6.
- **Style objects as module-level constants** (`labelStyle`, `inputStyle`, etc.) — follow the same pattern established in Sidebar.tsx. MapMetaPanel can define its own or share the same constant names (they're file-scoped, no conflict).
- **`verbatimModuleSyntax: true`** burned developers before — enforce `import type` for all type-only imports.
- **`key={poi.id}` for PoiEditor** — MapMetaPanel doesn't need this pattern since there's only one set of map metadata.
- **No test renderer for React components** — `bun test` runs in a non-DOM environment. Only `mapStore.ts` logic is testable. UI components are not unit-tested.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RED phase confirmed: 5 `updateMapMeta` tests failed before store implementation (expected)
- GREEN: all 33 store tests pass after adding `updateMapMeta` action
- tsc --noEmit clean on builder-react after all changes
- Full workspace suite: 111 pass, 0 fail — no regressions

### Completion Notes List

- Added `'setCenter'` to `ActiveTool` union type — Toolbar.tsx unaffected (TOOLS array doesn't include it)
- Added `updateMapMeta` store action: spreads patch into `mapConfig.map`, pushes prior config to undoStack, no-ops when `mapConfig` is null
- MapCanvas: added `setActiveTool` + `updateMapMeta` bindings; new `setCenter` branch in `onSvgPointerDown` records center click and auto-reverts to `select`; Escape now also resets `setCenter` mode; cursor is `crosshair` for `setCenter`
- Center marker: green crosshair `<g pointerEvents="none">` renders at `mapConfig.map.center` coordinates inside the SVG, always visible once a map is loaded
- `MapMetaPanel.tsx` created: URL field handles both `initMap` (when null) and `updateMapMeta` (when exists); `useEffect` syncs URL/scale drafts on external changes (undo); scale commits only valid positive floats
- Export uses `Blob` + `URL.createObjectURL` + `<a>` click inline pattern — no dependencies added
- `Sidebar.tsx` updated with `<MapMetaPanel />` + divider at top; all existing PoiEditor/NodeInfo/placeholder code untouched
- 5 new `updateMapMeta` tests cover: url update, scale update + undo push, center update, undo restores prior values, no-op on null mapConfig

### File List

- `packages/builder-react/src/store/mapStore.ts` (modified)
- `packages/builder-react/src/__tests__/mapStore.test.ts` (modified)
- `packages/builder-react/src/components/MapCanvas.tsx` (modified)
- `packages/builder-react/src/components/MapMetaPanel.tsx` (created)
- `packages/builder-react/src/components/Sidebar.tsx` (modified)

### Change Log

- 2026-06-17: Implement map metadata panel — backgroundImageUrl/scale/center editing, setCenter canvas pick mode, export .gwmap download, green crosshair center marker on canvas

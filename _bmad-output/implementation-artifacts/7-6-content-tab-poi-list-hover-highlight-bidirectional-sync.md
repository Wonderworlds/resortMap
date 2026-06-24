---
baseline_commit: f98388ea017f3bc6896c6d3ec047d7f40c567517
---

# Story 7.6: Content Tab — POI List with Hover Highlight and Bidirectional Sync

Status: review

## Story

As a map builder,
I want the Content tab to show a scrollable list of all placed POIs with hover map highlight and click-to-select,
So that I can survey, locate, and edit any POI without hunting for it on the canvas.

## Acceptance Criteria

1. **Given** the Content Tab is active and the map has POIs, **when** the POI List renders, **then** one row per POI appears in insertion order, each row shows a 24×24px icon (POI_ICONS registry by `poi.icon` key, or red circle SVG fallback), POI label (ellipsis-truncated if overflowing), and up to 3 tag chips with a `+N` chip if there are more than 3 tags, and the list is scrollable when rows exceed the panel height.

2. **Given** the Content Tab is active and no POIs are placed, **when** the list area renders, **then** "No POIs placed yet." is centered in the tab content area.

3. **Given** the user hovers a POI row, **when** the mouse is over the row, **then** `highlightedPoiId` in the Zustand store is set to that POI's id and the MapCanvas renders a distinct teal highlight ring around the matching POI pin (visible over the normal pin).

4. **Given** the user moves the mouse off a row, **when** the mouse-leave event fires, **then** `highlightedPoiId` is set to `null` and the highlight ring disappears from the canvas.

5. **Given** the user clicks a POI row, **when** the click occurs, **then** `selectedItemId` is set to that POI's id (the Right Panel opens automatically), and the MapCanvas best-effort pans to make the selected pin visible in the viewport.

6. **Given** the user clicks a POI pin on the canvas while the Content Tab is active, **when** `selectedItemId` changes to that POI's id, **then** the POI List smooth-scrolls so the corresponding row becomes visible. Clicking away to deselect does NOT scroll the list.

7. **Given** a POI is renamed or tags are changed via the Right Panel, **when** the change is committed, **then** the corresponding POI List row updates reactively (Zustand subscription is automatic).

8. **Given** `bun test` after this story, **then** all existing tests pass and new store tests for `highlightedPoiId` and `panTargetPoiId` pass.

## Tasks / Subtasks

- [x] Task 1: Extend the Zustand store in `mapStore.ts` with `highlightedPoiId` and `panTargetPoiId` (AC: 3, 4, 5)
  - [x] 1.1 Add `highlightedPoiId: string | null` field to `MapStore` interface
  - [x] 1.2 Add `setHighlightedPoiId: (id: string | null) => void` action to `MapStore` interface
  - [x] 1.3 Add `panTargetPoiId: string | null` field to `MapStore` interface
  - [x] 1.4 Add `setPanTargetPoiId: (id: string | null) => void` action to `MapStore` interface
  - [x] 1.5 Initialize both fields to `null` in the `create()` call
  - [x] 1.6 Implement both setter actions: `setHighlightedPoiId: (id) => set({ highlightedPoiId: id })` and `setPanTargetPoiId: (id) => set({ panTargetPoiId: id })`
  - [x] 1.7 Update `mapStore.test.ts` `beforeEach` to reset `highlightedPoiId: null` and `panTargetPoiId: null` alongside existing fields
  - [x] 1.8 Add `describe('highlightedPoiId')` block with tests for initial state and `setHighlightedPoiId` (set to id, set to null)
  - [x] 1.9 Add `describe('panTargetPoiId')` block with tests for initial state and `setPanTargetPoiId` (set to id, set to null)

- [x] Task 2: Add highlight ring + pan-to effect to `MapCanvas.tsx` (AC: 3, 4, 5)
  - [x] 2.1 Subscribe to `highlightedPoiId` from `useMapStore`: `const highlightedPoiId = useMapStore((s) => s.highlightedPoiId)`
  - [x] 2.2 Subscribe to `panTargetPoiId` and `setPanTargetPoiId` from `useMapStore`
  - [x] 2.3 Add `isHighlighted` prop to `PoiPinProps` interface
  - [x] 2.4 In `PoiPin`, render a highlight ring when `isHighlighted` is true: `<circle cx={x} cy={y} r={16} fill="none" stroke="#0891b2" strokeWidth={2.5} />` (teal ring, placed before the pin circle so it doesn't obscure the pin)
  - [x] 2.5 Pass `isHighlighted={poi.id === highlightedPoiId}` to each `<PoiPin>` in the render list
  - [x] 2.6 Add `useEffect` for pan-to: when `panTargetPoiId` changes to non-null, find the POI in `mapConfig.pois`, compute centered view (using `viewStateRef.current.scale` and `imageSize`), call `setViewState` to center on the POI position, then call `setPanTargetPoiId(null)`. Guard: if `imageSize` or `mapConfig` are null, just clear `panTargetPoiId`. Dependencies: `[panTargetPoiId, imageSize, mapConfig, setPanTargetPoiId]`

- [x] Task 3: Create `packages/builder-react/src/components/PoiList.tsx` (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 3.1 Import `useEffect`, `useRef` from `'react'`
  - [x] 3.2 Import MUI: `Box`, `Typography`, `Chip`
  - [x] 3.3 Import `POI_ICONS` from `'@resort-map/poi-icons'`
  - [x] 3.4 Import `useMapStore` from `'../store/mapStore'`
  - [x] 3.5 Import `type { POI }` from `'@resort-map/types'`
  - [x] 3.6 Declare `const MAX_VISIBLE_TAGS = 3`
  - [x] 3.7 Subscribe to `mapConfig`, `selectedItemId`, `setSelectedItemId`, `setHighlightedPoiId`, `setPanTargetPoiId` from `useMapStore`
  - [x] 3.8 Create `rowRefs = useRef<Map<string, HTMLElement>>(new Map())` for bidirectional scroll
  - [x] 3.9 Add `useEffect` on `[selectedItemId]`: if `selectedItemId` is non-null, look it up in `rowRefs.current` and call `el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
  - [x] 3.10 Implement `handleRowClick(poi: POI)`: calls `setSelectedItemId(poi.id)` then `setPanTargetPoiId(poi.id)` (AC 5)
  - [x] 3.11 Render empty state when `pois.length === 0`: centered `<Typography variant="body2" color="text.secondary">No POIs placed yet.</Typography>` (AC 2)
  - [x] 3.12 Render scrollable list `<Box sx={{ overflow: 'auto', flex: 1 }}>` containing one row per POI
  - [x] 3.13 Each row with hover, click, mouse-enter/leave handlers and selection styling
  - [x] 3.14 Icon cell (24×24): POI_ICONS lookup with red circle SVG fallback
  - [x] 3.15 Label cell with ellipsis truncation
  - [x] 3.16 Tag chips: up to 3 visible, `+N` overflow chip
  - [x] 3.17 Row ref callback for Map-based scroll tracking
  - [x] 3.18 Export `PoiList` as named export

- [x] Task 4: Update `LeftPanel.tsx` to use `PoiList` in Content Tab (AC: 1, 2)
  - [x] 4.1 Add `import { PoiList } from './PoiList'`
  - [x] 4.2 Replace the Content Tab placeholder `<Box sx={{ flex: 1 }} />` with `<PoiList />`

- [x] Task 5: Run full test suite (AC: 8)
  - [x] 5.1 Run `bun test` from workspace root — 282 tests pass (276 existing + 6 new store tests), zero regressions

## Dev Notes

### Files to Create (NEW)

| File | Description |
|------|-------------|
| `packages/builder-react/src/components/PoiList.tsx` | Scrollable POI list with hover highlight, row click, and bidirectional scroll sync |

### Files to Modify (UPDATE — read before touching)

| File | Change |
|------|--------|
| `packages/builder-react/src/store/mapStore.ts` | Add `highlightedPoiId`, `setHighlightedPoiId`, `panTargetPoiId`, `setPanTargetPoiId` |
| `packages/builder-react/src/components/MapCanvas.tsx` | Subscribe to `highlightedPoiId` + `panTargetPoiId`; add `isHighlighted` to PoiPin; add pan-to effect |
| `packages/builder-react/src/components/LeftPanel.tsx` | Replace Content Tab placeholder with `<PoiList />` |
| `packages/builder-react/src/__tests__/mapStore.test.ts` | Update beforeEach + add new describe blocks |

### `mapStore.ts` — what to add

The store currently has these fields (read the file before touching):
```ts
interface MapStore {
  mapConfig: MapConfig | null;
  activeTool: ActiveTool;
  selectedItemId: string | null;
  undoStack: MapConfig[];
  redoStack: MapConfig[];
  setActiveTool: ...;
  setSelectedItemId: ...;
  // ... many more actions ...
  savedMapConfig: MapConfig | null;
  setSavedMapConfig: ...;
}
```

**Add** (place `highlightedPoiId` and `panTargetPoiId` after `savedMapConfig` for minimal diff):
```ts
interface MapStore {
  // ... existing ...
  savedMapConfig: MapConfig | null;
  setSavedMapConfig: (config: MapConfig | null) => void;
  highlightedPoiId: string | null;
  setHighlightedPoiId: (id: string | null) => void;
  panTargetPoiId: string | null;
  setPanTargetPoiId: (id: string | null) => void;
}
```

In the `create()` initial values (after `savedMapConfig: null`):
```ts
highlightedPoiId: null,
panTargetPoiId: null,
```

In the `create()` actions (after `setSavedMapConfig`):
```ts
setHighlightedPoiId: (id) => set({ highlightedPoiId: id }),
setPanTargetPoiId: (id) => set({ panTargetPoiId: id }),
```

### `MapCanvas.tsx` — exact changes

**New store subscriptions** (add after `setActiveTool` subscription):
```ts
const highlightedPoiId = useMapStore((s) => s.highlightedPoiId);
const panTargetPoiId = useMapStore((s) => s.panTargetPoiId);
const setPanTargetPoiId = useMapStore((s) => s.setPanTargetPoiId);
```

**Pan-to effect** (add after the existing `useEffect` for `activeTool`):
```ts
useEffect(() => {
  if (!panTargetPoiId) return;
  if (!imageSize || !mapConfig) {
    setPanTargetPoiId(null);
    return;
  }
  const poi = mapConfig.pois.find((p) => p.id === panTargetPoiId);
  setPanTargetPoiId(null);
  if (!poi) return;
  const vs = viewStateRef.current;
  const viewW = imageSize.w / vs.scale;
  const viewH = imageSize.h / vs.scale;
  setViewState((prev) => ({
    ...prev,
    x: poi.position.x - viewW / 2,
    y: poi.position.y - viewH / 2,
  }));
}, [panTargetPoiId, imageSize, mapConfig, setPanTargetPoiId]);
```

Note: `viewStateRef.current` is used (not `viewState`) because `viewState` inside the effect closure would be stale. `viewStateRef` is already maintained as `viewStateRef.current = viewState` just before the effects.

**Updated PoiPin render call** (pass `isHighlighted`):
```tsx
{mapConfig.pois.map((poi) => (
  <PoiPin
    key={poi.id}
    poi={poi}
    isSelected={poi.id === selectedItemId}
    isHighlighted={poi.id === highlightedPoiId}
    isChainEnd={streetLastNodeId !== null && streetLastNodeId === poi.nodeId}
    onPointerDown={(e) => onPinPointerDown(e, poi.id)}
  />
))}
```

**Updated `PoiPinProps` interface**:
```ts
interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  isHighlighted: boolean;
  isChainEnd: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}
```

**Updated `PoiPin` function** — add highlight ring BEFORE the main circle so it renders underneath:
```tsx
function PoiPin({ poi, isSelected, isHighlighted, isChainEnd, onPointerDown }: PoiPinProps): JSX.Element {
  const { x, y } = poi.position;
  return (
    <g data-poi-id={poi.id} onPointerDown={onPointerDown} cursor="pointer">
      {isChainEnd && (
        <circle cx={x} cy={y} r={15} fill="none" stroke="#f59e0b" strokeWidth={3} />
      )}
      {isHighlighted && (
        <circle cx={x} cy={y} r={16} fill="none" stroke="#0891b2" strokeWidth={2.5} />
      )}
      <circle
        cx={x} cy={y} r={10}
        fill={isSelected ? '#2563eb' : '#ef4444'}
        stroke={isSelected ? '#1d4ed8' : '#b91c1c'}
        strokeWidth={poi.locked ? 3 : 2}
        strokeDasharray={poi.locked ? '4 2' : undefined}
      />
    </g>
  );
}
```

Note: Highlight ring uses `stroke="#0891b2"` (cyan-600/teal — matches primary theme). Placed at `r=16` outside the pin circle (`r=10`) and `isChainEnd` ring (`r=15`). This renders visually distinct from the chain-end amber ring, but they can coexist (unlikely in practice since Content Tab forces `activeTool='select'`).

### `PoiList.tsx` — complete reference implementation

```tsx
import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { POI_ICONS } from '@resort-map/poi-icons';
import { useMapStore } from '../store/mapStore';
import type { POI } from '@resort-map/types';

const MAX_VISIBLE_TAGS = 3;

export function PoiList(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const setSelectedItemId = useMapStore((s) => s.setSelectedItemId);
  const setHighlightedPoiId = useMapStore((s) => s.setHighlightedPoiId);
  const setPanTargetPoiId = useMapStore((s) => s.setPanTargetPoiId);

  const pois: POI[] = mapConfig?.pois ?? [];
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!selectedItemId) return;
    const el = rowRefs.current.get(selectedItemId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedItemId]);

  function handleRowClick(poi: POI): void {
    setSelectedItemId(poi.id);
    setPanTargetPoiId(poi.id);
  }

  if (pois.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, p: 2 }}>
        <Typography variant="body2" color="text.secondary">No POIs placed yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflow: 'auto', flex: 1 }}>
      {pois.map((poi) => {
        const iconEntry = poi.icon ? POI_ICONS[poi.icon] : null;
        const IconCmp = iconEntry?.Icon;
        const visibleTags = poi.tags.slice(0, MAX_VISIBLE_TAGS);
        const extraTagCount = poi.tags.length - MAX_VISIBLE_TAGS;
        const isSelected = poi.id === selectedItemId;

        return (
          <Box
            key={poi.id}
            ref={(el: HTMLDivElement | null) => {
              if (el) rowRefs.current.set(poi.id, el);
              else rowRefs.current.delete(poi.id);
            }}
            onClick={() => handleRowClick(poi)}
            onMouseEnter={() => setHighlightedPoiId(poi.id)}
            onMouseLeave={() => setHighlightedPoiId(null)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              cursor: 'pointer',
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flexShrink: 0, width: 24, height: 24 }}>
              {IconCmp
                ? <IconCmp width={24} height={24} />
                : <svg width={24} height={24}><circle cx={12} cy={12} r={10} fill="#ef4444" /></svg>
              }
            </Box>

            <Typography
              variant="body2"
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {poi.label}
            </Typography>

            {poi.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                {visibleTags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: 10 }} />
                ))}
                {extraTagCount > 0 && (
                  <Chip label={`+${extraTagCount}`} size="small" sx={{ height: 18, fontSize: 10 }} />
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
```

### `LeftPanel.tsx` — what changes

Current Content Tab body (line 127-129):
```tsx
{activeTab === 1 && (
  <Box sx={{ flex: 1 }} />
)}
```

Replace with:
```tsx
{activeTab === 1 && <PoiList />}
```

And add import at top of LeftPanel.tsx:
```ts
import { PoiList } from './PoiList';
```

### `mapStore.test.ts` — what to update

1. **`beforeEach`** — add the two new fields to prevent state leaking between tests:
```ts
beforeEach(() => {
  useMapStore.setState({
    mapConfig: null,
    activeTool: 'select',
    selectedItemId: null,
    undoStack: [],
    redoStack: [],
    savedMapConfig: null,
    highlightedPoiId: null,
    panTargetPoiId: null,
  });
});
```

2. **New describe blocks** (add after the `savedMapConfig` describe at the end of the file):
```ts
describe('highlightedPoiId', () => {
  test('initial state is null', () => {
    expect(useMapStore.getState().highlightedPoiId).toBeNull();
  });

  test('setHighlightedPoiId sets an id', () => {
    useMapStore.getState().setHighlightedPoiId('poi-abc');
    expect(useMapStore.getState().highlightedPoiId).toBe('poi-abc');
  });

  test('setHighlightedPoiId(null) clears the id', () => {
    useMapStore.getState().setHighlightedPoiId('poi-abc');
    useMapStore.getState().setHighlightedPoiId(null);
    expect(useMapStore.getState().highlightedPoiId).toBeNull();
  });
});

describe('panTargetPoiId', () => {
  test('initial state is null', () => {
    expect(useMapStore.getState().panTargetPoiId).toBeNull();
  });

  test('setPanTargetPoiId sets an id', () => {
    useMapStore.getState().setPanTargetPoiId('poi-xyz');
    expect(useMapStore.getState().panTargetPoiId).toBe('poi-xyz');
  });

  test('setPanTargetPoiId(null) clears the id', () => {
    useMapStore.getState().setPanTargetPoiId('poi-xyz');
    useMapStore.getState().setPanTargetPoiId(null);
    expect(useMapStore.getState().panTargetPoiId).toBeNull();
  });
});
```

### Critical Implementation Notes

**`POI_ICONS` key fallback**: `POI_ICONS[poi.icon]` may be undefined if the key doesn't match any registered icon (the icon registry is a `Record<string, PoiIconEntry>`). Always use optional chaining: `poi.icon ? POI_ICONS[poi.icon] : null`. The null result triggers the red circle SVG fallback.

**PoiIconEntry.Icon accepts SVGProps**: The `Icon: ComponentType<SVGProps<SVGSVGElement>>` — pass `width` and `height` as props: `<IconCmp width={24} height={24} />`. Do NOT wrap in a Box or set styles on the component itself; the width/height props propagate directly to the SVG element.

**`rowRefs.current.Map`**: Using a `Map<string, HTMLElement>` rather than an array of refs handles the case where POIs are added/removed mid-render. The ref callback pattern (`ref={(el) => { if (el) rowRefs.current.set(poi.id, el); else rowRefs.current.delete(poi.id); }}`) works with React's lifecycle: called with the element on mount, called with `null` on unmount.

**Scrolling the right element**: `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` — `block: 'nearest'` means the browser will scroll the minimum amount needed to make the element visible; it won't scroll if the row is already fully visible. This is the correct behavior for AC 6 (clicking away to deselect must not scroll — `selectedItemId` becomes null → early return in the `useEffect`, so no scroll fires).

**Pan-to uses `viewStateRef`**: The pan-to `useEffect` reads `viewStateRef.current` (not `viewState` from closure) because the viewState could have changed since the last render. `viewStateRef` is kept current with `viewStateRef.current = viewState` at the top of `MapCanvas` (this already exists in the code). This avoids stale closure bugs.

**Pan-to clears `panTargetPoiId` immediately**: The effect finds the POI, calls `setPanTargetPoiId(null)` to clear, then sets the view. This prevents the effect from retriggering. If the POI isn't found, we still clear to avoid getting stuck.

**No `import type` for `POI_ICONS`**: `POI_ICONS` is a runtime value (used in JSX), not a type-only import. Use `import { POI_ICONS } from '@resort-map/poi-icons'`. Do use `import type { POI }` from `@resort-map/types` (type-only per architecture convention).

**Content Tab container**: `LeftPanel`'s Content Tab content area is `<Box sx={{ flex: 1, overflow: 'auto' }}>`. The `PoiList` outer `<Box sx={{ overflow: 'auto', flex: 1 }}>` inherits flex from its parent. This allows the list to scroll independently.

**No new npm dependencies**: `@resort-map/poi-icons` (workspace package already in builder-react dependencies), `@mui/material` (Chip is already used in RightPanel). No new packages needed.

**`PoiList` has no props interface**: All data comes from Zustand. No `PoiListProps` needed (consistent with `CenterCanvas`, `AppBar`, `RightPanel` patterns).

**Return type**: `export function PoiList(): JSX.Element` — explicit return type per architecture convention.

### Architecture Compliance

- Named export `PoiList` ✓ (no default exports)
- `import type { POI }` for type-only import ✓
- Explicit `JSX.Element` return type ✓
- MUI components from sub-packages (Box from `@mui/material/Box`, etc.) ✓
- No new npm packages ✓
- `useMapStore` selector per-field subscriptions ✓ (not full-store subscription)
- No direct `useMapStore.setState` in components ✓ (action methods only)

### Test Approach

New tests: 6 unit tests for `highlightedPoiId` and `panTargetPoiId` in `mapStore.test.ts`. Total test count after this story: 276 + 6 = 282.

No component tests (consistent with previous stories' approach).

Update `beforeEach` to include the two new store fields so tests are fully isolated.

No new test files.

### What NOT to Change

- `MapCanvas.tsx` pan/zoom logic beyond the pan-to effect — all existing handlers, refs, and view state logic remain unchanged
- `LeftPanel.tsx` tab structure, Tools tab content, `prevToolRef` logic — only the Content Tab body changes
- `RightPanel.tsx` — untouched; it already opens when `selectedItemId !== null`
- `App.tsx`, `AppBar.tsx`, `CenterCanvas.tsx` — untouched
- `mapStore.ts` all existing actions — only add new fields/actions at the end

### Context from Previous Stories

- **7.5 baseline**: 276 tests; `CenterCanvas` wraps `MapCanvas` with `display: none` toggle
- **`LeftPanel` Content Tab placeholder**: `activeTab === 1 && <Box sx={{ flex: 1 }} />` at lines 127-129 — this is the ONLY change in LeftPanel
- **`MapCanvas` `PoiPin`**: Renders at `r=10` with select ring at `r=15` (isChainEnd). Highlight ring at `r=16` is outside both.
- **`POI_ICONS` already imported in `RightPanel`**: Same import pattern for `PoiList` — `import { POI_ICONS } from '@resort-map/poi-icons'`
- **`selectedItemId` drives Right Panel opening**: `const open = selectedItemId !== null` in RightPanel.tsx — setting `selectedItemId` from PoiList click automatically opens the panel (AC 5 satisfied for free)
- **Store `beforeEach` pattern**: Reset all tracked fields explicitly. The test at line 12-20 must be updated to include both new fields.
- **`viewStateRef` exists**: Already maintained in MapCanvas as `viewStateRef.current = viewState` just before effects. Pan-to effect can safely read it.
- **No `panTargetPoiId` in view-react**: This is purely a builder-react store concern, never touches the viewer package.

### References

- `packages/builder-react/src/components/PoiList.tsx` — NEW file (primary implementation)
- `packages/builder-react/src/store/mapStore.ts` — store extension
- `packages/builder-react/src/components/MapCanvas.tsx` — highlight ring + pan-to effect
- `packages/builder-react/src/components/LeftPanel.tsx` — Content Tab wiring
- `packages/builder-react/src/__tests__/mapStore.test.ts` — store tests
- PRD FR-9, FR-10, FR-11, FR-12, NFR-2: `_bmad-output/planning-artifacts/epics.md` (lines 31-34, 48)
- Story 7.5 completion notes: `_bmad-output/implementation-artifacts/7-5-center-canvas-mode-toggle-bar-and-preview-mode.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Extended `mapStore.ts` with `highlightedPoiId: string | null` + `setHighlightedPoiId` and `panTargetPoiId: string | null` + `setPanTargetPoiId`. Initialized both to `null`.
- Updated `mapStore.test.ts`: added both new fields to `beforeEach` reset, added 6 new tests across two describe blocks (3 per field). Total store tests: 49 (was 43).
- Updated `MapCanvas.tsx`: subscribed to `highlightedPoiId` and `panTargetPoiId`/`setPanTargetPoiId`; added pan-to `useEffect` using `viewStateRef.current` to avoid stale closure; added `isHighlighted` prop to `PoiPinProps` and `PoiPin` function; renders a teal ring (`stroke="#0891b2"`, `r=16`) when `isHighlighted=true`; passes `isHighlighted={poi.id === highlightedPoiId}` to each PoiPin.
- Created `PoiList.tsx`: scrollable POI list with per-row hover handlers (`setHighlightedPoiId`), click handler (`setSelectedItemId` + `setPanTargetPoiId`), Map-based `rowRefs` for `scrollIntoView` bidirectional sync, icon rendering (POI_ICONS lookup + red SVG circle fallback), truncated label, up to 3 tag chips with `+N` overflow chip, empty state "No POIs placed yet."
- Updated `LeftPanel.tsx`: added `PoiList` import; replaced Content Tab placeholder `<Box sx={{ flex: 1 }} />` with `<PoiList />`.
- Full test suite: 282/282 pass, zero regressions (`bun test`, 550ms).

### File List

- `packages/builder-react/src/store/mapStore.ts` (modified — added `highlightedPoiId`, `setHighlightedPoiId`, `panTargetPoiId`, `setPanTargetPoiId`)
- `packages/builder-react/src/__tests__/mapStore.test.ts` (modified — updated `beforeEach`, added 6 new tests)
- `packages/builder-react/src/components/MapCanvas.tsx` (modified — highlight ring, pan-to effect, new store subscriptions)
- `packages/builder-react/src/components/PoiList.tsx` (created)
- `packages/builder-react/src/components/LeftPanel.tsx` (modified — `PoiList` import and Content Tab wiring)

## Change Log

- 2026-06-24: Implemented story 7-6 — added `highlightedPoiId`/`panTargetPoiId` to store, highlight ring to MapCanvas, created PoiList component, wired Content Tab in LeftPanel. 282 tests pass.

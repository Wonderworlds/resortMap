---
baseline_commit: f98388ea017f3bc6896c6d3ec047d7f40c567517
---

# Story 7.5: Center Canvas — Mode Toggle Bar + Preview Mode

Status: review

## Story

As a map builder,
I want a Builder/Preview toggle above the canvas with Preview mode showing the live viewer,
So that I can instantly see the visitor experience without leaving the tool.

## Acceptance Criteria

1. **Given** the app opens (default Builder mode), **when** the Mode Toggle Bar renders, **then** "Builder" segment is active (teal fill) and "Preview" is inactive, and the existing `MapCanvas` renders below with all existing functionality intact.

2. **Given** the user clicks the "Preview" segment, **when** the mode switches, **then** the MapCanvas is visually replaced by `<MapViewer source={mapConfig} preview={true} />` from `@resort-map/view-react`, showing the current map background and all placed POI pins.

3. **Given** the user switches back to "Builder", **when** the mode switches, **then** the MapCanvas is restored with all state intact: POIs, nodes, edges, and zoom/pan position are unchanged (no reset).

4. **Given** `mapConfig` is null and the user clicks Preview, **when** Preview mode renders, **then** a "No map loaded" empty state is shown (no crash).

5. **Given** `packages/builder-react/package.json`, **when** this story is complete, **then** `@resort-map/view-react` appears as a dependency with `workspace:*`.

6. **Given** `bun test` after this story, **then** all 276 existing tests pass.

## Tasks / Subtasks

- [x] Task 1: Add `@resort-map/view-react` dependency to `builder-react/package.json` and run `bun install` (AC: 5)
  - [x] 1.1 Add `"@resort-map/view-react": "workspace:*"` to the `dependencies` object in `packages/builder-react/package.json`
  - [x] 1.2 Run `bun install` from the workspace root `/home/fmauguin/Documents/resortMap` to link the workspace package

- [x] Task 2: Create `packages/builder-react/src/components/CenterCanvas.tsx` (AC: 1, 2, 3, 4)
  - [x] 2.1 Import `useState` from `'react'`
  - [x] 2.2 Import MUI: `Box`, `ToggleButtonGroup`, `ToggleButton`, `Typography`
  - [x] 2.3 Import `MapViewer` from `'@resort-map/view-react'`
  - [x] 2.4 Import `useMapStore` from `'../store/mapStore'`
  - [x] 2.5 Import `MapCanvas` from `'./MapCanvas'`
  - [x] 2.6 Define local `type Mode = 'builder' | 'preview'`
  - [x] 2.7 Implement `handleModeChange(_: React.MouseEvent, newMode: Mode | null): void` — only update if `newMode !== null` (MUI ToggleButtonGroup fires null when clicking the already-selected button)
  - [x] 2.8 Subscribe `mapConfig` from `useMapStore((s) => s.mapConfig)` (preview needs it to pass to MapViewer)
  - [x] 2.9 Render outer `<Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>`
  - [x] 2.10 Render Mode Toggle Bar: `<Box sx={{ display: 'flex', justifyContent: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>` containing a `<ToggleButtonGroup exclusive size="small" value={mode} onChange={handleModeChange} aria-label="canvas mode">` with two `<ToggleButton>` children
  - [x] 2.11 Each ToggleButton uses `sx={{ px: 3, '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } }}`
  - [x] 2.12 Render canvas area `<Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>` containing:
    - `<Box sx={{ display: mode === 'builder' ? 'block' : 'none', height: '100%', position: 'relative' }}><MapCanvas /></Box>` — always mounted, hidden via CSS in preview mode (preserves zoom/pan state per NFR-1)
    - `{mode === 'preview' && (mapConfig ? <MapViewer source={mapConfig} preview={true} /> : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Typography color="text.secondary">No map loaded</Typography></Box>)}`

- [x] Task 3: Update `packages/builder-react/src/App.tsx` to use `CenterCanvas` (AC: 1, 2, 3)
  - [x] 3.1 Add `import { CenterCanvas } from './components/CenterCanvas'`
  - [x] 3.2 Replace the center canvas Box:
    - REMOVE: `<Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}><MapCanvas /></Box>`
    - REMOVE: `import { MapCanvas } from './components/MapCanvas'` (no longer used in App.tsx)
    - ADD: `<CenterCanvas />`
  - [x] 3.3 Verify the outer flex row Box still has `flex: 1, overflow: 'hidden'` and CenterCanvas is a flex child

- [x] Task 4: Run full test suite (AC: 6)
  - [x] 4.1 Run `bun test` from workspace root — confirm all 276 tests pass, zero regressions

## Dev Notes

### Files to Create (NEW)

| File | Description |
|------|-------------|
| `packages/builder-react/src/components/CenterCanvas.tsx` | Mode toggle bar + conditional canvas/viewer rendering |

### Files to Modify (UPDATE — read before touching)

| File | Change |
|------|--------|
| `packages/builder-react/package.json` | Add `@resort-map/view-react: workspace:*` to dependencies |
| `packages/builder-react/src/App.tsx` | Replace Box+MapCanvas with `<CenterCanvas />`; remove `MapCanvas` import |

### `packages/builder-react/package.json` — targeted change

Current `dependencies` block:
```json
"dependencies": {
  "@emotion/react": "^11",
  "@emotion/styled": "^11",
  "@mui/icons-material": "^6",
  "@mui/material": "^6",
  "@resort-map/builder-core": "workspace:*",
  "@resort-map/poi-icons": "workspace:*",
  "@resort-map/types": "workspace:*",
  "zustand": "catalog:"
}
```

Add `"@resort-map/view-react": "workspace:*"` to this object (alphabetical order: after `@resort-map/builder-core`, before `@resort-map/poi-icons`).

After adding, run from workspace root:
```sh
bun install
```

Bun workspace installs automatically link local packages referenced with `workspace:*`.

### `App.tsx` — before and after diff

**Before** (center section):
```tsx
import { MapCanvas } from './components/MapCanvas';
...
<Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
  <MapCanvas />
</Box>
```

**After**:
```tsx
import { CenterCanvas } from './components/CenterCanvas';
...
<CenterCanvas />
```

`CenterCanvas` already contains `flex: 1` in its own outer Box, making it behave identically as a flex child of the parent row. Remove `MapCanvas` import from `App.tsx` — it is now imported by `CenterCanvas.tsx`.

The outer `<Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>` row in App.tsx does NOT need to change; `<CenterCanvas />` replaces only the single center Box.

### `CenterCanvas.tsx` — complete reference implementation

```tsx
import { useState } from 'react';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { MapViewer } from '@resort-map/view-react';
import { useMapStore } from '../store/mapStore';
import { MapCanvas } from './MapCanvas';

type Mode = 'builder' | 'preview';

export function CenterCanvas(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const [mode, setMode] = useState<Mode>('builder');

  function handleModeChange(_: React.MouseEvent, newMode: Mode | null): void {
    if (newMode !== null) setMode(newMode);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          aria-label="canvas mode"
        >
          <ToggleButton
            value="builder"
            aria-label="Builder mode"
            sx={{
              px: 3,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            Builder
          </ToggleButton>
          <ToggleButton
            value="preview"
            aria-label="Preview mode"
            sx={{
              px: 3,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            Preview
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* MapCanvas is always mounted so zoom/pan local state is preserved (NFR-1).
            Hidden via CSS in preview mode instead of conditional render. */}
        <Box
          sx={{
            display: mode === 'builder' ? 'block' : 'none',
            height: '100%',
            position: 'relative',
          }}
        >
          <MapCanvas />
        </Box>

        {mode === 'preview' && (
          mapConfig
            ? <MapViewer source={mapConfig} preview={true} />
            : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography color="text.secondary">No map loaded</Typography>
              </Box>
            )
        )}
      </Box>
    </Box>
  );
}
```

### Critical Implementation Notes

**Why `MapCanvas` stays mounted (display:none in preview mode):**
`MapCanvas` manages its own pan/zoom position in React local state (`useRef` and `useState` internal to that component). If `MapCanvas` is unmounted when switching to Preview and remounted on return to Builder, those local states reset. Using `display: 'none'` keeps the component mounted and all internal state intact, satisfying NFR-1: "does not reset map view state (zoom/pan)".

**`MapViewer` `source` prop type:**
`MapViewer` from `@resort-map/view-react` accepts `source: string | MapConfig` (NOT `mapConfig: MapConfig`). Pass `source={mapConfig}` when rendering in preview mode. This satisfies the type since `MapConfig` is in the union.

**`handleModeChange` null guard:**
MUI `ToggleButtonGroup` with `exclusive` fires `null` as the new value when the user clicks the already-selected button. The `if (newMode !== null)` guard prevents the mode from being set to `null` (which would be a type error and render nothing).

**`@resort-map/view-react` import:**
The view-react package exports `MapViewer` as a named export from `./src/index.ts`. After adding the `workspace:*` dependency and running `bun install`, `import { MapViewer } from '@resort-map/view-react'` resolves correctly in the monorepo.

**No `MapViewerProps` import needed:** We only use `<MapViewer source={mapConfig} preview={true} />` — no need to import the type.

**ToggleButton vs. ToggleButtonGroup imports:**
- `import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'`
- `import ToggleButton from '@mui/material/ToggleButton'`

Both are in `@mui/material` (already installed). Import from subpackages (not `@mui/material` barrel) per architecture convention.

**`CenterCanvas` has no props interface** — it reads everything from the Zustand store. No `CenterCanvasProps` needed. Return type is `JSX.Element`.

**App.tsx: `MapCanvas` import removal:**
After extracting MapCanvas usage into CenterCanvas, `MapCanvas` is no longer directly imported by `App.tsx`. The import line `import { MapCanvas } from './components/MapCanvas'` should be removed from `App.tsx`. Leaving it causes a TypeScript unused import warning (or error in strict mode).

### Architecture Compliance

- `import type` for type-only imports (none required here — all are value imports or local types)
- Local `type Mode` is fine as a module-level type alias; no export needed (it's private to CenterCanvas)
- `JSX.Element` return type on `CenterCanvas` ✓
- No default exports ✓
- `ToggleButtonGroup` + `ToggleButton` are already in `@mui/material` — no new npm packages ✓
- Only `@resort-map/view-react` is a new workspace dependency (not npm) ✓

### Test Approach

No new unit tests. Changes are UI-only. The existing 276 tests:
- `mapStore.test.ts` (43): unaffected (no store changes)
- `theme.test.ts` (4): unaffected
- `svgCoords.test.ts` (a few): unaffected
- `view-react` + `view-core` tests: unaffected (builder-react is now a consumer, but view-react itself doesn't change)

After `bun install`, the dependency is resolved but no new test files are imported.

### What NOT to Change

- `MapCanvas.tsx` — zero changes; it's imported and used unchanged inside `CenterCanvas`
- `packages/view-react/*` — no changes to the view-react package itself (story 7.1 already added `preview` prop)
- `mapStore.ts` — no store changes needed
- `LeftPanel.tsx`, `RightPanel.tsx`, `AppBar.tsx` — untouched
- `App.tsx` layout structure — only the center Box is replaced with `<CenterCanvas />`

### Context from Previous Stories

- **7.4 baseline**: 276 tests, single LeftPanel.tsx change, bun test = 276/276 ✓
- **`@resort-map/view-react` already has `preview` prop**: Story 7.1 implemented `preview?: boolean` on `MapViewer`. `<MapViewer source={mapConfig} preview={true} />` is valid today.
- **Pattern**: `import { X } from '@resort-map/some-package'` (workspace packages export via `src/index.ts` through `"exports": { ".": "./src/index.ts" }`)
- **`bun install` needed**: Adding `workspace:*` dependency requires running `bun install` from workspace root to update `bun.lock` and create symlink. Without it, the import resolves in dev but test/typecheck may fail.
- **`MapCanvas` zero props**: `export function MapCanvas(): JSX.Element` — no props, reads from store

### References

- `packages/builder-react/src/components/CenterCanvas.tsx` — NEW file (primary implementation)
- `packages/builder-react/src/App.tsx` — minor update (import swap)
- `packages/builder-react/package.json` — add dependency
- `packages/view-react/src/MapViewer.tsx` — consumer; `source: string | MapConfig`, `preview?: boolean`
- `packages/view-react/src/index.ts` — exports `{ MapViewer, type MapViewerProps }`
- PRD FR-13, FR-14, FR-15, NFR-1: `_bmad-output/planning-artifacts/epics.md` (lines 262–295)
- Story 7.1 completion notes: `_bmad-output/implementation-artifacts/7-1-view-react-preview-prop.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Added `@resort-map/view-react: workspace:*` to `builder-react/package.json` dependencies (alphabetical order). `bun install` resolved and symlinked the workspace package.
- Created `CenterCanvas.tsx`: outer flex column containing a MUI ToggleButtonGroup (Builder/Preview) above the canvas area. MapCanvas is always mounted, hidden via `display: none` in preview mode to preserve local pan/zoom state (NFR-1). In preview mode renders `<MapViewer source={mapConfig} preview={true} />` or a "No map loaded" empty state when mapConfig is null.
- Updated `App.tsx`: replaced `<Box …><MapCanvas /></Box>` with `<CenterCanvas />` and removed the unused `MapCanvas` import. CenterCanvas's own `flex: 1` makes it behave identically as a flex child.
- All 276 existing tests pass with zero regressions (`bun test`, 1121ms).

### File List

- `packages/builder-react/package.json` (modified — added `@resort-map/view-react` dependency)
- `packages/builder-react/src/components/CenterCanvas.tsx` (created)
- `packages/builder-react/src/App.tsx` (modified — swapped MapCanvas import/usage for CenterCanvas)

## Change Log

- 2026-06-24: Implemented story 7-5 — added view-react workspace dependency, created CenterCanvas component with Builder/Preview mode toggle, updated App.tsx. All 276 tests pass.

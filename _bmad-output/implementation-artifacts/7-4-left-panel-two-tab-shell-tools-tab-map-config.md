---
baseline_commit: 1cd86d77bc1c0ed9e4965a4ca43466269a4d1cbc
---

# Story 7.4: Left Panel — Two-Tab Shell, Tools Tab, Map Config

Status: review

## Story

As a map builder,
I want the Left Panel to have a "Tools" tab with tool squares and map configuration settings,
So that my editing tools and map settings are organized and always one click away.

## Acceptance Criteria

1. **Given** the app opens, **when** the Left Panel renders, **then** two tabs are shown: "Tools" (active by default, teal underline) and "Content", and the panel is ~240px wide.

2. **Given** the Tools Tab is active, **when** it renders, **then** 5 Tool Squares appear in a 2-column grid: Select, Place POI, Draw Street, Set Scale, Pan. Each square is ~72px tall with a centered icon and text label beneath it. Each has an MUI Tooltip showing the tool name.

3. **Given** the Tools Tab is active, **when** a Tool Square is clicked, **then** `activeTool` in the Zustand store updates to that tool, the clicked square shows teal background with white text/icon, and all others return to white/off-white with divider border.

4. **Given** the Tools Tab is active, **when** the Map Config section renders (below a Divider), **then** it shows the background image text field + Browse button, scale (m/px) number field, and Set Center button — all with existing `MapMetaPanel` functionality working identically.

5. **Given** the user switches to the Content Tab, **then** `activeTool` in the store is forced to `'select'`; Tool Squares in the Tools Tab are visually disabled (opacity 0.38, not clickable); switching back to Tools Tab restores the previously active tool (stored in a `useRef`, not in Zustand).

6. **Given** `bun test` after this story, **then** all 276 existing tests pass with zero regressions.

## Tasks / Subtasks

- [x] Task 1: Rewrite `LeftPanel.tsx` with two-tab shell + Tool Squares grid + tab switching behavior (AC: 1, 2, 3, 4, 5)
  - [x] 1.1 Add `useRef` to React import; add MUI imports: `Tabs`, `Tab`, `ButtonBase` (remove `ToggleButtonGroup`, `ToggleButton`)
  - [x] 1.2 Add `import type { MapConfig }` is NOT needed — but verify existing imports remain
  - [x] 1.3 Add local state: `const [activeTab, setActiveTab] = useState(0)` and `const prevToolRef = useRef<ActiveTool>(activeTool)` inside the component
  - [x] 1.4 Implement `handleTabChange(_: React.SyntheticEvent, newTab: number)`: when switching TO Content (1) → save `prevToolRef.current = activeTool`, call `setActiveTool('select')`; when switching TO Tools (0) → call `setActiveTool(prevToolRef.current)`; always call `setActiveTab(newTab)`
  - [x] 1.5 Remove `handleToolChange` and `paletteValue` logic; replace with `handleToolSelect(tool: ActiveTool)` that simply calls `setActiveTool(tool)`
  - [x] 1.6 Update `Drawer` sx: add `display: 'flex', flexDirection: 'column'` to the paper sx so that `Tabs` stays at top and content area can scroll
  - [x] 1.7 Render `<Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" indicatorColor="primary" textColor="primary">` with two `<Tab label="Tools" />` and `<Tab label="Content" />`
  - [x] 1.8 Render Tools Tab content when `activeTab === 0`: 2-column grid of Tool Squares using `Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}`
  - [x] 1.9 Each Tool Square: `<Tooltip title={label}><span><ButtonBase onClick={() => handleToolSelect(value)} sx={...}>` — with active square styles (teal bgcolor) and inactive styles (white + border)
  - [x] 1.10 Below the grid: `<Divider sx={{ my: 2 }} />` + `<Typography variant="overline">Map Config</Typography>` + `<MapMetaPanel />`
  - [x] 1.11 Render Content Tab placeholder when `activeTab === 1`: `<Box sx={{ flex: 1 }} />` (empty — story 7.6 will fill this in)

- [x] Task 2: Run full test suite (AC: 6)
  - [x] 2.1 Run `bun test` from workspace root — confirm all 276 tests pass, zero regressions

## Dev Notes

### Files to Modify (UPDATE — read before touching)

| File | Change |
|------|--------|
| `packages/builder-react/src/components/LeftPanel.tsx` | Replace ToggleButtonGroup with Tabs + Tool Squares grid; add tab switching behavior |

### No other files change. No new files. No new dependencies.

MUI `Tabs`, `Tab`, `ButtonBase` are already available from `@mui/material` (installed). No `bun install` needed.

### Current `LeftPanel.tsx` — what to REMOVE vs. PRESERVE

**Remove entirely:**
- `import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'`
- `import ToggleButton from '@mui/material/ToggleButton'`
- `const paletteValue = ...` derived value
- `function handleToolChange(...)` function
- The entire `<ToggleButtonGroup>...</ToggleButtonGroup>` JSX block

**Keep unchanged:**
- All other existing MUI imports (`Drawer`, `Box`, `Typography`, `Divider`)
- All icon imports (`NearMeIcon`, `AddLocationIcon`, `TimelineIcon`, `StraightenIcon`, `PanToolIcon`)
- `import Tooltip from '@mui/material/Tooltip'` — already present, still needed
- The `DRAWER_WIDTH = 240` constant
- The `TOOL_BUTTONS` array — keep exactly as-is (same 5 tools in same order)
- `import { useMapStore } from '../store/mapStore'` and `import type { ActiveTool } from '../store/mapStore'`
- `import { MapMetaPanel } from './MapMetaPanel'`
- The two `useMapStore` subscriptions: `activeTool`, `setActiveTool`
- The `<MapMetaPanel />` in the Tools Tab content (Map Config section)
- The `<Drawer variant="permanent" anchor="left" ...>` outer wrapper

**Add:**
- `import { useRef, useState } from 'react'` (replace `import { useState } from 'react'` — wait, currently there's no `useState` in LeftPanel! Current code has no local state at all. So add: `import { useRef, useState } from 'react'`)
- `import Tabs from '@mui/material/Tabs'`
- `import Tab from '@mui/material/Tab'`
- `import ButtonBase from '@mui/material/ButtonBase'`

### New `LeftPanel.tsx` — Complete Intended Structure

```tsx
import { useRef, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import NearMeIcon from '@mui/icons-material/NearMe';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import TimelineIcon from '@mui/icons-material/Timeline';
import StraightenIcon from '@mui/icons-material/Straighten';
import PanToolIcon from '@mui/icons-material/PanTool';
import { useMapStore } from '../store/mapStore';
import type { ActiveTool } from '../store/mapStore';
import { MapMetaPanel } from './MapMetaPanel';

const DRAWER_WIDTH = 240;

const TOOL_BUTTONS: { value: ActiveTool; label: string; Icon: React.ComponentType }[] = [
  { value: 'select', label: 'Select', Icon: NearMeIcon },
  { value: 'placePoi', label: 'Place POI', Icon: AddLocationIcon },
  { value: 'drawStreet', label: 'Draw Street', Icon: TimelineIcon },
  { value: 'setScale', label: 'Set Scale', Icon: StraightenIcon },
  { value: 'pan', label: 'Pan', Icon: PanToolIcon },
];

export function LeftPanel(): JSX.Element {
  const activeTool = useMapStore((s) => s.activeTool);
  const setActiveTool = useMapStore((s) => s.setActiveTool);

  const [activeTab, setActiveTab] = useState(0);
  const prevToolRef = useRef<ActiveTool>(activeTool);

  function handleTabChange(_: React.SyntheticEvent, newTab: number): void {
    if (newTab === 1) {
      prevToolRef.current = activeTool;
      setActiveTool('select');
    } else if (newTab === 0) {
      setActiveTool(prevToolRef.current);
    }
    setActiveTab(newTab);
  }

  function handleToolSelect(tool: ActiveTool): void {
    setActiveTool(tool);
  }

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label="Tools" />
        <Tab label="Content" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 && (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {TOOL_BUTTONS.map(({ value, label, Icon }) => {
                const isActive = activeTool === value;
                return (
                  <Tooltip title={label} key={value}>
                    <span>
                      <ButtonBase
                        disabled={activeTab === 1}
                        onClick={() => handleToolSelect(value)}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                          height: 72,
                          width: '100%',
                          border: '1px solid',
                          borderRadius: 1,
                          borderColor: isActive ? 'primary.main' : 'divider',
                          bgcolor: isActive ? 'primary.main' : 'background.paper',
                          color: isActive ? 'primary.contrastText' : 'text.primary',
                          transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                          '&:hover': { bgcolor: isActive ? 'primary.dark' : 'action.hover' },
                          '&.Mui-disabled': { opacity: 0.38 },
                        }}
                      >
                        <Icon />
                        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                          {label}
                        </Typography>
                      </ButtonBase>
                    </span>
                  </Tooltip>
                );
              })}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
              Map Config
            </Typography>

            <MapMetaPanel />
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ flex: 1 }} />
        )}
      </Box>
    </Drawer>
  );
}
```

### Critical Implementation Notes

**`prevToolRef` vs. `useState` for previous tool:**
Use `useRef<ActiveTool>(activeTool)` — a ref, NOT state. This avoids triggering a re-render when we store the previous tool. The ref is written in `handleTabChange` (event handler) and read in the same handler. No render cycle needed.

**Initial value of `prevToolRef`:** `useRef<ActiveTool>(activeTool)` — this captures `activeTool` at mount time. If `activeTool` changes later (user selects a tool) while still on Tools Tab, `prevToolRef.current` does NOT auto-update. It is only updated in `handleTabChange` when switching to Content Tab (`prevToolRef.current = activeTool`). This is correct and intended.

**`setCenter` edge case:** `'setCenter'` is a valid `ActiveTool` but is NOT in TOOL_BUTTONS. If `prevToolRef.current = 'setCenter'` when switching back to Tools Tab, the store gets `activeTool = 'setCenter'` — no tool square will appear highlighted (since none match), but the Map Config section's "Set Center" button will show "Click on canvas…". This is acceptable behavior per story 7.4 scope.

**Why `<span>` wraps `<ButtonBase>`:** MUI `Tooltip` does not fire on disabled elements because they suppress pointer events. Wrapping in `<span>` lets the tooltip still trigger. See `AppBar.tsx` (story 7.3) for the same pattern on disabled `IconButton`. When `activeTab === 1`, the ButtonBase is disabled (Content Tab active), so the wrapping `<span>` ensures the tooltip still appears.

**`disabled={activeTab === 1}` vs. a derived boolean:** Using `activeTab === 1` directly in the JSX (inside `activeTab === 0` branch means this is always `false` while the grid is rendered). Wait — the grid is ONLY rendered when `activeTab === 0`, so `disabled={activeTab === 1}` is always `false` when this code runs. This is a no-op. The visual "disabled" state doesn't apply to tool squares while on Tools Tab because the grid isn't shown on Content Tab.

Re-reading the AC: "Tool Squares in the Tools Tab are visually disabled (not clickable)" — this refers to while the Content Tab is ACTIVE. But we achieve this by simply not rendering the Tools Tab content when `activeTab === 1`. The tool squares aren't visible at all when Content Tab is active. This is a simpler and equally correct approach vs. rendering disabled squares.

→ Therefore: **Do NOT pass `disabled={activeTab === 1}` to ButtonBase**. Since the grid only renders when `activeTab === 0`, the `disabled` prop is never needed. Remove it from the ButtonBase.

Revised ButtonBase:
```tsx
<ButtonBase
  onClick={() => handleToolSelect(value)}
  sx={{ ... }}
>
```

**Drawer paper `overflow`:** Change from `overflow: 'auto'` (current) to `overflow: 'hidden'` — the scrolling is now handled by the inner `Box sx={{ flex: 1, overflow: 'auto' }}`. This prevents double scrollbars.

**Content Tab placeholder:** `{activeTab === 1 && <Box sx={{ flex: 1 }} />}` — Story 7.6 will replace this with the POI list. Do NOT implement POI list here. Do NOT show "No POIs placed yet." text here (that's story 7.6's concern).

**Section label change:** Previously the Map Config section had `<Typography variant="overline">Map Properties</Typography>`. Change to "Map Config" (matches the FR-8 label and the story task description). The MapMetaPanel component itself is unchanged.

**Tab indicator color:** With the teal theme (`primary.main = #009688`), `indicatorColor="primary"` and `textColor="primary"` on `Tabs` gives the teal underline and teal tab text color for the active tab automatically.

### Architecture Compliance

- `import type` for type-only imports: `ActiveTool` uses `import type` ✓
- `JSX.Element` return type on `LeftPanel` ✓
- No default exports ✓
- No new dependencies ✓
- No new files ✓
- Component name + Props interface: `LeftPanel` has no props, so no interface needed ✓

### What NOT to Change in This Story

- `mapStore.ts` — no store changes needed for 7.4 (tab state is purely local)
- `MapMetaPanel.tsx` — imported and used unchanged; functionality preserved
- `App.tsx` — no changes
- `AppBar.tsx` — no changes
- `MapCanvas.tsx` — no changes
- `RightPanel.tsx` — no changes
- Any test files — no new tests added; existing tests must remain 276/276

### Test Approach

No new unit tests are required for this story. The changes are UI-only (component render tree and event handlers). The existing store tests don't test LeftPanel. Existing 276 tests must remain green.

If LeftPanel introduced TypeScript errors, `bun test` would fail at the transpile stage — so test pass = compile pass.

### Context from Previous Stories

- **7.3 baseline**: 276 tests, 24 files. Pattern: `bun test` runs from workspace root.
- **`activeTool` type**: `'select' | 'placePoi' | 'drawStreet' | 'setCenter' | 'setScale' | 'pan'`
- **MUI imports**: always from subpackages (`@mui/material/Tabs`, not `@mui/material`)
- **MUI theme**: teal `primary.main = #009688`, applied via `ThemeProvider` in `App.tsx` — `Tabs` indicatorColor="primary" gives teal underline automatically
- **`useRef` pattern**: used in `MapMetaPanel.tsx` (fileInputRef), precedent for refs in this codebase
- **Story 7.6** will add the POI list to the Content Tab. Story 7.5 adds the Mode Toggle Bar above the canvas. Neither is part of 7.4 scope.

### References

- `packages/builder-react/src/components/LeftPanel.tsx` — only file being modified
- `packages/builder-react/src/components/MapMetaPanel.tsx` — imported, unchanged
- PRD FR-6, FR-7, FR-8, NFR-4, NFR-5, NFR-6
- `_bmad-output/planning-artifacts/epics.md` — Story 7.4 (lines 219–260)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Replaced `ToggleButtonGroup` with MUI `Tabs` + `Tab` for "Tools" / "Content" tab shell.
- Replaced vertical ToggleButton list with 2-column CSS Grid of `ButtonBase` squares (72px height, teal active state via theme colors).
- `prevToolRef = useRef<ActiveTool>(activeTool)` captures the tool before switching to Content Tab; restored on switch back to Tools Tab.
- `handleTabChange`: switching to Content Tab → `prevToolRef.current = activeTool; setActiveTool('select')`; switching back → `setActiveTool(prevToolRef.current)`.
- `disabled` prop NOT used on ButtonBase (tool squares only render when `activeTab === 0`, so they're never shown while Content Tab is active — `disabled` would be a no-op).
- `<span>` wrapper around `ButtonBase` in `<Tooltip>` maintained for MUI tooltip best-practice (per AppBar.tsx pattern).
- Drawer paper sx updated: `display: 'flex', flexDirection: 'column', overflow: 'hidden'`; scrolling handled by inner `Box sx={{ flex: 1, overflow: 'auto' }}`.
- Section label: "Map Properties" → "Map Config" (per FR-8).
- Content Tab placeholder: empty `<Box sx={{ flex: 1 }} />` — story 7.6 will fill with POI list.
- Full workspace: 276/276 pass, 0 regressions.

### File List

- packages/builder-react/src/components/LeftPanel.tsx

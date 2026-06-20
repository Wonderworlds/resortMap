---
id: 6-3
title: "Builder React — Left Panel (Tools + Map Config)"
epic: 6
status: review
created: 2026-06-20
updated: 2026-06-20
depends-on: [6-2]
baseline_commit: 7c006331f76cefa0cb115bc3e715cdebdca6ad74
---

## Story

As a map author, I want tool selection and map configuration to live in a dedicated left panel so the authoring intent (what I'm doing) and map setup (how the map is configured) are visually separated and always visible.

## Context

This story restructures the left portion of the builder. The current `<Toolbar>` is already gone (Story 6-2). The current `Sidebar` component mixes `MapMetaPanel` with POI properties — this story extracts the tool palette and map config into a new left `<Drawer>`, leaving `Sidebar` in place temporarily (it will be replaced in Story 6-4).

**Files touched:**
- `packages/builder-react/src/components/LeftPanel.tsx` — new file
- `packages/builder-react/src/components/MapMetaPanel.tsx` — logic stays, styling migrated to MUI; Export button removed (now in AppBar)
- `packages/builder-react/src/App.tsx` — add `<LeftPanel>` to layout; remove old toolbar slot (already removed in 6-2)
- `packages/builder-react/src/components/Sidebar.tsx` — remove `<MapMetaPanel>` from Sidebar (map config moves to LeftPanel)

**Relevant PRD sections:** F4 (FR-4.1–4.4), F5 (FR-5.1–5.2), NFR-6.1.

## Acceptance Criteria

**AC-1 — Left panel visible**
- Given: the app renders
- When: the page loads
- Then: a 240 px wide left panel is visible, permanently open (no toggle), containing two sections

**AC-2 — Tools section**
- Given: the left panel is rendered
- When: viewed
- Then: a MUI `<ToggleButtonGroup exclusive>` is visible at the top with 4 `<ToggleButton>` entries: Select, Place POI, Draw Street, Set Scale — arranged vertically or in a 2×2 grid; the active tool is highlighted

**AC-3 — Tool toggle updates store**
- Given: the active tool is "select"
- When: user clicks "Place POI" toggle button
- Then: `useMapStore.activeTool` becomes `"placePoi"` and the Place POI button is highlighted

**AC-4 — Map Config section**
- Given: the left panel is rendered below a `<Divider>`
- When: viewed
- Then: a "Map Properties" heading and three fields are visible: Background Image URL `<TextField>`, Scale (m/px) `<TextField type="number">`, Set Center `<Button>`

**AC-5 — URL field initializes map**
- Given: `mapConfig` is null
- When: user enters a URL and presses Enter or blurs the Background Image URL field
- Then: `initMap` is called with the URL (same logic as current `commitUrl` in `MapMetaPanel`)

**AC-6 — Scale field commits on blur**
- Given: `mapConfig` is non-null
- When: user changes Scale field and blurs
- Then: `updateMapMeta({ scale: parsedValue })` is called with the numeric value

**AC-7 — Set Center activates tool**
- Given: `mapConfig` is non-null
- When: user clicks "Set Center"
- Then: `activeTool` becomes `"setCenter"`; button text changes to "Click on canvas…" with a distinct MUI color (e.g. `color="success"`)

**AC-8 — Map config inputs disabled without map**
- Given: `mapConfig` is null
- When: Scale field and Set Center button are rendered
- Then: both are `disabled`; URL field remains enabled

**AC-9 — Export button removed from MapMetaPanel**
- Given: `MapMetaPanel` is rendered inside LeftPanel
- When: viewed
- Then: no Export button appears in the panel (it is in the AppBar)

**AC-10 — Sidebar no longer renders MapMetaPanel**
- Given: `Sidebar` component
- When: rendered
- Then: `MapMetaPanel` is not imported or rendered inside it

**AC-11 — Canvas still fills remaining width**
- Given: the left panel (240 px) and AppBar are rendered
- When: the layout is inspected
- Then: `<MapCanvas>` fills the remaining horizontal space (`flex: 1`) with no horizontal scroll

## Tasks

1. [x] **`src/components/LeftPanel.tsx`** (new) — MUI `<Drawer variant="permanent" anchor="left">` with `width: 240px`. Structure:
   - `<Box sx={{ p: 1.5 }}>` containing:
   - `<Typography variant="overline">Tools</Typography>`
   - `<ToggleButtonGroup orientation="vertical" exclusive value={activeTool} onChange={handleToolChange} fullWidth>` with 4 `<ToggleButton>` items: `value="select"` + `<NearMeIcon>` + "Select", `value="placePoi"` + `<AddLocationIcon>` + "Place POI", `value="drawStreet"` + `<TimelineIcon>` + "Draw Street", `value="setScale"` + `<StraightenIcon>` + "Set Scale"
   - `<Divider sx={{ my: 2 }} />`
   - `<Typography variant="overline">Map Properties</Typography>`
   - `<MapMetaPanel />` (the refactored version, Export removed)
2. [x] **`src/components/MapMetaPanel.tsx`** — migrate all `style={{}}` to MUI components: `<TextField label="Background Image URL" ...>`, `<TextField label="Scale (m/px)" type="number" ...>`, `<Button variant="outlined" ...>Set Center</Button>`; remove Export button and its `exportGwmap` function (now in AppBar)
3. [x] **`src/components/Sidebar.tsx`** — remove `import { MapMetaPanel }` and the `<MapMetaPanel />` render + the `<div>` divider after it; leave POI/node property rendering intact
4. [x] **`src/App.tsx`** — update layout: `<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>` → `<AppBar />` → `<Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>` → `<LeftPanel />` → `<Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>` → `<MapCanvas />` → `</Box>` → `<Sidebar />` → `</Box>` → `</Box>`
5. [x] **Verify `bun test`** passes (no store changes in this story; existing tests must still pass)

## Design Notes

- MUI `<Drawer variant="permanent">` uses `position: relative` by default inside a flex container — this is correct. Set `sx={{ width: 240, flexShrink: 0, '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box', position: 'relative' } }}` to prevent the paper from floating fixed.
- Tool icons from `@mui/icons-material`: `NearMeIcon` (select), `AddLocationIcon` (place POI), `TimelineIcon` (draw street), `StraightenIcon` (set scale). These are reasonable choices; swap if a more fitting icon exists.
- `<ToggleButtonGroup orientation="vertical">` with `fullWidth` renders buttons stacked at full panel width — preferred over a 2×2 grid for label readability.
- `MapMetaPanel` URL draft state and `useEffect` syncs remain unchanged; only the JSX changes from raw HTML to MUI components.

## Dev Agent Record

### Implementation Notes

- `LeftPanel.tsx`: permanent MUI Drawer with `position: 'relative'` on `.MuiDrawer-paper` so it participates in flex layout without floating.
- `paletteValue` computed from `activeTool` — when `activeTool === 'setCenter'` (activated from Map Config), no palette button is highlighted (value falls through to `null`).
- `MapMetaPanel.tsx`: all raw JSX replaced with MUI `TextField` (size="small", fullWidth) and `Button`. Export button and `exportGwmap` removed (already lives in AppBar from 6-2). `MapMeta` import kept for `initMap` call.
- `Sidebar.tsx`: `MapMetaPanel` import and render removed; all POI/node property editor code preserved intact.
- `App.tsx`: layout migrated from raw `<div style={}>` to MUI `Box sx={}` wrappers; `<LeftPanel />` inserted between AppBar and MapCanvas.
- 235/235 tests pass; zero regressions; no TS errors in builder-react.

### File List

- `packages/builder-react/src/components/LeftPanel.tsx` (new)
- `packages/builder-react/src/components/MapMetaPanel.tsx` (modified — MUI migration, Export removed)
- `packages/builder-react/src/components/Sidebar.tsx` (modified — MapMetaPanel removed)
- `packages/builder-react/src/App.tsx` (modified — LeftPanel added, MUI Box layout)

## Spec Change Log

| Date | Change |
|---|---|
| 2026-06-20 | Initial creation |
| 2026-06-20 | Implementation complete — all 5 tasks checked, 235/235 tests pass |

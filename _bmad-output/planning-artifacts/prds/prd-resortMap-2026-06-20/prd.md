---
title: "ResortMap Builder — UI/UX Redesign (Epic 6)"
status: final
created: 2026-06-20
updated: 2026-06-20
---

## Overview

The `builder-react` package currently works but looks and feels like a prototype: plain HTML buttons, inline styles, a single right sidebar that mixes map configuration with POI property editing, and no visual hierarchy. This redesign replaces the entire UI with MUI components, separates concerns into four distinct zones, adds a shared `@resort-map/poi-icons` icon library, and extends the Zustand store with redo support.

**Users:** Solo map authors (currently just Floran; internal/personal tool).
**Form factor:** Desktop web browser.

---

## Problem

| Pain | Current cause |
|---|---|
| No visual separation between tool selection and map config | Both crammed into one right sidebar |
| POI/node properties hidden below map config in sidebar | Sidebar has no scroll affordance; easy to miss |
| Can't redo after an accidental undo | `undoStack` only; no `redoStack` |
| No icon choice when placing a POI | Icon field is a raw text URL — no visual picker |
| Raw HTML styling makes future iteration slow | Zero design system; every pixel is bespoke |

---

## Goals

| # | Goal | Counter-metric |
|---|---|---|
| G1 | All UI surfaces use MUI components | No bespoke `style={{}}` blocks in component files |
| G2 | Four distinct layout zones with clear visual hierarchy | User can identify each zone without reading labels |
| G3 | POI property panel is always accessible when a POI is selected | No vertical scrolling required to reach the panel |
| G4 | Redo is available immediately after an undo | Redo stack accurately mirrors undo operations |
| G5 | Authors can pick a POI icon from a visual palette | No freeform URL entry required for standard icons |

---

## Features & Requirements

### F1 — `@resort-map/poi-icons` Package

A new Bun workspace package (`packages/poi-icons`) exporting named SVG React components for common resort/venue POI categories.

- **FR-1.1** The package exports at minimum 12 named SVG components: `RestaurantIcon`, `CafeIcon`, `HotelIcon`, `ParkingIcon`, `RestroomIcon`, `FirstAidIcon`, `InfoIcon`, `ShopIcon`, `PoolIcon`, `SkiLiftIcon`, `EntranceIcon`, `AccessibilityIcon`.
- **FR-1.2** Each component accepts standard SVG props (`width`, `height`, `color`, `className`) and defaults to `24×24` at `currentColor`.
- **FR-1.3** The package also exports a `POI_ICONS` registry: `Record<string, { label: string; Icon: React.ComponentType<SVGProps> }>`, keyed by a stable string ID (e.g. `"restaurant"`). This is the canonical list for the icon picker.
- **FR-1.4** The package has `"@resort-map/types": "workspace:*"` as its only non-peer dependency; React is a peer dependency.
- **FR-1.5** `package.json` includes an `"exports"` field so imports work as `@resort-map/poi-icons`.

### F2 — Zustand Store: Redo Support

Extend `packages/builder-react/src/store/mapStore.ts` with redo capability.

- **FR-2.1** The store adds a `redoStack: MapConfig[]` state field (max 50, same as undo).
- **FR-2.2** Every action that currently pushes to `undoStack` clears `redoStack`.
- **FR-2.3** A new `redo()` action pops from `redoStack`, sets it as `mapConfig`, and pushes the prior `mapConfig` onto `undoStack`.
- **FR-2.4** `undo()` pops from `undoStack` and pushes the popped-from state onto `redoStack`.
- **FR-2.5** The store exposes `redoStack.length` so UI can disable the Redo button when empty.

### F3 — Top AppBar

Replace the current `<Toolbar>` with a MUI `<AppBar>` spanning the full width.

- **FR-3.1** Left group: app name / logo mark (text or icon).
- **FR-3.2** Center group: Save button, Export button. Both disabled when `mapConfig` is null.
  - **Save** triggers a browser file download of the current `.gwmap` JSON. [ASSUMPTION: Save = download current draft; distinct from Export only by labelling until a server-side save target is defined.]
  - **Export** = existing `serializeGwmap` + download flow moved from `MapMetaPanel`.
- **FR-3.3** Right group: Undo `IconButton` (disabled when `undoStack` is empty), Redo `IconButton` (disabled when `redoStack` is empty), Quit `IconButton`.
  - Quit shows a MUI `<Dialog>` confirmation ("Discard unsaved changes?") then calls `initMap`-reset and reloads to a blank state. [ASSUMPTION: no separate "home" route exists yet; quit = reset session.]
- **FR-3.4** Undo/Redo buttons show MUI `<Tooltip>` with keyboard hint (Ctrl+Z / Ctrl+Y). [ASSUMPTION: keyboard shortcuts are wired in this epic.]
- **FR-3.5** Keyboard shortcuts `Ctrl+Z` → undo, `Ctrl+Y` / `Ctrl+Shift+Z` → redo, bound at `App` level via `useEffect`.

### F4 — Left Panel

A fixed-width left `<Drawer>` (permanent variant, non-collapsible) divided into two MUI `<Paper>` sections separated by a `<Divider>`.

- **FR-4.1** **Tools section** (top): MUI `<ToggleButtonGroup exclusive>` containing one `<ToggleButton>` per tool: Select, Place POI, Draw Street, Set Scale. Active tool highlighted with MUI primary color. Each button shows an MUI icon + label.
- **FR-4.2** **Map Config section** (below divider): MUI `<TextField>` for Background Image URL (commits on blur / Enter, same logic as current `commitUrl`). MUI `<TextField type="number">` for Scale (m/px). MUI `<Button variant="outlined">` for Set Center (same `setCenter` tool activation). Section heading: "Map Properties" as MUI `<Typography variant="subtitle2">`.
- **FR-4.3** The panel is 240 px wide, non-resizable.
- **FR-4.4** Map Config inputs are disabled when `mapConfig` is null (URL field remains enabled to allow initial load).

### F5 — Center Map Canvas

The `<MapCanvas>` component occupies all remaining space between the left panel and the right panel.

- **FR-5.1** Canvas fills 100% of the available column (`flex: 1`, `overflow: hidden`). No changes to canvas logic or pointer handling.
- **FR-5.2** The canvas area is always fully visible regardless of right panel state (the right panel overlays, it does not push).

### F6 — Right Properties Panel (Retractable Drawer)

A MUI `<Drawer anchor="right" variant="persistent">` that overlays the map canvas.

- **FR-6.1** Default state: **collapsed** (0 px width, invisible).
- **FR-6.2** Opens automatically when `selectedItemId` becomes non-null; closes when `selectedItemId` is null or the user clicks the close button.
- **FR-6.3** When open, the drawer is 320 px wide and renders above the canvas (`position: fixed` or `z-index` above the canvas layer).
- **FR-6.4** A close `IconButton` (`<ChevronRightIcon>`) appears inside the panel header.
- **FR-6.5** **POI properties** (when a POI is selected): MUI `<TextField>` for Label; MUI `<Chip>` + `<TextField>` for Tags (add on Enter, remove via chip delete); MUI icon picker for Icon (see FR-6.6); MUI `<TextField>` for Node ID link.
- **FR-6.6** **Icon picker**: a grid of `<IconButton>` cells, one per entry in `POI_ICONS` registry from `@resort-map/poi-icons`. Clicking a cell sets `poi.icon` to the registry key. Currently selected icon cell is highlighted with MUI primary outline. A "None" cell clears the icon.
- **FR-6.7** **Node properties** (when a graph node is selected): MUI `<Typography>` for ID display + MUI `<IconButton>` copy-to-clipboard; MUI `<Typography>` for Position (x, y).
- **FR-6.8** The panel header displays "POI Properties" or "Node Properties" as `<Typography variant="h6">` based on selection type.

---

## Non-Functional Requirements

- **NFR-6.1** All new components use MUI v6 (`@mui/material`, `@mui/icons-material`). No bespoke `style={{}}` blocks except for layout concerns not addressable via MUI's `sx` prop.
- **NFR-6.2** The `@resort-map/poi-icons` package must have zero React imports at the index level — icons are React components but the package has `"react"` as a peer dep, not a dep.
- **NFR-6.3** `bun test` continues to pass in `builder-react` after all store changes.
- **NFR-6.4** The redesign does not change any public API of `builder-core`, `types`, or any viewer package.
- **NFR-6.5** The `AppBar` height must not cause the canvas to scroll vertically — the full viewport height is consumed by AppBar + (LeftPanel | Canvas) flex row.

---

## Open Questions

| # | Question | Owner | Unblock condition |
|---|---|---|---|
| OQ-1 | Should "Save" write to a server endpoint in a future epic, or remain a local download permanently? | Floran | Before Epic 7 planning |
| OQ-2 | Should "Quit" navigate to a file-picker home screen (new route) or always reset in-place? | Floran | Before Epic 7 planning |
| OQ-3 | Should the left panel be collapsible (hamburger) for smaller screens? | Floran | Before implementation if targeting <1280 px viewports |

---

## Out of Scope

- Dark mode / theme switching
- Multi-file session management
- Server-side persistence
- Undo/redo keyboard shortcut rebinding
- Animated drawer open/close transitions (plain MUI defaults accepted)

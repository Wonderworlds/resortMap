---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: 2026-06-24
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-resortMap-2026-06-24/prd.md
  - _bmad-output/planning-artifacts/architecture.md
project_name: resortMap
---

# resortMap - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **resortMap Epic 7 — Builder UI/UX Redesign**, decomposing the requirements from the PRD and Architecture into implementable stories. This epic overhuals `packages/builder-react` into a Mosaico-style editor with a teal theme, tabbed left panel, Builder/Preview mode toggle, and parameterized theming. It also adds a `preview` prop to `@resort-map/view-react`.

---

## Requirements Inventory

### Functional Requirements

FR-1: Undo button in Top Nav Bar calls existing `undo()` store action; disabled when `undoStack` is empty.
FR-2: Redo button in Top Nav Bar calls `redo()` store action; disabled when `redoStack` is empty. (`redo()` already exists in store; FR wires it to the new button.)
FR-3: `<App>` accepts `onSave?: (config: MapConfig) => void` prop. Clicking Save calls hook if provided; otherwise downloads current `MapConfig` as `.gwmap` file. Button disabled when `mapConfig` is null. `onSave` and `MapConfig` exported from `packages/builder-react`.
FR-4: Export button in Top Nav Bar — placeholder in v1 (disabled or duplicates Save); reserved for future alternative export formats.
FR-5: Quit button in Top Nav Bar; shows confirmation dialog if unsaved changes exist (compare `mapConfig` to last-saved snapshot). `onQuit?: () => void` prop for embedding apps.
FR-6: Left Panel two-tab structure (Tools / Content). Switching to Content Tab forces `activeTool = 'select'` in Zustand store and locks tool buttons. Switching back to Tools Tab restores previous tool (local state, not store).
FR-7: Tool Squares grid (2 columns, ~80x72px per square): Select, Place POI, Draw Street, Set Scale, Pan. Active square has teal fill; inactive squares white/off-white with border. Squares disabled when Content Tab active.
FR-8: Map Config section below Tool Squares (divider-separated): background image text field + Browse button, scale (m/px) number input, Set Center button. Existing functionality preserved; visual style updated to match new theme.
FR-9: POI List in Content Tab: one row per POI, insertion order. Each row shows 24x24px icon (poi-icons registry or red circle fallback), label (truncated), up to 3 tag chips (+N if more). Reactive updates. Empty state: "No POIs placed yet."
FR-10: Hover Highlight — hovering a POI row sets `highlightedPoiId: string | null` in Zustand store. MapCanvas renders a distinct highlight ring on the matching pin. Ring removed on mouse-leave.
FR-11: Clicking a POI row sets `selectedItemId`, opens Right Panel if closed, and best-effort pans the map to make the POI visible.
FR-12: When `selectedItemId` changes to a POI id while Content Tab is active, the POI List smooth-scrolls to that row. Clicking a canvas POI pin while on Content Tab triggers this scroll.
FR-13: Mode Toggle Bar above canvas: "Builder" | "Preview" segment toggle stored in local React state (not Zustand). Active segment has teal fill.
FR-14: Builder mode: existing `MapCanvas` with all current functionality (tools, drag, zoom/pan, node/edge/POI rendering, zoom controls overlay). No functional changes to MapCanvas in this epic.
FR-15: Preview mode: renders `<ViewerComponent mapConfig={mapConfig} preview={true} />` from `@resort-map/view-react`. Viewer receives live `mapConfig` from Zustand store. No editing tools accessible. If `mapConfig` is null, shows empty state.
FR-16: Right Panel restyled to match new MUI theme: teal switches, outlined text fields, consistent typography and spacing. No functional changes to `PoiEditor` or `NodeInfo`.
FR-17: Right Panel overlays canvas (position fixed/absolute, right-anchored); does not push or resize canvas area.
FR-18: Default MUI theme: `primary.main: #009688`, `primary.contrastText: #ffffff`, `background.paper: #ffffff`, `background.default: #f0f0f0`, `text.primary: #333333`, `divider: #e0e0e0`.
FR-19: `<App>` accepts `themeConfig?: ThemeConfig` (`= Partial<ThemeOptions>` from MUI). Deep-merged with default theme via `createTheme`. `ThemeConfig` exported as named export from `packages/builder-react`.
FR-20: At viewport >= 1024px: full layout renders without horizontal overflow. Left Panel fixed ~240px; Right Panel fixed ~280-320px overlay; canvas `flex: 1; min-width: 0`.
FR-21 (prerequisite): `@resort-map/view-react` `MapViewer` component accepts `preview?: boolean` prop. When true: FilterPanel hidden, RoutePanel hidden, POI pins display-only (no click interaction), search/distance controls hidden. Preview badge shown in canvas corner. Backward-compatible (absent = false = current behavior). `preview` prop typed in exported component props.

### NonFunctional Requirements

NFR-1: Mode switching (Builder <-> Preview) completes within one render cycle with no visible flash; does not reset map view state (zoom/pan).
NFR-2: POI List renders up to 500 POIs without scroll lag (no virtualization in v1).
NFR-3: MUI `ThemeProvider` wraps the app once at root mount; theme object is not recreated on re-renders unless `themeConfig` prop changes.
NFR-4: All interactive controls have `aria-label` or a visible label.
NFR-5: Tab keyboard order follows spatial layout: Top Nav Bar -> Left Panel -> Canvas -> Right Panel.
NFR-6: All Tool Squares have MUI `Tooltip` with the tool name.
NFR-7: MUI dependencies added via `bun install` in `packages/builder-react`.
NFR-8: No new bundler introduced; Bun's built-in HTML import bundler remains the build pipeline.
NFR-9: `@resort-map/view-react` consumed as `workspace:*` inter-package dependency from builder-react.

### Additional Requirements (from Architecture)

- Store extension: Zustand store (`mapStore.ts`) must gain `highlightedPoiId: string | null` state and setter action, and `savedMapConfig: MapConfig | null` for unsaved-changes detection (used by FR-5, FR-10).
- Cross-domain dependency: architecture package graph currently shows builder-react depending only on builder-core. Adding `@resort-map/view-react` as a dependency is required for Preview mode. Acceptable since builder-react is a standalone app (not a library); `package.json` must be updated explicitly.
- Export discipline: `ThemeConfig`, `MapConfig`, `onSave` and `onQuit` prop types must be exported from `packages/builder-react/src/index.ts` following the single-export-point convention.
- Naming conventions (mandatory): camelCase file names, PascalCase components, `${ComponentName}Props` interface names, `import type` for type-only imports, explicit return types on all exported functions.
- `bun test` must remain green (264+ tests passing) at the end of every story; no regressions.

### UX Design Requirements

No separate UX specification. Visual design intent is captured in the PRD (sections 4 and 7) and the reference image (Mosaico-style editor, teal + off-white palette, 2-column tool squares, compact nav bar). All UX requirements are encoded in the FRs above.

### FR Coverage Map

```
FR-1:  Epic 7 / Story 7.3 — Undo button in Top Nav Bar
FR-2:  Epic 7 / Story 7.3 — Redo button in Top Nav Bar
FR-3:  Epic 7 / Story 7.3 — Save with onSave hook / .gwmap fallback
FR-4:  Epic 7 / Story 7.3 — Export placeholder button
FR-5:  Epic 7 / Story 7.3 — Quit with unsaved-changes dialog + onQuit hook
FR-6:  Epic 7 / Story 7.4 — Two-tab Left Panel shell; Content Tab forces select tool
FR-7:  Epic 7 / Story 7.4 — Tool Squares grid (2 col, teal active state)
FR-8:  Epic 7 / Story 7.4 — Map Config section (image, scale, set-center)
FR-9:  Epic 7 / Story 7.6 — POI List rows (icon, label, tags)
FR-10: Epic 7 / Story 7.6 — Hover Highlight (highlightedPoiId store + canvas ring)
FR-11: Epic 7 / Story 7.6 — POI row click → select + open Right Panel + pan-to
FR-12: Epic 7 / Story 7.6 — Canvas click → list scroll-to-selected
FR-13: Epic 7 / Story 7.5 — Mode Toggle Bar (Builder / Preview)
FR-14: Epic 7 / Story 7.5 — Builder mode canvas (unchanged MapCanvas)
FR-15: Epic 7 / Story 7.5 — Preview mode (<MapViewer preview={true}>)
FR-16: Epic 7 / Story 7.7 — Right Panel visual restyling
FR-17: Epic 7 / Story 7.7 — Right Panel overlay behavior preserved
FR-18: Epic 7 / Story 7.2 — Default MUI palette (teal #009688)
FR-19: Epic 7 / Story 7.2 — ThemeConfig prop on <App>
FR-20: Epic 7 / Story 7.7 — Responsive at >=1024px
FR-21: Epic 7 / Story 7.1 — preview prop on @resort-map/view-react
NFR-1 to NFR-9: Cross-cutting; validated at end of each story via bun test
```

---

## Epic List

- **Epic 7: Builder UI/UX Redesign** — Full visual and structural overhaul of `packages/builder-react` + `preview` prop for `@resort-map/view-react`.

---

## Epic 7: Builder UI/UX Redesign

Overhaul the ResortMap Builder (`packages/builder-react`) into a polished, Mosaico-style editor with a teal MUI theme, two-tab left panel, mode toggle bar with live viewer preview, and parameterized theming via `ThemeConfig` prop. Adds `preview` prop to `@resort-map/view-react` as a prerequisite.

**Story dependency chain:** 7.1 -> 7.2 -> 7.3 -> 7.4 -> 7.5 (depends on 7.1) -> 7.6 -> 7.7

---

### Story 7.1: Add `preview` prop to `@resort-map/view-react`

As a builder-react developer,
I want the `MapViewer` component in `@resort-map/view-react` to accept a `preview?: boolean` prop,
So that I can embed the viewer in the builder's Preview mode without exposing any interactive viewer controls.

**Acceptance Criteria:**

**Given** `<MapViewer mapConfig={config} preview={true} />`
**When** the component renders
**Then** the FilterPanel is not rendered (not in DOM)
**And** the RoutePanel is not rendered (not in DOM)
**And** POI pins render in their correct positions but have `pointerEvents: none` (click does nothing)
**And** any distance input, search controls, or navigation controls are not rendered
**And** a small "Preview" badge (chip in bottom-left of canvas area) is visible

**Given** `<MapViewer mapConfig={config} />` (no `preview` prop) or `preview={false}`
**When** the component renders
**Then** all existing FilterPanel, POI interaction, and control behavior is unchanged
**And** no "Preview" badge is shown

**Given** the `MapViewer` exported TypeScript props type
**When** a TypeScript consumer imports it
**Then** `preview?: boolean` is present as an optional prop with no TypeScript error

**Given** the existing `view-react` test suite
**When** `bun test` is run after this change
**Then** all existing tests pass with no regressions

---

### Story 7.2: MUI Theme System — default palette + ThemeConfig prop

As a builder-react developer,
I want an MUI `ThemeProvider` at the app root with a default teal palette and a `themeConfig` prop on `<App>`,
So that all builder components inherit the correct theme automatically and embedding apps can override any palette token.

**Acceptance Criteria:**

**Given** `<App />` rendered with no props
**When** any MUI component inside the app renders
**Then** `primary.main` resolves to `#009688`
**And** `primary.contrastText` resolves to `#ffffff`
**And** `background.paper` resolves to `#ffffff`
**And** `background.default` resolves to `#f0f0f0`
**And** `text.primary` resolves to `#333333`
**And** `divider` resolves to `#e0e0e0`

**Given** `<App themeConfig={{ palette: { primary: { main: '#c0392b' } } }} />`
**When** the app renders
**Then** all primary-color accents (active buttons, tab underlines, switches) appear in `#c0392b` instead of teal

**Given** `ThemeConfig` imported as a named export from `packages/builder-react`
**When** used in a TypeScript embedding app
**Then** it resolves to `Partial<ThemeOptions>` from MUI with no type error

**Given** the theme is applied at root mount
**When** the user interacts with the builder (places POIs, clicks tools)
**Then** the ThemeProvider is not re-created on each interaction (stable reference)

**Given** `bun test` after this story
**Then** all 264+ existing tests pass

---

### Story 7.3: Top Nav Bar — Save, Export, Undo, Redo, Quit

As a map builder,
I want a compact Top Nav Bar with "ResortMap Builder" on the left and Undo, Redo, Save, Export, Quit buttons on the right,
So that global actions are always accessible in one place.

**Acceptance Criteria:**

**Given** the app is open with no map loaded (`mapConfig` is null)
**When** the Top Nav Bar renders
**Then** "ResortMap Builder" text appears on the left (MUI Typography)
**And** Undo, Redo, Save, Export, Quit buttons appear on the right
**And** Save and Export are disabled
**And** Undo and Redo are disabled (empty stacks)

**Given** a loaded map with at least one undoable action
**When** the user clicks Undo
**Then** the last map mutation is reverted immediately on the canvas
**And** Undo becomes disabled if `undoStack` is now empty

**Given** `undoStack` has entries and user clicked Undo (so `redoStack` is non-empty)
**When** the user clicks Redo
**Then** the undone mutation is reapplied on the canvas
**And** Redo becomes disabled if `redoStack` is now empty

**Given** `<App onSave={mockFn} />` and a loaded map
**When** the user clicks Save
**Then** `mockFn` is called once with the current `MapConfig` object

**Given** `<App />` with no `onSave` prop and a loaded map
**When** the user clicks Save
**Then** a `.gwmap` JSON file is downloaded via the browser

**Given** the user clicks Quit with unsaved changes
**When** the confirmation dialog appears
**Then** confirming navigates away / calls `onQuit` prop; cancelling returns to the builder unchanged

**Given** `bun test` after this story
**Then** all existing tests pass

---

### Story 7.4: Left Panel — Two-Tab Shell, Tools Tab, Map Config

As a map builder,
I want the Left Panel to have a "Tools" tab with tool squares and map configuration settings,
So that my editing tools and map settings are organized and always one click away.

**Acceptance Criteria:**

**Given** the app opens
**When** the Left Panel renders
**Then** two tabs are shown: "Tools" (active by default, teal underline) and "Content"
**And** the Left Panel is ~240px wide

**Given** the Tools Tab is active
**When** it renders
**Then** 5 Tool Squares appear in a 2-column grid: Select, Place POI, Draw Street, Set Scale, Pan
**And** each square is ~80x72px with a centered icon and a text label beneath it
**And** the active tool's square has a teal background with white icon/text
**And** inactive squares have a white/off-white background with a subtle border
**And** each square has an MUI Tooltip showing the tool name

**Given** the user clicks an inactive Tool Square
**When** clicked
**Then** `activeTool` in the Zustand store updates to that tool
**And** the clicked square becomes visually active; the previous active square becomes inactive

**Given** the Tools Tab is active and renders below the tool squares grid
**When** the Map Config section renders
**Then** a MUI Divider separates it from the tool squares
**And** it contains: background image text field + Browse local file button (existing MapMetaPanel behavior), scale (m/px) number field, Set Center button
**And** all existing MapMetaPanel functionality works identically (URL entry, file picker, blob URL handling, scale input, set-center mode)

**Given** the user switches to the Content Tab
**When** the switch occurs
**Then** `activeTool` in the store is set to `'select'`
**And** Tool Squares in the Tools Tab are visually disabled (not clickable)
**And** switching back to Tools Tab restores the previously active tool (via local state)

**Given** `bun test` after this story
**Then** all existing tests pass

---

### Story 7.5: Center Canvas — Mode Toggle Bar + Preview Mode

As a map builder,
I want a Builder/Preview toggle above the canvas with Preview mode showing the live viewer,
So that I can instantly see the visitor experience without leaving the tool.

**Acceptance Criteria:**

**Given** the app opens (default Builder mode)
**When** the Mode Toggle Bar renders
**Then** "Builder" segment is active (teal fill) and "Preview" is inactive
**And** the existing `MapCanvas` renders below with all existing functionality intact

**Given** the user clicks the "Preview" segment
**When** the mode switches
**Then** the MapCanvas is replaced by `<MapViewer mapConfig={mapConfig} preview={true} />` from `@resort-map/view-react`
**And** the viewer shows the current map background and all placed POI pins
**And** no editing tools are accessible in this mode

**Given** the user switches back to "Builder"
**When** the mode switches
**Then** the MapCanvas is restored with all state intact: POIs, nodes, edges, and zoom/pan position are unchanged (no reset)

**Given** `mapConfig` is null and the user clicks Preview
**When** Preview mode renders
**Then** a "No map loaded" empty state is shown (no crash)

**Given** `packages/builder-react/package.json`
**When** this story is complete
**Then** `@resort-map/view-react` appears as a dependency with `workspace:*`

**Given** `bun test` after this story
**Then** all existing tests pass

---

### Story 7.6: Content Tab — POI List with Hover Highlight and Bidirectional Sync

As a map builder,
I want the Content tab to show a scrollable list of all placed POIs with hover map highlight and click-to-select,
So that I can survey, locate, and edit any POI without hunting for it on the canvas.

**Acceptance Criteria:**

**Given** the Content Tab is active and the map has POIs
**When** the POI List renders
**Then** one row per POI appears in insertion order
**And** each row shows: a 24x24px icon (poi-icons registry by `poi.icon` key, or red circle fallback), POI label (ellipsis-truncated if overflowing), and up to 3 tag chips ("+N" chip if >3 tags)
**And** the list is scrollable when rows exceed the panel height

**Given** the Content Tab is active and no POIs are placed
**When** the list area renders
**Then** "No POIs placed yet." is centered in the tab content area

**Given** the user hovers a POI row
**When** the mouse is over the row
**Then** `highlightedPoiId` in the Zustand store is set to that POI's id
**And** the MapCanvas renders a distinct highlight ring around the matching POI pin (visible over the normal pin style)

**Given** the user moves the mouse off the row
**When** the mouse-leave event fires
**Then** `highlightedPoiId` is set to null and the highlight ring disappears from the canvas

**Given** the user clicks a POI row
**When** the click occurs
**Then** `selectedItemId` is set to that POI's id
**And** the Right Panel opens (if closed) showing that POI's properties
**And** the MapCanvas best-effort pans to make the selected pin visible in viewport

**Given** the user clicks a POI pin on the canvas while the Content Tab is active
**When** `selectedItemId` changes to that POI's id
**Then** the POI List smooth-scrolls so the corresponding row becomes visible
**And** clicking away to deselect does not scroll the list

**Given** a POI is renamed or tags are changed via the Right Panel
**When** the change is committed
**Then** the corresponding POI List row updates reactively

**Given** `bun test` after this story
**Then** all existing tests pass

---

### Story 7.7: Right Panel Restyling + Responsive Layout Polish

As a map builder,
I want the Right Panel to match the new teal theme and the full layout to work at >=1024px viewport width,
So that the builder is visually consistent end-to-end and usable on a laptop without overflow.

**Acceptance Criteria:**

**Given** a POI is selected and the Right Panel is open
**When** it renders
**Then** all Switch components use the primary teal color when active (via MUI theme)
**And** all text fields use the MUI outlined variant
**And** the panel header ("POI Properties") uses the same MUI Typography variant and spacing as the Left Panel tab headers
**And** the panel background is `background.paper` white
**And** the close button is styled consistently with the new theme

**Given** a Graph Node is selected and NodeInfo renders in the Right Panel
**When** it renders
**Then** the Lock position Switch is teal when locked
**And** node ID and position use consistent MUI Typography

**Given** the Right Panel is open
**When** it overlays the canvas
**Then** the canvas area does not shrink or shift horizontally
**And** the Right Panel slides in from the right (MUI Drawer or fixed positioning)

**Given** browser viewport width is 1280px with the Right Panel open
**When** the layout renders
**Then** no horizontal scrollbar appears
**And** the canvas fills available space between Left Panel (~240px) and Right Panel overlay (~300px)

**Given** browser viewport width is exactly 1024px with Right Panel closed
**When** the layout renders
**Then** no horizontal scrollbar appears and all UI controls remain reachable and usable

**Given** `bun test` after this story
**Then** all existing tests pass with no regressions in MapCanvas or store behavior

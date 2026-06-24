---
title: "ResortMap Builder — UI/UX Redesign (Epic 7)"
status: final
created: 2026-06-24
updated: 2026-06-24
---

# PRD: ResortMap Builder — UI/UX Redesign

## 0. Document Purpose

This PRD defines requirements for a full visual and structural overhaul of `packages/builder-react`, the map editing interface of the ResortMap toolchain. It targets Floran as the sole user/builder. Downstream artifacts are epics and stories fed to Amelia (bmad-agent-dev). The reference design is a Mosaico-style editor (teal + off-white palette, tabbed left panel, tool squares, centered canvas with mode toggle). Vocabulary introduced here is defined in §3 (Glossary) and used verbatim throughout.

---

## 1. Vision

The ResortMap Builder needs a polished, professional editing environment that matches the quality of tools like Mosaico or Stripo — a clean chrome of navigation actions at the top, a structured two-tab left panel for tools and content, a dominant canvas in the center, and a retractable properties panel on the right. The Builder currently works well as plumbing; this redesign makes it enjoyable to use for extended map-editing sessions.

Two critical additions drive the redesign beyond aesthetics: a **Builder/Preview mode toggle** that lets Floran switch from editing into a live viewer preview (powered by `@resort-map/viewer`) without leaving the tool, and a **POI Content tab** that provides a searchable, scrollable inventory of placed POIs with map bidirectional highlighting.

The entire theme is parameterized via a `ThemeConfig` prop so the builder shell can be reskinned without code changes — useful for embedding in future dashboards or resort-branded portals.

---

## 2. Target User

### 2.1 Jobs To Be Done

- **Place and configure map content efficiently** — tools always reachable, one click away, never buried in menus.
- **Survey all placed POIs** — see the full list, scan labels/icons/tags, identify gaps or duplicates.
- **Sanity-check the map before export** — switch to Preview to see exactly what the visitor will see, then switch back to fix it.
- **Work on a laptop for hours** — the layout must not fatigue: clear hierarchy, consistent spacing, no visual noise.

### 2.2 Key User Journeys

**UJ-1. Floran places and labels a batch of POIs.**
Floran opens the builder with a background map already loaded. He clicks the Place POI tool in the Tools tab (left panel), places 10 pins on the canvas, then switches to the Content tab to review the list. He hovers each row to confirm its map location, renames ambiguous ones in the Right Panel, and adds tags. Entry: builder open, Tools tab active. Path: switch to Place POI tool → click canvas 10× → switch to Content tab → hover rows → click a row to select → rename in Right Panel. Climax: all 10 POIs visible and labelled in the list. Resolution: Floran saves the map.

**UJ-2. Floran previews the visitor experience.**
Floran switches the center canvas to Preview mode via the mode toggle bar. The canvas replaces the editable map with the `@resort-map/viewer` component. He can see the POI markers and the map background exactly as a visitor would, but cannot edit anything. He switches back to Builder mode, adjusts two POI positions, and switches to Preview again to confirm. Entry: map fully edited. Path: click Preview → inspect → click Builder → adjust → click Preview again. Climax: visual confirmation matches intent. Resolution: Floran exports the map.

**UJ-3. Floran reskins the builder for a client embed.**
Floran passes a custom `ThemeConfig` object to the `<App>` component with the resort's brand primary color. The top bar, tab indicators, and active tool highlight all switch to the brand color without any other code change. Entry: integration in a parent app. Path: pass `themeConfig={{ primaryColor: '#c0392b' }}` → builder re-renders. Climax: builder chrome matches resort branding. Resolution: embed ships.

---

## 3. Glossary

- **Builder mode** — The canvas state where the map is editable (tools active, POI/node placement enabled). Default state on open.
- **Preview mode** — The canvas state where `@resort-map/viewer` renders with `preview={true}`, disabling all editing interaction; shows exactly what a visitor sees.
- **Mode Toggle Bar** — The horizontal bar above the canvas containing the Builder / Preview segment toggle.
- **Top Nav Bar** — The fixed horizontal bar at the very top of the application containing global action buttons (Save, Export, Undo, Redo, Quit).
- **Left Panel** — The fixed-width sidebar on the left containing two tabs: Tools Tab and Content Tab.
- **Tools Tab** — The first tab of the Left Panel; contains Tool Squares and the Map Config section.
- **Tool Square** — A square icon button representing one editing tool (Select, Place POI, Draw Street, Set Scale, Pan).
- **Map Config section** — The area below Tool Squares in the Tools Tab containing global map settings: background image URL/file, scale (m/px), and set-center action.
- **Content Tab** — The second tab of the Left Panel; contains the POI List.
- **POI List** — A scrollable, vertically-stacked list of all placed POIs displayed in the Content Tab, each row showing the POI's icon, label, and tags.
- **Hover Highlight** — The visual emphasis applied to a POI's canvas pin when the user hovers its row in the POI List.
- **Right Panel** — The retractable overlay panel anchored to the right edge that shows properties of the selected POI or graph node. Same functional content as current; restyled.
- **ThemeConfig** — A configuration object prop on `<App>` that overrides the MUI theme palette (primary color, background colors, text colors).
- **Active Tool** — The currently selected editing tool; stored in the Zustand store; forced to Select when Content Tab is open.

---

## 4. Features

### 4.1 Top Nav Bar

**Description:** A slim fixed bar across the full width of the application, containing global action buttons aligned left and right per the reference design. Left side: app name or logo mark. Right side: Undo, Redo, then Save, Export, Quit. All buttons use the MUI outlined or contained style in the primary teal palette. Undo/Redo icon-only (with tooltip); Save/Export/Quit labeled. The bar height is compact (~48px) to give maximum vertical space to the canvas.

**Functional Requirements:**

#### FR-1: Undo action
Builder exposes an Undo button in the Top Nav Bar that calls the existing `undo()` store action. Button is disabled when `undoStack` is empty.

**Consequences:**
- Pressing Undo reverts the last map mutation; canvas reflects the change immediately.
- Button is visually disabled (MUI `disabled` prop) when no undo history exists.

#### FR-2: Redo action
Builder exposes a Redo button in the Top Nav Bar that calls a new `redo()` store action. Button is disabled when `redoStack` is empty.

**Consequences:**
- Pressing Redo reapplies the last undone mutation.
- `redo()` is added to the Zustand store (already exists per codebase context — confirm wired to UI).

**[ASSUMPTION: redo() already exists in mapStore.ts from a prior implementation; this FR wires it to the new UI button.]**

#### FR-3: Save action with onSave hook
`<App>` accepts an optional `onSave?: (config: MapConfig) => void` prop. Clicking Save calls this hook with the current `MapConfig`. If no hook is provided, the default behavior downloads the config as a `.gwmap` JSON file.

**Consequences:**
- Button is disabled when `mapConfig` is null.
- The `onSave` prop and `MapConfig` type are both exported from `packages/builder-react` so embedding apps can type the hook without a separate import.
- Default download behavior: `URL.createObjectURL(new Blob([JSON.stringify(config)]))` → click → revoke.

#### FR-4: Export action
Builder exposes an Export button. In v1 this is a placeholder (disabled or duplicates Save behavior) reserved for future alternative export formats (e.g. GeoJSON, SVG overlay).

#### FR-5: Quit action
Builder exposes a Quit button. If unsaved changes exist (detected by comparing current `mapConfig` to the last-saved snapshot), a confirmation dialog is shown before navigating away. `[ASSUMPTION: in standalone mode, "quit" triggers `window.close()` or `window.history.back()`; embedding apps can override via an `onQuit?: () => void` prop.]`

---

### 4.2 Left Panel — Two-Tab Structure

**Description:** A fixed-width left panel (~240px) with two tabs at the top: "Tools" and "Content". The tab indicator uses the primary teal color. Switching tabs is instant; no data is lost. When the Content Tab is active, the Zustand `activeTool` is forced to `'select'` and locked (tool buttons in the Tools Tab are visually disabled or hidden).

**Functional Requirements:**

#### FR-6: Tab switching
User can switch between Tools Tab and Content Tab via tab header buttons. Active tab is indicated by the primary color underline (MUI Tabs component style).

**Consequences:**
- Switching to Content Tab sets `activeTool = 'select'` in the store.
- Switching back to Tools Tab restores the previously active tool. `[ASSUMPTION: last tool before Content Tab is remembered in local state, not the store.]`
- The active tab persists for the session (local React state, not persisted).

---

### 4.3 Tools Tab

**Description:** The Tools Tab contains two vertical sections. Top section: a grid of Tool Squares (2 columns) for each editing tool. Bottom section: Map Config (background image, scale, set-center). Matches the reference image's "Content" block of icon squares with labels beneath each icon.

**Functional Requirements:**

#### FR-7: Tool Squares grid
Each editing tool (Select, Place POI, Draw Street, Set Scale, Pan) is rendered as a square icon button (~80×72px) with the tool icon centered and a short label beneath. The active tool square has a teal background or border highlight. Inactive squares have a white/off-white background with a subtle border.

**Consequences:**
- Clicking a Tool Square sets `activeTool` in the Zustand store.
- The active Tool Square is visually distinct (filled teal background + white icon, or primary-colored border — per design).
- Tool Squares are disabled (not clickable) when Content Tab is active.

#### FR-8: Map Config section
Below the Tool Squares, a divider separates a "Map Config" section containing:
- Background image input: text field + Browse button (existing `MapMetaPanel` functionality).
- Scale (m/px): number input (existing).
- Set Center: button that activates `setCenter` tool mode (existing).
All controls maintain existing functional behavior; only visual style changes to match new theme.

**Consequences:**
- All Map Config controls function identically to the current implementation.
- Visual style uses MUI components styled to match the new theme.

---

### 4.4 Content Tab — POI List

**Description:** A scrollable list of all placed POIs, rendered as compact rows. Each row shows: POI icon (from `poi-icons` registry, or a placeholder circle if no icon), POI label, and up to 3 tags as small chips. Hovering a row applies a Hover Highlight to the corresponding pin on the canvas. Clicking a row selects the POI (sets `selectedItemId`) and, if the Right Panel is closed, opens it. When a POI is selected on the canvas while the Content Tab is active, the list scrolls to that POI's row.

**Functional Requirements:**

#### FR-9: POI List rendering
Content Tab renders one row per POI in `mapConfig.pois`, in insertion order. Each row contains:
- Icon: 24×24px POI icon from the `poi-icons` registry keyed by `poi.icon`, or a red circle fallback.
- Label: `poi.label`, truncated with ellipsis if overflowing.
- Tags: up to 3 `<Chip size="small">` components; if more than 3 tags, show "+N" chip.

**Consequences:**
- List updates reactively when POIs are added, removed, or renamed.
- Empty state: "No POIs placed yet." message centered in the tab area.

#### FR-10: Hover Highlight
Hovering a POI row in the Content Tab sets a `highlightedPoiId` state (local to Left Panel or in store). The MapCanvas applies a distinct highlight ring (e.g., pulsing or enlarged ring) to the matching POI pin.

**Consequences:**
- Highlight is visible on the canvas while the mouse is over the row.
- Highlight is removed when the mouse leaves the row.
- `[ASSUMPTION: highlightedPoiId` stored in Zustand store as `highlightedPoiId: string | null` for MapCanvas access without prop drilling.]

#### FR-11: POI selection from list
Clicking a POI row sets `selectedItemId` to that POI's id. If the Right Panel is closed, it opens. The map scrolls/pans to make the selected POI visible. `[ASSUMPTION: map pan-to-POI is best-effort; if the POI is already in view, no pan occurs.]`

#### FR-12: List scroll-to-selected (map → list sync)
When `selectedItemId` changes to a POI id while the Content Tab is active, the POI List scrolls (smooth) so the selected row is visible. Realized by UJ-1.

**Consequences:**
- Clicking a POI pin on the canvas while on the Content Tab scrolls the list to that row.
- Clicking away (deselect) does not scroll.

---

### 4.5 Center Canvas — Mode Toggle Bar

**Description:** Immediately above the MapCanvas, a compact bar (~40px) contains a segmented toggle: "Builder" | "Preview". This is the sole mechanism for switching canvas mode. The active mode segment uses the primary teal color fill.

**Functional Requirements:**

#### FR-13: Mode toggle control
User can switch canvas mode between Builder and Preview via the Mode Toggle Bar. Mode is stored in React state local to the canvas area (not in the Zustand map store, since it doesn't affect map data).

**Consequences:**
- Switching to Preview mode unmounts (or hides) the MapCanvas and mounts the Viewer component.
- Switching back to Builder mode restores the MapCanvas with all current state intact (no data loss).
- Active mode segment is visually distinct (filled primary color).

#### FR-14: Builder mode canvas
In Builder mode, the center area renders the existing `MapCanvas` component with all current functionality (tool interaction, drag, zoom/pan, node/edge rendering, zoom controls overlay). No functional changes to MapCanvas in this epic.

#### FR-15: Preview mode canvas
In Preview mode, the center area renders `<ViewerComponent mapConfig={mapConfig} preview={true} />` from `@resort-map/viewer`. The `preview={true}` prop disables all interactive viewer features (filtering panel, routing, search) and shows only the map background and POI pins as a visitor would see them.

**Consequences:**
- The viewer renders the current live `mapConfig` from the Zustand store.
- No editing tools are accessible in Preview mode.
- If `mapConfig` is null, Preview mode shows the same "No map loaded" empty state.
- **Prerequisite:** `@resort-map/viewer` must be updated to support the `preview` prop before this FR can be implemented. Adding `preview` support to the viewer is a story in this epic (see FR-21).

#### FR-21: Add `preview` prop to `@resort-map/viewer` (prerequisite)
The `@resort-map/viewer` package is updated to accept a `preview?: boolean` prop on its root component. When `preview={true}`:
- The FilterPanel is not rendered.
- The RoutePanel (if present) is not rendered.
- POI pins are not clickable / interactive (display-only).
- Any search, distance-input, or navigation controls are hidden.
- The map background and POI pin positions render identically to the normal viewer.

**Consequences:**
- When `preview` is `false` or absent, viewer behavior is unchanged (fully backward-compatible).
- The `preview` prop is typed in the viewer's exported component props type.
- A visual "Preview" badge or watermark is shown in the viewer canvas corner to distinguish preview from production renders. `[ASSUMPTION: small, unobtrusive — e.g. a chip in the bottom-left corner.]`

---

### 4.6 Right Panel — Restyled Properties

**Description:** The Right Panel retains all existing functionality: shows POI properties (`PoiEditor`) or Node properties (`NodeInfo`) for the selected item; is retractable (slides in/out); overlays the canvas rather than pushing it. Visual style is updated to match the new theme: white background, teal accents on switches and focused fields, consistent MUI component usage.

**Functional Requirements:**

#### FR-16: Right Panel visual restyling
All components in the Right Panel (`PoiEditor`, `NodeInfo`, form controls, the close button) are restyled to use the new MUI theme. No functional changes.

**Consequences:**
- Switch components use primary teal color when active.
- Text fields use outlined variant consistent with the rest of the UI.
- The panel header uses the same typography and spacing as the Left Panel tabs.

#### FR-17: Right Panel overlay behavior
The Right Panel overlays the canvas (position: fixed or absolute, right-anchored) and does not push/resize the canvas area. `[ASSUMPTION: this is already the case in the current implementation; this FR confirms it is preserved in the redesign.]`

---

### 4.7 Theme System

**Description:** The entire builder shell is wrapped in an MUI `ThemeProvider`. A default theme is defined matching the reference image palette (teal primary, off-white sidebars, light gray canvas surround). The `<App>` component accepts an optional `themeConfig?: ThemeConfig` prop that deep-merges with the default theme, allowing override of any palette token.

**Functional Requirements:**

#### FR-18: Default theme palette
The default MUI theme uses:
- `primary.main`: `#009688` (teal, matching reference image)
- `primary.contrastText`: `#ffffff`
- `background.paper`: `#ffffff` (panel backgrounds)
- `background.default`: `#f0f0f0` (canvas surround/app background)
- `text.primary`: `#333333`
- `divider`: `#e0e0e0`

**Consequences:**
- All MUI components pick up the theme automatically via ThemeProvider.
- Canvas surround (`<rect>` in SVG) and app background use `background.default`.

#### FR-19: ThemeConfig prop
`<App>` accepts `themeConfig?: ThemeConfig` where `ThemeConfig` is a partial MUI theme options object (or a simplified subset — see Addendum). The provided config is deep-merged with the default theme via `createTheme(deepMerge(defaultTheme, themeConfig))`.

**Consequences:**
- Passing `{ palette: { primary: { main: '#c0392b' } } }` switches all teal accents to red.
- `ThemeConfig` type is exported from `packages/builder-react` so embedding apps can import it.
- No restart required; theme applies at mount.

`ThemeConfig` is typed as `Partial<ThemeOptions>` from MUI and re-exported from `packages/builder-react` as a named export. A documented usage example is included in the package README.

---

### 4.8 Responsive Behavior

**Description:** The builder layout must remain usable at viewport widths ≥ 1024px. Panels do not need to collapse on narrow screens, but should not overflow or cause horizontal scrollbars at 1280px (standard laptop). Below 1024px behavior is undefined (out of scope).

**Functional Requirements:**

#### FR-20: Minimum usable width
At viewport width ≥ 1024px, the full layout (Left Panel + Canvas + Right Panel when open) renders without horizontal overflow. The canvas area flexibly fills remaining space.

**Consequences:**
- Left Panel width is fixed (~240px).
- Right Panel (when open) is fixed-width (~280–320px) and overlays the canvas (does not shrink it).
- Canvas area uses `flex: 1` and `min-width: 0`.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Mode switching (Builder ↔ Preview) completes within one render cycle with no visible flash.
- POI List renders up to 500 POIs without scroll lag (virtualization is out of scope for v1; `[ASSUMPTION: typical resort maps have <200 POIs]`).
- Theme provider wraps the app once at root; no per-render theme creation.

### 5.2 Accessibility
- All interactive controls have `aria-label` or visible label.
- Keyboard navigation: Tab order follows spatial layout (Top Nav → Left Panel → Canvas → Right Panel).
- Tool Squares have tooltips (MUI `Tooltip`) with tool names.

### 5.3 Package Constraints
- `packages/builder-react` uses Bun; add MUI dependencies via `bun install`.
- No new bundler (Bun's built-in HTML import bundler remains).
- `@resort-map/viewer` is consumed as a workspace package (`workspace:*`); no external fetch.

---

## 6. Open Questions

All previously identified open questions are resolved (see decision log D-7 through D-10). No open questions remain.

---

## 7. Success Metrics

The redesign is considered successful when:
- SM-1: Floran can complete a full map-editing session (place POIs, draw streets, configure map, preview, save) without switching browser tabs or consulting current code.
- SM-2: Switching Builder ↔ Preview and back preserves all map state (no POI or edge loss).
- SM-3: Passing a custom `themeConfig: { palette: { primary: { main: '#c0392b' } } }` to `<App>` changes all teal accents to red without touching component code.
- SM-5: Clicking Save with an `onSave` hook fires the hook with the current `MapConfig`; without a hook, a `.gwmap` file downloads automatically.
- SM-4: The POI Content tab correctly highlights the hovered POI on the canvas and scrolls to the selected POI when selection changes via canvas click.

**Counter-metrics:**
- CM-1: Mode switching should not introduce re-renders that reset map view state (zoom/pan position lost = regression).
- CM-2: ThemeConfig should not require re-mounting the entire app to take effect.

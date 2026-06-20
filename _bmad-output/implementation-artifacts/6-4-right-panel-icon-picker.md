---
id: 6-4
title: "Builder React — Right Properties Panel & POI Icon Picker"
epic: 6
status: ready-for-dev
created: 2026-06-20
updated: 2026-06-20
depends-on: [6-1, 6-3]
---

## Story

As a map author, I want a retractable right panel that shows me the selected POI or node's properties, and lets me pick a POI icon from a visual palette, so editing a POI is fast and feels professional.

## Context

This is the final story of Epic 6. It replaces the current `Sidebar` component with a MUI `<Drawer>` that overlays the map (does not push it), integrates `@resort-map/poi-icons` for the icon picker, and migrates the remaining raw-HTML POI/node editors to MUI components.

After this story, no raw `style={{}}` blocks should remain in the builder-react component tree (only `sx` props and MUI system utilities).

**Files touched:**
- `packages/builder-react/src/components/Sidebar.tsx` — replaced entirely
- `packages/builder-react/src/components/RightPanel.tsx` — new file (replaces Sidebar)
- `packages/builder-react/src/App.tsx` — swap `<Sidebar>` for `<RightPanel>`
- `packages/builder-react/package.json` — add `@resort-map/poi-icons` workspace dep

**Relevant PRD sections:** F5 (FR-5.2), F6 (FR-6.1–6.8), NFR-6.1, NFR-6.4.

## Acceptance Criteria

**AC-1 — Panel starts closed**
- Given: the app loads with no selection
- When: the canvas is rendered
- Then: the right panel is not visible (zero width, no overlay)

**AC-2 — Panel opens on selection**
- Given: `selectedItemId` is null
- When: user clicks a POI or node on the canvas, setting `selectedItemId`
- Then: the right panel slides in from the right at 320 px wide, overlaying the map

**AC-3 — Panel closes on deselect**
- Given: the right panel is open with a POI selected
- When: user clicks the close button (`<ChevronRightIcon>`) in the panel header
- Then: `selectedItemId` is set to null and the panel closes; the map canvas is fully visible again

**AC-4 — Panel does not push the canvas**
- Given: the right panel is open
- When: layout is inspected
- Then: the map canvas remains the same width as when the panel is closed (panel overlays via fixed/absolute positioning or `z-index` layering)

**AC-5 — POI panel header**
- Given: a POI is selected
- When: the right panel is open
- Then: the header shows "POI Properties" as MUI `<Typography variant="h6">` and a close icon button

**AC-6 — POI Label field**
- Given: POI panel is open
- When: user edits the Label `<TextField>` and blurs / presses Enter
- Then: `updatePoi(poi.id, { label: newValue })` is called

**AC-7 — POI Tags**
- Given: POI panel is open
- When: user types a tag into the tag input and presses Enter
- Then: `updatePoi(poi.id, { tags: [...current, newTag] })` is called and a MUI `<Chip>` appears
- When: user clicks the chip's delete icon
- Then: `updatePoi(poi.id, { tags: remaining })` is called and the chip disappears

**AC-8 — Icon picker grid visible**
- Given: POI panel is open
- When: the icon section is rendered
- Then: a grid of icon buttons is visible, one per entry in `POI_ICONS` from `@resort-map/poi-icons`, plus a "None" cell at position 0

**AC-9 — Icon selection**
- Given: POI panel is open and POI has no icon set
- When: user clicks the "Restaurant" icon cell
- Then: `updatePoi(poi.id, { icon: 'restaurant' })` is called and the Restaurant cell shows a MUI primary-color outline

**AC-10 — Icon clear**
- Given: POI has `icon: 'restaurant'`
- When: user clicks the "None" cell
- Then: `updatePoi(poi.id, { icon: undefined })` is called

**AC-11 — Node panel**
- Given: a graph node is selected (not a POI)
- When: the right panel is open
- Then: the header shows "Node Properties"; node ID is displayed in a `<Typography>` monospace style with a copy-to-clipboard `<IconButton>`; position (x, y) is displayed as formatted text

**AC-12 — Node copy to clipboard**
- Given: node panel is open
- When: user clicks the copy icon button
- Then: `navigator.clipboard.writeText(node.id)` is called and the button briefly shows a `<CheckIcon>` (500 ms) before reverting

**AC-13 — No raw style props remain**
- Given: all component files in `packages/builder-react/src/`
- When: searched for `style={{`
- Then: zero matches (all replaced by MUI `sx` prop or MUI component defaults)

**AC-14 — Node ID field**
- Given: POI panel is open
- When: user edits the Node ID `<TextField>` and blurs
- Then: `updatePoi(poi.id, { nodeId: trimmedValue || undefined })` is called

## Tasks

1. **`packages/builder-react/package.json`** — add `"@resort-map/poi-icons": "workspace:*"` to `dependencies`; run `bun install` from monorepo root
2. **`src/components/RightPanel.tsx`** (new) — implement MUI `<Drawer anchor="right" variant="persistent" open={open}>` where `open = selectedItemId !== null`. Structure:
   - Outer: `<Drawer sx={{ '& .MuiDrawer-paper': { width: 320, position: 'fixed', zIndex: (theme) => theme.zIndex.drawer + 1 } }}>` so it overlays the canvas
   - Header: `<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>` with `<Typography variant="h6">` and `<IconButton onClick={() => setSelectedItemId(null)}><ChevronRightIcon/></IconButton>`
   - `<Divider />`
   - Body: `{selectedPoi ? <PoiEditor poi={selectedPoi} /> : selectedNode ? <NodeInfo node={selectedNode} /> : null}`
3. **`PoiEditor` sub-component** inside `RightPanel.tsx`:
   - `<TextField label="Label" fullWidth value={labelDraft} onChange onBlur>` (commit on blur / Enter)
   - Tags section: `<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>` of `<Chip label={tag} onDelete={() => removeTag(tag)}>` + `<TextField label="Add tag" size="small" onKeyDown Enter handler>`
   - Icon picker: `<Typography variant="subtitle2">Icon</Typography>` + `<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>` with a "None" cell + one `<Tooltip title={entry.label}><IconButton onClick={() => selectIcon(key)} sx={{ outline: isSelected ? '2px solid primary.main' : 'none' }}><entry.Icon /></IconButton></Tooltip>` per POI_ICONS entry
   - `<TextField label="Node ID" fullWidth ...>` (commit on blur)
4. **`NodeInfo` sub-component** inside `RightPanel.tsx`:
   - `<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>` with `<Typography sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{node.id}</Typography>` + `<IconButton size="small" onClick={copyId}>{copied ? <CheckIcon fontSize="small"/> : <ContentCopyIcon fontSize="small"/>}</IconButton>`
   - `<Typography variant="body2">Position: ({node.position.x}, {node.position.y})</Typography>`
5. **`src/App.tsx`** — replace `<Sidebar />` with `<RightPanel />`; remove `import { Sidebar }`; the RightPanel's fixed positioning means it does not need to be inside the flex row as a sibling — it can be a sibling of the entire content area or inside it (either works with `position: fixed`)
6. **Delete `src/components/Sidebar.tsx`** — fully replaced by RightPanel
7. **Verify `bun test`** passes; verify no `style={{` in component files (`grep -r "style={{" packages/builder-react/src/`)

## Design Notes

- **Overlay approach:** Use `position: 'fixed'` on the Drawer paper with a high `z-index`. This is the cleanest way to overlay without affecting flex layout. Alternatively, wrap the canvas + right panel in a `position: relative` container and use `position: absolute` on the drawer paper — both work.
- **`open` state:** Do NOT add a local `isOpen` boolean. Drive open/close purely from `selectedItemId !== null`. The close button calls `setSelectedItemId(null)`.
- **Icon picker:** Import `POI_ICONS` from `@resort-map/poi-icons`. The stored `poi.icon` value is the registry key string (e.g. `"restaurant"`). When rendering an existing POI on the canvas, the `MapCanvas` will need to look up the icon by key in a follow-up — that is out of scope for this story; `poi.icon` was previously a URL string, changing to a key is a breaking schema change. To avoid breaking MapCanvas rendering: store the key AS-IS and let MapCanvas rendering fall back gracefully when `icon` is not a URL (it currently ignores invalid URLs). Document this gap as a TODO for a future story.
- **`copied` state for clipboard:** local `useState<boolean>(false)` that resets to `false` after `setTimeout(500)`.
- After this story, `grep -r "style={{" packages/builder-react/src/` must return zero results. Fix any stragglers found during implementation.

## Spec Change Log

| Date | Change |
|---|---|
| 2026-06-20 | Initial creation |

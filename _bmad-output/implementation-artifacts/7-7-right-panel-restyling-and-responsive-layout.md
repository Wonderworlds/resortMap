---
baseline_commit: 75d5b0b691f3b4f4850bfc9ac88177963375cd80
---

# Story 7.7: Right Panel Restyling + Responsive Layout Polish

Status: review

## Story

As a map builder,
I want the Right Panel to match the new teal theme and the full layout to work at >=1024px viewport width,
So that the builder is visually consistent end-to-end and usable on a laptop without overflow.

## Acceptance Criteria

1. **Given** a POI is selected and the Right Panel is open, **when** it renders, **then** all Switch components use the primary teal color when active (via MUI theme), all text fields use the MUI outlined variant, the panel header ("POI Properties") uses `Typography variant="subtitle2"` and the same `p: 1` spacing as the LeftPanel Tabs bar area, the panel background is `background.paper` white (explicit), and the close button has an `aria-label`.

2. **Given** a Graph Node is selected and NodeInfo renders in the Right Panel, **when** it renders, **then** the Lock position Switch is teal when locked (uses `color="primary"`), and node ID uses `Typography variant="caption"` with a monospace font stack.

3. **Given** the Right Panel is open, **when** it overlays the canvas, **then** the canvas area does not shrink or shift horizontally — the existing `position: 'fixed'` on the Drawer paper already achieves this and must be preserved.

4. **Given** browser viewport width is 1280px with the Right Panel open, **when** the layout renders, **then** no horizontal scrollbar appears and the canvas fills available space between Left Panel (~240px) and Right Panel overlay (~300px).

5. **Given** browser viewport width is exactly 1024px with Right Panel closed, **when** the layout renders, **then** no horizontal scrollbar appears and all UI controls remain reachable and usable.

6. **Given** `bun test` after this story, **then** all 282 existing tests pass with no regressions.

## Tasks / Subtasks

- [x] Task 1: Restyle `RightPanel.tsx` — header typography (AC: 1, 2)
  - [x] 1.1 Change the panel title `Typography variant="h6"` to `variant="subtitle2"` in the header Box so it visually matches Left Panel Tab label size/weight (14px, fontWeight 500)
  - [x] 1.2 Add `aria-label="Close panel"` to the close `IconButton` (AC 1, NFR-4 accessibility)

- [x] Task 2: Restyle `RightPanel.tsx` — Switch color and TextField variant (AC: 1, 2)
  - [x] 2.1 Add `color="primary"` to the Lock position `Switch` in `PoiEditor` so it renders teal when checked
  - [x] 2.2 Add `color="primary"` to the Lock position `Switch` in `NodeInfo`
  - [x] 2.3 Add `variant="outlined"` explicitly to the Label TextField in `PoiEditor`
  - [x] 2.4 Add `variant="outlined"` explicitly to the "Add tag" TextField in `PoiEditor`
  - [x] 2.5 Add `variant="outlined"` explicitly to the "Node ID" TextField in `PoiEditor`

- [x] Task 3: Restyle `RightPanel.tsx` — panel background and NodeInfo typography (AC: 1, 2)
  - [x] 3.1 Add `bgcolor: 'background.paper'` to the `'& .MuiDrawer-paper'` sx object in the `Drawer`
  - [x] 3.2 In `NodeInfo`, changed node ID `Typography` to `variant="caption"` with `sx={{ fontFamily: "'Courier New', monospace", wordBreak: 'break-all', flex: 1 }}`

- [x] Task 4: Responsive fix — add `minWidth: 0` to `CenterCanvas.tsx` (AC: 4, 5)
  - [x] 4.1 Added `minWidth: 0` to the outer `<Box>` in `CenterCanvas.tsx`

- [x] Task 5: Run full test suite (AC: 6)
  - [x] 5.1 `bun test` — 282/282 pass, zero regressions

## Dev Notes

### Files to Modify (UPDATE — read before touching)

| File | Change |
|------|--------|
| `packages/builder-react/src/components/RightPanel.tsx` | Header typography, Switch color, TextField variant, Drawer bgcolor, NodeInfo caption |
| `packages/builder-react/src/components/CenterCanvas.tsx` | Add `minWidth: 0` to outer Box |

### No files to create (NEW)

All changes are restyling only. No new components, no new files, no new store state, no new dependencies.

### `RightPanel.tsx` — current state (read this before touching)

The file has four exported/internal units:
- `RightPanel()` — Drawer wrapper with header and content routing
- `PoiEditor({ poi, updatePoi })` — POI property form: Label TextField, Tags section, Icon grid, Node ID TextField, Lock Switch
- `NodeInfo({ node, updateNode })` — Node property display: ID + copy button, Position text, Lock Switch
- Local helpers: `copyId()`, `closePanel()`

**What each task changes (targeted diffs only):**

**Task 1 — header (in `RightPanel` function):**

Current header Box (lines 57-62 in current file):
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
  <Typography variant="h6">{panelTitle}</Typography>
  <IconButton onClick={closePanel} size="small">
    <ChevronRightIcon />
  </IconButton>
</Box>
```

After:
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
  <Typography variant="subtitle2">{panelTitle}</Typography>
  <IconButton onClick={closePanel} size="small" aria-label="Close panel">
    <ChevronRightIcon />
  </IconButton>
</Box>
```

**Task 2 — Switches and TextFields (in `PoiEditor`):**

Label TextField — add `variant="outlined"`:
```tsx
<TextField
  label="Label"
  fullWidth
  size="small"
  variant="outlined"
  value={labelDraft}
  onChange={(e) => setLabelDraft(e.target.value)}
  onBlur={commitLabel}
  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
/>
```

"Add tag" TextField — add `variant="outlined"`:
```tsx
<TextField
  label="Add tag"
  size="small"
  fullWidth
  variant="outlined"
  value={newTag}
  onChange={(e) => setNewTag(e.target.value)}
  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
  onBlur={addTag}
/>
```

"Node ID" TextField — add `variant="outlined"`:
```tsx
<TextField
  label="Node ID"
  fullWidth
  size="small"
  variant="outlined"
  value={nodeIdDraft}
  onChange={(e) => setNodeIdDraft(e.target.value)}
  onBlur={commitNodeId}
  placeholder="Link to graph node…"
/>
```

Lock position Switch in `PoiEditor` — add `color="primary"`:
```tsx
<Switch
  color="primary"
  size="small"
  checked={poi.locked ?? false}
  onChange={(e) => updatePoi(poi.id, { locked: e.target.checked })}
/>
```

Lock position Switch in `NodeInfo` — add `color="primary"`:
```tsx
<Switch
  color="primary"
  size="small"
  checked={node.locked ?? false}
  onChange={(e) => updateNode(node.id, { locked: e.target.checked })}
/>
```

**Task 3 — Drawer bgcolor and NodeInfo typography:**

Drawer `sx` — add `bgcolor`:
```tsx
sx={{
  '& .MuiDrawer-paper': {
    width: 320,
    position: 'fixed',
    zIndex: (theme) => theme.zIndex.drawer + 1,
    overflowY: 'auto',
    bgcolor: 'background.paper',
  },
}}
```

Node ID `Typography` in `NodeInfo` — change from raw sx to variant="caption":
```tsx
<Typography
  variant="caption"
  sx={{
    fontFamily: "'Courier New', monospace",
    wordBreak: 'break-all',
    flex: 1,
  }}
>
  {node.id}
</Typography>
```

### `CenterCanvas.tsx` — current outer Box (Task 4)

Current outer Box in `CenterCanvas`:
```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
```

After:
```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
```

**Why `minWidth: 0`:** In a CSS flexbox row, flex children have an implicit `min-width: auto`, which means the child won't shrink below the intrinsic size of its content (e.g., a wide SVG or the ToggleButtonGroup). Adding `minWidth: 0` allows the flex child to shrink below that intrinsic size, enabling the canvas to yield space at narrow viewports. This is the standard fix for flex overflow in responsive layouts. The canvas itself clips content via `overflow: hidden`, so shrinking it doesn't break rendering.

### Current App.tsx layout (DO NOT CHANGE)

```tsx
<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
  <AppBar onSave={onSave} onQuit={onQuit} />
  <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
    <LeftPanel />
    <CenterCanvas />
  </Box>
  {/* RightPanel uses position:fixed, so it sits outside the flex row */}
  <RightPanel />
</Box>
```

`App.tsx` does NOT need to change. The `RightPanel` is already outside the flex row (rendered after the `</Box>`) and uses `position: 'fixed'` in its Drawer paper — it overlays the canvas without affecting document flow. The responsive fix is solely the `minWidth: 0` on `CenterCanvas`.

### Why `Switch color="primary"` matters

MUI v5 `Switch` uses `secondary` color by default (not `primary`). Since our theme only defines `primary.main: #009688` and hasn't set a `secondary` palette, MUI falls back to its default secondary (a purple tone). Adding `color="primary"` explicitly routes the Switch's checked state color to `primary.main` = `#009688` (teal). This applies the thumb/track teal color when the Switch is in checked state.

### Why `TextField variant="outlined"` is added explicitly

MUI v5 TextField defaults to `variant="outlined"`, so the behavior is unchanged. Adding it explicitly:
- Makes the code's intent clear (explicitly matches the new theme's outlined style)
- Guards against any future global theme override of defaultProps that might change the variant
- Satisfies the AC's requirement to "use the MUI outlined variant"

### Why `variant="h6"` → `variant="subtitle2"` for the panel header

The Left Panel uses MUI `<Tabs>` at the top with `<Tab label="Tools" />` and `<Tab label="Content" />`. MUI Tab labels internally render at `fontSize: 0.875rem` (14px) with `fontWeight: 500` — which is exactly `Typography variant="subtitle2"` (14px, medium weight). Changing the Right Panel header from `h6` (20px, medium weight) to `subtitle2` makes both panels' header areas visually consistent in size and weight.

The existing header Box has `p: 1` (8px padding) which gives the header area a similar compact height to the Tabs bar (48px default). This padding does NOT need to change.

### Architecture Compliance

- Named export `RightPanel` ✓ (unchanged)
- No new imports (all MUI components already imported: `Switch`, `TextField`) ✓
- No new files, no new packages ✓
- `color="primary"` is a standard MUI prop, no extra imports needed ✓
- `minWidth: 0` is a CSS value as a number literal (in MUI sx) — use `0` not `'0px'` ✓

### Test Approach

No new tests for this story — all changes are pure UI restyling. The existing 282 tests cover all business logic (mapStore, svgCoords, theme, view packages). Run `bun test` to confirm no regressions.

### What NOT to Change

- `RightPanel.tsx` logic: all the `useState`, `commitLabel`, `commitNodeId`, `addTag`, `removeTag`, `selectIcon`, `clearIcon`, `copyId`, `closePanel` functions — ZERO changes
- `RightPanel.tsx` icon grid section — no changes
- `RightPanel.tsx` Tags chips section — no changes
- `App.tsx` — no changes
- `LeftPanel.tsx` — no changes
- `MapCanvas.tsx` — no changes
- `mapStore.ts` — no changes
- Any test files — no changes

### Context from Previous Stories

- **7.6 baseline**: 282 tests passing; `PoiList` added to Left Panel Content Tab, `highlightedPoiId`/`panTargetPoiId` in store, teal highlight ring in MapCanvas
- **Theme**: `primary.main: '#009688'` (teal), `contrastText: '#ffffff'`, `background.paper: '#ffffff'` — set in `packages/builder-react/src/theme.ts`
- **Switch default**: MUI v5 uses `secondary` color by default → must add `color="primary"` to get teal
- **TextField default**: MUI v5 defaults to `outlined` → adding explicit `variant="outlined"` is a clarification, not a functional change
- **RightPanel Drawer**: `position: 'fixed'` is already set on the paper — this is what makes it an overlay. Do NOT change this.
- **CenterCanvas outer Box**: currently `{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }` — only adding `minWidth: 0`

### References

- `packages/builder-react/src/components/RightPanel.tsx` — primary restyling target
- `packages/builder-react/src/components/CenterCanvas.tsx` — responsive fix (minWidth: 0)
- `packages/builder-react/src/theme.ts` — theme values (`primary.main: #009688`)
- PRD FR-16, FR-17, FR-20: `_bmad-output/planning-artifacts/epics.md` (lines 39, 42)
- Story 7.6 completion notes: `_bmad-output/implementation-artifacts/7-6-content-tab-poi-list-hover-highlight-bidirectional-sync.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_None_

### Completion Notes List

- Updated `RightPanel.tsx` — `Drawer` paper: added `bgcolor: 'background.paper'`; header: `Typography h6` → `subtitle2`, `IconButton` + `aria-label="Close panel"`; `PoiEditor`: added `variant="outlined"` to all 3 TextFields (Label, Add tag, Node ID), `color="primary"` to Lock position Switch; `NodeInfo`: `color="primary"` to Lock position Switch, node ID `Typography` → `variant="caption"` with monospace font stack.
- Updated `CenterCanvas.tsx` — added `minWidth: 0` to outer Box, enabling the canvas to shrink correctly at narrow viewports (FR-20 responsive fix).
- All 282 existing tests pass, zero regressions (`bun test`, 555ms). No new tests added (pure UI restyling).

### File List

- `packages/builder-react/src/components/RightPanel.tsx` (modified — restyling: header typography, Switch color, TextField variant, Drawer bgcolor, NodeInfo caption)
- `packages/builder-react/src/components/CenterCanvas.tsx` (modified — added `minWidth: 0` for responsive layout)

## Change Log

- 2026-06-24: Implemented story 7-7 — restyled RightPanel (teal switches, outlined TextFields, compact header, explicit bgcolor, NodeInfo caption typography) and fixed responsive layout with minWidth: 0 on CenterCanvas. 282 tests pass.

---
id: 6-2
title: "Builder React — MUI Foundation, AppBar & Store Redo"
epic: 6
status: review
created: 2026-06-20
updated: 2026-06-20
depends-on: []
baseline_commit: 7c006331f76cefa0cb115bc3e715cdebdca6ad74
---

## Story

As a map author, I want a proper top bar with Save, Export, Quit, Undo, and Redo buttons so I can manage my session without hunting through menus, and so my undo operations are reversible.

## Context

This story installs MUI into `builder-react`, extends the Zustand store with redo support, and replaces the current `<Toolbar>` component with a MUI `<AppBar>`. It does NOT yet restructure the sidebar or left panel — those come in Stories 6-3 and 6-4.

**Files touched:**
- `packages/builder-react/package.json` — add MUI deps
- `packages/builder-react/src/store/mapStore.ts` — add redo
- `packages/builder-react/src/components/Toolbar.tsx` → replaced by `AppBar.tsx`
- `packages/builder-react/src/App.tsx` — swap `<Toolbar>` for `<AppBar>`

**Relevant PRD sections:** F2 (FR-2.1–2.5), F3 (FR-3.1–3.5), NFR-6.1, NFR-6.3.

## Acceptance Criteria

**AC-1 — MUI installed**
- Given: `packages/builder-react/package.json`
- When: read
- Then: `@mui/material`, `@mui/icons-material`, and `@emotion/react`, `@emotion/styled` appear in `dependencies` (or `peerDependencies` for react)

**AC-2 — Redo state in store**
- Given: `useMapStore`
- When: the store is initialized
- Then: `redoStack` is `[]` and `redoStack.length` is `0`

**AC-3 — Undo pushes to redoStack**
- Given: the store has `undoStack: [A, B]` and `mapConfig: C`
- When: `undo()` is called
- Then: `mapConfig` becomes `B`, `undoStack` becomes `[A]`, `redoStack` becomes `[C]`

**AC-4 — Redo pops from redoStack**
- Given: `redoStack: [C]`, `undoStack: [A]`, `mapConfig: B`
- When: `redo()` is called
- Then: `mapConfig` becomes `C`, `redoStack` becomes `[]`, `undoStack` becomes `[A, B]`

**AC-5 — Mutating action clears redoStack**
- Given: `redoStack: [C]`
- When: any action that pushes to `undoStack` is called (e.g. `addPoi`)
- Then: `redoStack` is `[]`

**AC-6 — AppBar renders**
- Given: the app is loaded in a browser
- When: the page renders
- Then: a MUI `<AppBar>` is visible at the top with "ResortMap" text, Save button, Export button, Undo icon button, Redo icon button, and Quit icon button

**AC-7 — Button disabled states**
- Given: `mapConfig` is null
- When: the AppBar is rendered
- Then: Save and Export buttons are disabled; Undo button is disabled; Redo button is disabled

**AC-8 — Undo/Redo buttons reflect store state**
- Given: `undoStack.length === 0` and `redoStack.length === 0`
- When: AppBar renders
- Then: both Undo and Redo icon buttons have `disabled` prop true

**AC-9 — Export works from AppBar**
- Given: `mapConfig` is non-null
- When: user clicks Export
- Then: a `.gwmap` file download is triggered (same `serializeGwmap` logic as current `MapMetaPanel`)

**AC-10 — Quit shows confirmation dialog**
- Given: the app has unsaved state (`mapConfig` is non-null)
- When: user clicks Quit
- Then: a MUI `<Dialog>` appears with "Discard unsaved changes?" and Confirm / Cancel buttons

**AC-11 — Keyboard shortcuts**
- Given: the app is focused in a browser
- When: user presses Ctrl+Z
- Then: `undo()` is called
- When: user presses Ctrl+Y or Ctrl+Shift+Z
- Then: `redo()` is called

**AC-12 — Tests pass**
- Given: `bun test` runs in `packages/builder-react`
- When: store tests in `src/__tests__/mapStore.test.ts` are run
- Then: all existing tests pass AND new tests for `redo()`, `redoStack` clearing, and undo→redo interaction pass

## Tasks

1. [x] **Install MUI** — `bun add @mui/material @mui/icons-material @emotion/react @emotion/styled` inside `packages/builder-react`; verify `package.json` updated
2. [x] **`src/store/mapStore.ts`** — add `redoStack: MapConfig[]` to state; update `undo()` to push prior config onto `redoStack`; add `redo()` action; update all mutating actions to clear `redoStack`; update `MapStore` interface
3. [x] **`src/__tests__/mapStore.test.ts`** — add tests for AC-3, AC-4, AC-5 (undo-redo interaction, clearing on mutation)
4. [x] **`src/components/AppBar.tsx`** (new file) — MUI AppBar with Save/Export buttons, Undo/Redo/Quit icon buttons with tooltips, Quit confirmation dialog
5. [x] **`src/App.tsx`** — replace `import { Toolbar }` with `import { AppBar }`; add `useEffect` for Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z keyboard listeners
6. [x] **Delete `src/components/Toolbar.tsx`** — no longer needed

## Design Notes

- Name the new component file `AppBar.tsx` to avoid collision with MUI's exported `AppBar` — import MUI's as `MuiAppBar` at the top: `import MuiAppBar from '@mui/material/AppBar'`.
- `redoStack` max size: same `MAX_UNDO = 50` constant; slice logic mirrors `pushUndo`.
- Save button (FR-3.2): for now, Save = Export (same download). The label "Save" is kept distinct from "Export" to reserve the name for a future server-side target (OQ-1). Internally they call the same `exportGwmap` function. A `[TODO: differentiate Save vs Export when server target exists]` comment is acceptable.
- The `initMap` reset on Quit: call `useMapStore.getState().initMap({ backgroundImageUrl: '', center: { x: 0, y: 0 }, scale: 1 })` — this re-initializes to a blank map rather than null, avoiding null-guard issues downstream.

## Dev Agent Record

### Implementation Notes

- `bun add` detected workspace context correctly — MUI deps landed in `packages/builder-react/package.json`, not root.
- MUI v6.5.0, `@emotion/react` 11.14.0, `@emotion/styled` 11.14.1 installed.
- `AppBar.tsx` imports MUI's AppBar as `MuiAppBar` to avoid name collision with our exported component.
- `downloadGwmap()` is a standalone function (not a hook) since it reads from `useMapStore.getState()` — this lets it be called outside React render without hook rules.
- `Save` and `Export` both call `downloadGwmap()` for now. TODO comment left per design notes.
- Disabled `IconButton` wrapped in `<span>` so MUI Tooltip can attach to a non-disabled element (required by MUI for tooltip on disabled buttons).
- `beforeEach` in test file updated to reset `redoStack: []` alongside existing state fields.
- 7 new redo tests added; full suite: 235/235 pass.

### File List

- `packages/builder-react/package.json` (modified — MUI deps added)
- `packages/builder-react/src/store/mapStore.ts` (modified — redoStack, redo action, clear on all mutations)
- `packages/builder-react/src/__tests__/mapStore.test.ts` (modified — redo tests + beforeEach reset)
- `packages/builder-react/src/components/AppBar.tsx` (new)
- `packages/builder-react/src/App.tsx` (modified — uses AppBar, keyboard shortcuts)
- `packages/builder-react/src/components/Toolbar.tsx` (deleted)
- `bun.lock` (updated)

## Spec Change Log

| Date | Change |
|---|---|
| 2026-06-20 | Initial creation |
| 2026-06-20 | Implementation complete — all 6 tasks checked, 235/235 tests pass |

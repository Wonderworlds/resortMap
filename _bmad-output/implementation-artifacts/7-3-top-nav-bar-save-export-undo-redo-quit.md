---
baseline_commit: 1203290eb6a13b27ee5c5040d20903e559576e8d
---

# Story 7.3: Top Nav Bar — Save, Export, Undo, Redo, Quit

Status: review

## Story

As a map builder,
I want a compact Top Nav Bar with "ResortMap Builder" on the left and Undo, Redo, Save, Export, Quit buttons on the right,
so that global actions are always accessible in one place.

## Acceptance Criteria

1. **Given** the app is open with no map loaded (`mapConfig` is null), **when** the Top Nav Bar renders, **then** "ResortMap Builder" text appears on the left and Save, Export are disabled; Undo, Redo are disabled (empty stacks).

2. **Given** a loaded map with at least one undoable action, **when** the user clicks Undo, **then** the last mutation is reverted and Undo becomes disabled if `undoStack` is now empty.

3. **Given** `undoStack` has entries and user clicked Undo (so `redoStack` is non-empty), **when** the user clicks Redo, **then** the undone mutation is reapplied and Redo becomes disabled if `redoStack` is now empty.

4. **Given** `<App onSave={mockFn} />` and a loaded map, **when** the user clicks Save, **then** `mockFn` is called once with the current `MapConfig` object and `savedMapConfig` in the store is updated to the saved `MapConfig`.

5. **Given** `<App />` with no `onSave` prop and a loaded map, **when** the user clicks Save, **then** a `.gwmap` JSON file is downloaded via the browser and `savedMapConfig` in the store is updated to the saved `MapConfig`.

6. **Given** the user clicks Quit **with unsaved changes** (`mapConfig !== savedMapConfig`), **when** the confirmation dialog appears, **then** confirming calls `onQuit` prop (if provided) or resets the map; cancelling leaves the builder unchanged.

7. **Given** the user clicks Quit **with no unsaved changes** (`mapConfig === savedMapConfig`, both null or matching reference), **when** Quit is clicked, **then** the confirmation dialog does NOT appear and the action completes immediately.

8. **Given** `ThemeConfig` and `onSave`/`onQuit` types imported as named exports from `packages/builder-react`, **when** used in TypeScript, **then** no type errors.

9. **Given** `bun test` after this story, **then** all 273 existing tests pass AND new `savedMapConfig` store tests are green.

## Tasks / Subtasks

- [x] Task 1: Update `mapStore.ts` — add `savedMapConfig` state + `setSavedMapConfig` action (AC: 4, 5, 6, 7, 9)
  - [x] 1.1 Add `savedMapConfig: MapConfig | null` to `MapStore` interface
  - [x] 1.2 Add `setSavedMapConfig: (config: MapConfig | null) => void` to `MapStore` interface
  - [x] 1.3 Initialize `savedMapConfig: null` in the store creator
  - [x] 1.4 Implement `setSavedMapConfig: (config) => set({ savedMapConfig: config })`

- [x] Task 2: Write failing store tests (RED phase) (AC: 9)
  - [x] 2.1 Update `beforeEach` in `mapStore.test.ts` to reset `savedMapConfig: null`
  - [x] 2.2 Add test: initial state has `savedMapConfig: null`
  - [x] 2.3 Add test: `setSavedMapConfig(config)` updates `savedMapConfig` in store
  - [x] 2.4 Add test: `setSavedMapConfig(null)` resets `savedMapConfig` to null
  - [x] 2.5 Run `bun test packages/builder-react` — confirm new tests FAIL, existing pass

- [x] Task 3: Implement `mapStore.ts` changes (GREEN) (AC: 4, 5, 6, 7, 9)
  - [x] 3.1 Apply changes from Task 1 to `packages/builder-react/src/store/mapStore.ts`
  - [x] 3.2 Run `bun test packages/builder-react` — confirm all tests pass

- [x] Task 4: Update `AppBar.tsx` — wire `onSave`, `onQuit`, title text, unsaved-changes check (AC: 1, 4, 5, 6, 7)
  - [x] 4.1 Export `AppBarProps` interface with `onSave?: (config: MapConfig) => void` and `onQuit?: () => void`
  - [x] 4.2 Change component signature to `export function AppBar({ onSave, onQuit }: AppBarProps): JSX.Element`
  - [x] 4.3 Add `savedMapConfig = useMapStore((s) => s.savedMapConfig)` subscription inside component
  - [x] 4.4 Change "ResortMap" Typography text to "ResortMap Builder"
  - [x] 4.5 Replace Save button `onClick={downloadGwmap}` with `handleSave()` function that: reads `mapConfig` from store, calls `onSave(mapConfig)` if provided else calls `downloadGwmap()`, then calls `useMapStore.getState().setSavedMapConfig(mapConfig)`
  - [x] 4.6 Change Quit button `onClick` to call `handleQuitClick()`: if `mapConfig !== savedMapConfig` show dialog, else call `handleQuitConfirm()` immediately (no dialog for clean state)
  - [x] 4.7 Update `handleQuitConfirm()`: call `onQuit()` if provided, else call `initMap({ backgroundImageUrl: '', center: { x: 0, y: 0 }, scale: 1 })`
  - [x] 4.8 Add `import type { MapConfig } from '@resort-map/types'` for the prop type

- [x] Task 5: Update `App.tsx` — extend `AppProps` and pass new props to `AppBar` (AC: 4, 5, 6, 8)
  - [x] 5.1 Add `onSave?: (config: MapConfig) => void` and `onQuit?: () => void` to `AppProps` interface in `App.tsx`
  - [x] 5.2 Destructure `onSave` and `onQuit` from props in the function signature
  - [x] 5.3 Pass `onSave={onSave}` and `onQuit={onQuit}` to `<AppBar>`
  - [x] 5.4 Add `import type { MapConfig } from '@resort-map/types'` to `App.tsx`

- [x] Task 6: Final test suite validation (AC: 9)
  - [x] 6.1 Run `bun test` from workspace root — confirm all 273+ tests pass, zero regressions

## Dev Notes

### Files to Modify (UPDATE — read before touching)

| File | Change |
|------|--------|
| `packages/builder-react/src/store/mapStore.ts` | Add `savedMapConfig` state + `setSavedMapConfig` action |
| `packages/builder-react/src/components/AppBar.tsx` | AppBarProps, save/quit logic, "ResortMap Builder" |
| `packages/builder-react/src/App.tsx` | Extend `AppProps`, pass new props to AppBar |
| `packages/builder-react/src/__tests__/mapStore.test.ts` | Reset + tests for `savedMapConfig` |

No new files. No `src/index.ts` changes (exports `AppProps` which will gain new fields automatically).

### Current `AppBar.tsx` — critical state to preserve

The existing AppBar has ALL button structure already. Do NOT rewrite it from scratch. Only:
1. Add `AppBarProps` interface + update function signature
2. Add `savedMapConfig` store subscription
3. Add `handleSave()` function (replaces direct `downloadGwmap` onClick on Save)
4. Add `handleQuitClick()` (conditionally shows dialog vs. immediate quit)
5. Update `handleQuitConfirm()` to call `onQuit` prop
6. Change Typography text "ResortMap" → "ResortMap Builder"
7. Change Save button `onClick` from `downloadGwmap` to `handleSave`
8. Change Quit button `onClick` from `() => setShowQuitDialog(true)` to `handleQuitClick`

**Preserve unchanged:**
- All imports except adding `import type { MapConfig } from '@resort-map/types'`
- Export button (still calls `downloadGwmap` directly — placeholder per FR-4)
- Undo / Redo buttons (no changes)
- Dialog JSX and Dialog Toolbar structure
- `downloadGwmap()` standalone function (still needed for no-`onSave` fallback and Export)

### `handleSave()` implementation

```tsx
function handleSave(): void {
  const { mapConfig, setSavedMapConfig } = useMapStore.getState();
  if (!mapConfig) return;
  if (onSave) {
    onSave(mapConfig);
  } else {
    downloadGwmap();
  }
  setSavedMapConfig(mapConfig);
}
```

Use `useMapStore.getState()` (not hook) since this runs inside an event handler, not during render.

### `handleQuitClick()` implementation

```tsx
function handleQuitClick(): void {
  if (mapConfig !== savedMapConfig) {
    setShowQuitDialog(true);
  } else {
    handleQuitConfirm();
  }
}
```

`mapConfig` and `savedMapConfig` are both already subscribed via `useMapStore((s) => s.mapConfig)` etc., so reference equality comparison is valid — any store mutation produces a new object reference.

### `handleQuitConfirm()` — updated

```tsx
function handleQuitConfirm(): void {
  setShowQuitDialog(false);
  if (onQuit) {
    onQuit();
  } else {
    initMap({ backgroundImageUrl: '', center: { x: 0, y: 0 }, scale: 1 });
  }
}
```

### `savedMapConfig` — reference equality semantics

Zustand mutations in this store always produce new `mapConfig` object references (via spread operators in every action). This means `mapConfig !== savedMapConfig` is a reliable unsaved-changes signal:
- Both null → equal (no map, nothing to save) → no dialog
- `savedMapConfig = null`, `mapConfig` not null → unsaved → dialog
- After save: `setSavedMapConfig(mapConfig)` → same reference → no dialog
- After any mutation (addPoi, etc.): new reference → unsaved → dialog

### `mapStore.ts` — current interface + what to add

Current `MapStore` interface ends at:
```ts
updateMapMeta: (patch: Partial<MapMeta>) => void;
```

Add at the end of the interface:
```ts
savedMapConfig: MapConfig | null;
setSavedMapConfig: (config: MapConfig | null) => void;
```

And in the `create()` call, add after `redoStack: []`:
```ts
savedMapConfig: null,
setSavedMapConfig: (config) => set({ savedMapConfig: config }),
```

### `App.tsx` — current `AppProps` + what to add

Current:
```ts
export interface AppProps {
  themeConfig?: ThemeConfig;
}
```

After:
```ts
export interface AppProps {
  themeConfig?: ThemeConfig;
  onSave?: (config: MapConfig) => void;
  onQuit?: () => void;
}
```

Need to add `import type { MapConfig } from '@resort-map/types'` to App.tsx imports.
Pass to AppBar: `<AppBar onSave={onSave} onQuit={onQuit} />`.

### `mapStore.test.ts` — `beforeEach` must include `savedMapConfig`

Current `beforeEach`:
```ts
useMapStore.setState({
  mapConfig: null,
  activeTool: 'select',
  selectedItemId: null,
  undoStack: [],
  redoStack: [],
});
```

Must become:
```ts
useMapStore.setState({
  mapConfig: null,
  activeTool: 'select',
  selectedItemId: null,
  undoStack: [],
  redoStack: [],
  savedMapConfig: null,
});
```

Without this, `savedMapConfig` could leak between tests.

### New tests for `savedMapConfig`

```ts
describe('savedMapConfig', () => {
  test('initial state is null', () => {
    expect(useMapStore.getState().savedMapConfig).toBeNull();
  });

  test('setSavedMapConfig updates savedMapConfig', () => {
    useMapStore.getState().initMap(validMeta);
    const config = useMapStore.getState().mapConfig!;
    useMapStore.getState().setSavedMapConfig(config);
    expect(useMapStore.getState().savedMapConfig).toBe(config);
  });

  test('setSavedMapConfig(null) resets to null', () => {
    useMapStore.getState().initMap(validMeta);
    const config = useMapStore.getState().mapConfig!;
    useMapStore.getState().setSavedMapConfig(config);
    useMapStore.getState().setSavedMapConfig(null);
    expect(useMapStore.getState().savedMapConfig).toBeNull();
  });
});
```

### TDD Order (mandatory)

1. Write new `savedMapConfig` tests in `mapStore.test.ts` → RED (field doesn't exist yet)
2. Add `savedMapConfig` + `setSavedMapConfig` to `mapStore.ts` → GREEN
3. Update `AppBar.tsx` — no new tests (no DOM test environment), verify by `bun test` not breaking
4. Update `App.tsx` — no new tests needed; compile correctness checked by bun build
5. `bun test` workspace — 273+ pass, 0 fail

### Architecture Compliance

- `import type { MapConfig } from '@resort-map/types'` — type-only import (not value import)
- `AppBarProps` follows `${ComponentName}Props` convention
- `JSX.Element` return type preserved on `AppBar` and `App` functions
- No new dependencies needed
- `downloadGwmap()` is a module-level private function — keep it, just don't change it

### What NOT to change in this story

- Undo/Redo buttons — they already work correctly (AC 2, 3 are satisfied by existing code)
- Export button — stays as downloadGwmap placeholder
- All keyboard shortcuts in `App.tsx` useEffect — leave unchanged
- Dialog structure — only `handleQuitConfirm` logic changes, not the Dialog JSX
- No changes to LeftPanel, RightPanel, MapCanvas, MapMetaPanel, ScaleDialog

### Context from Previous Stories

- **7.2 baseline**: 273 tests across 24 files (confirmed)
- **Pattern**: `useMapStore.getState()` (not hook) is used in event handlers; hooks used only for render-reactive subscriptions
- **Pattern**: `mapStore.test.ts` uses `useMapStore.setState({...})` in `beforeEach` for full reset

### References

- `packages/builder-react/src/components/AppBar.tsx` — primary file being updated
- `packages/builder-react/src/App.tsx` — extend AppProps
- `packages/builder-react/src/store/mapStore.ts` — add savedMapConfig
- `packages/builder-react/src/__tests__/mapStore.test.ts` — add store tests
- PRD FR-3, FR-4, FR-5, FR-18: `_bmad-output/planning-artifacts/prds/prd-resortMap-2026-06-24/prd.md`
- Decision D-9 (nav text): `_bmad-output/planning-artifacts/prds/prd-resortMap-2026-06-24/.decision-log.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- TDD cycle: 3 new `savedMapConfig` tests written RED (2 fail / 1 pass), then store implemented GREEN (43/43).
- `savedMapConfig: MapConfig | null` added to `MapStore` interface and store creator; `setSavedMapConfig` action added.
- `beforeEach` in `mapStore.test.ts` updated to reset `savedMapConfig: null` to prevent test state leak.
- `AppBar.tsx`: added `AppBarProps` interface, `handleSave()` (calls `onSave` hook or downloads, then `setSavedMapConfig`), `handleQuitClick()` (conditional dialog), updated `handleQuitConfirm()` (calls `onQuit` or resets). Title changed "ResortMap" → "ResortMap Builder". Export button unchanged (placeholder per FR-4).
- `App.tsx`: `AppProps` extended with `onSave?` and `onQuit?`, both passed to `<AppBar>`.
- Full workspace: 276/276 pass (3 new + 273 existing), 0 regressions.

### File List

- packages/builder-react/src/store/mapStore.ts
- packages/builder-react/src/components/AppBar.tsx
- packages/builder-react/src/App.tsx
- packages/builder-react/src/__tests__/mapStore.test.ts

---
baseline_commit: 9e467b12af310bd96fb07106617930f8e9fc0cec
---

# Story 7.2: MUI Theme System — default palette + ThemeConfig prop

Status: review

## Story

As a builder-react developer,
I want an MUI `ThemeProvider` at the app root with a default teal palette and a `themeConfig` prop on `<App>`,
so that all builder components inherit the correct theme automatically and embedding apps can override any palette token.

## Acceptance Criteria

1. **Given** `<App />` rendered with no props, **when** any MUI component inside renders, **then** `primary.main` resolves to `#009688`, `primary.contrastText` to `#ffffff`, `background.paper` to `#ffffff`, `background.default` to `#f0f0f0`, `text.primary` to `#333333`, `divider` to `#e0e0e0`.

2. **Given** `<App themeConfig={{ palette: { primary: { main: '#c0392b' } } }} />`, **when** the app renders, **then** all primary-color accents appear in `#c0392b` instead of teal — the override deep-merges with the defaults.

3. **Given** `ThemeConfig` imported as a named export from `packages/builder-react`, **when** used in TypeScript, **then** it resolves to `Partial<ThemeOptions>` with no type error.

4. **Given** the theme is applied at root mount, **when** the user interacts with the builder (places POIs, clicks tools), **then** the `ThemeProvider` is not re-created on each interaction (stable reference via `useMemo`).

5. **Given** `bun test` after this story, **then** all 269 existing tests continue to pass AND at least 3 new theme-unit tests are green.

## Tasks / Subtasks

- [x] Task 1: Write failing tests first (RED phase) (AC: 1, 2, 3, 4, 5)
  - [x] 1.1 Create `packages/builder-react/src/__tests__/theme.test.ts` with tests for `createAppTheme()`: default teal palette values, override merging, defaults preserved when partial override provided
  - [x] 1.2 Run `bun test packages/builder-react` — confirm new tests FAIL, existing tests PASS

- [x] Task 2: Create `packages/builder-react/src/theme.ts` (AC: 1, 2, 3)
  - [x] 2.1 Export `ThemeConfig = Partial<ThemeOptions>` from `@mui/material/styles`
  - [x] 2.2 Define `defaultThemeOptions: ThemeOptions` with the palette from FR-18
  - [x] 2.3 Export `createAppTheme(themeConfig?: ThemeConfig): Theme` — calls `createTheme(defaultThemeOptions, themeConfig ?? {})`

- [x] Task 3: Update `packages/builder-react/src/App.tsx` (AC: 1, 2, 4)
  - [x] 3.1 Export `AppProps` interface with `themeConfig?: ThemeConfig`
  - [x] 3.2 Add `useMemo(() => createAppTheme(themeConfig), [themeConfig])` for stable theme reference
  - [x] 3.3 Wrap entire JSX return in `<ThemeProvider theme={theme}>…</ThemeProvider>`
  - [x] 3.4 Import `ThemeProvider` from `@mui/material/styles` (NOT from `@mui/material`)

- [x] Task 4: Create `packages/builder-react/src/index.ts` (AC: 3)
  - [x] 4.1 Export `App` and `AppProps` from `./App`
  - [x] 4.2 Export `ThemeConfig` type from `./theme`
  - [x] 4.3 Re-export `type MapConfig` from `@resort-map/types`

- [x] Task 5: Update `packages/builder-react/package.json` (AC: 3)
  - [x] 5.1 Add `"exports": { ".": "./src/index.ts" }` field so `@resort-map/builder-react` is importable by embedding apps

- [x] Task 6: GREEN phase — run full test suite (AC: 5)
  - [x] 6.1 Run `bun test` from workspace root — confirm all 269+ tests pass (new theme tests green, zero regressions)

## Dev Notes

### Files to Create (NEW)

| File | Description |
|------|-------------|
| `packages/builder-react/src/theme.ts` | ThemeConfig type + createAppTheme factory |
| `packages/builder-react/src/index.ts` | Package export entry point |
| `packages/builder-react/src/__tests__/theme.test.ts` | Unit tests for theme factory |

### Files to Update (UPDATE — read before modifying)

| File | Change |
|------|--------|
| `packages/builder-react/src/App.tsx` | Add `AppProps`, `useMemo`, `ThemeProvider` wrapper |
| `packages/builder-react/package.json` | Add `"exports"` field |

### Current `App.tsx` — full current state

```tsx
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import { AppBar } from './components/AppBar';
import { LeftPanel } from './components/LeftPanel';
import { MapCanvas } from './components/MapCanvas';
import { RightPanel } from './components/RightPanel';
import { useMapStore } from './store/mapStore';

export function App(): JSX.Element {
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);

  useEffect(() => { /* keyboard shortcuts for undo/redo */ }, [undo, redo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPanel />
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapCanvas />
        </Box>
      </Box>
      <RightPanel />
    </Box>
  );
}
```

**What changes:**
- Add `import type { ThemeConfig } from './theme'` (type-only)
- Add `import { createAppTheme } from './theme'`
- Add `import { ThemeProvider } from '@mui/material/styles'`
- Add `import { useMemo } from 'react'` (to the existing import)
- Add `export interface AppProps { themeConfig?: ThemeConfig; }`
- Change `export function App(): JSX.Element` → `export function App({ themeConfig }: AppProps): JSX.Element`
- Add inside function body: `const theme = useMemo(() => createAppTheme(themeConfig), [themeConfig]);`
- Wrap return JSX in `<ThemeProvider theme={theme}>…</ThemeProvider>`
- Preserve all existing keyboard shortcut logic and JSX layout unchanged

### `theme.ts` Implementation

```ts
import { createTheme } from '@mui/material/styles';
import type { Theme, ThemeOptions } from '@mui/material/styles';

export type ThemeConfig = Partial<ThemeOptions>;

const defaultThemeOptions: ThemeOptions = {
  palette: {
    primary: { main: '#009688', contrastText: '#ffffff' },
    background: { paper: '#ffffff', default: '#f0f0f0' },
    text: { primary: '#333333' },
    divider: '#e0e0e0',
  },
};

export function createAppTheme(themeConfig?: ThemeConfig): Theme {
  return createTheme(defaultThemeOptions, themeConfig ?? {});
}
```

**Why `createTheme(base, override)` with two args?** MUI's `createTheme` deep-merges multiple theme objects when called with multiple arguments. This is the canonical MUI pattern for theme composition — do NOT manually spread or merge theme options.

### `index.ts` Implementation

```ts
export { App } from './App';
export type { AppProps } from './App';
export type { ThemeConfig } from './theme';
export type { MapConfig } from '@resort-map/types';
```

All exports from `App` and `AppProps` use named exports (no default exports in this codebase).

### `package.json` Change

Current (no `exports` field). Add:
```json
{
  "exports": { ".": "./src/index.ts" }
}
```

Position it after `"scripts"` and before `"dependencies"`, following the pattern in `packages/view-react/package.json`.

### Architecture Compliance (mandatory)

- **`import type`** for all type-only imports: `ThemeConfig`, `ThemeOptions`, `Theme`, `AppProps`, `MapConfig`
- **`ThemeProvider` import path**: Use `@mui/material/styles` NOT `@mui/material` — the styles subpackage is preferred to avoid tree-shaking issues
- **`useMemo` dependency array**: `[themeConfig]` — uses referential equality. If embedding app passes a stable object (declared outside render), theme is only computed once. This is the caller's responsibility; document in JSDoc if needed
- **No new bundler**: builder-react uses Bun's HTML import bundler (`index.ts` → `Bun.serve()` → `index.html`). The new `src/index.ts` is a library entry point, not a new server entry
- **No MUI installation needed**: `@mui/material ^6`, `@mui/icons-material ^6`, `@emotion/react ^11`, `@emotion/styled ^11` are already in `package.json` — do NOT run `bun install` unless you add new packages
- **`JSX.Element` return type**: All existing exported components use `JSX.Element`. Preserve this for `App` — do not change to `React.JSX.Element` or `ReactElement`
- **Naming**: `AppProps` follows `${ComponentName}Props` convention. `createAppTheme` follows camelCase convention

### Test Implementation (`theme.test.ts`)

```ts
import { test, expect, describe } from 'bun:test';
import { createAppTheme } from '../theme';

describe('createAppTheme', () => {
  test('returns default teal primary palette with no args', () => {
    const theme = createAppTheme();
    expect(theme.palette.primary.main).toBe('#009688');
    expect(theme.palette.primary.contrastText).toBe('#ffffff');
  });

  test('returns default background and text palette with no args', () => {
    const theme = createAppTheme();
    expect(theme.palette.background.paper).toBe('#ffffff');
    expect(theme.palette.background.default).toBe('#f0f0f0');
  });

  test('overrides primary.main when themeConfig provides it', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#c0392b' } } });
    expect(theme.palette.primary.main).toBe('#c0392b');
  });

  test('preserves background defaults when only primary is overridden', () => {
    const theme = createAppTheme({ palette: { primary: { main: '#c0392b' } } });
    expect(theme.palette.background.default).toBe('#f0f0f0');
    expect(theme.palette.background.paper).toBe('#ffffff');
  });
});
```

**Why `createTheme` works in `bun test`:** MUI's `createTheme` is pure JS (no DOM required). It reads and merges plain objects. This makes it directly unit-testable without any DOM environment or happy-dom setup.

### TDD Order (mandatory — red before green)

1. Write `theme.test.ts` first → confirm all 4 tests FAIL (module not found)
2. Create `theme.ts` → confirm tests PASS
3. Update `App.tsx` → run test suite, confirm no regressions
4. Create `src/index.ts` + update `package.json` → run test suite, confirm no regressions
5. Final: `bun test` from workspace root → 273+ pass, 0 fail

### Key Context from Previous Story (7.1)

- Story 7.1 modified `packages/view-react` only; no overlap with builder-react
- Test count baseline: 269 tests across 23 files (confirmed from 7.1 implementation run)
- Pattern: `import type` mandatory for type-only imports — dev agent must follow this for `ThemeConfig`, `ThemeOptions`, `Theme`, `AppProps`, `MapConfig`

### What NOT to Change in This Story

- `AppBar.tsx` — already implemented with MUI AppBar, Toolbar, Undo/Redo/Save/Quit — untouched in 7.2
- `LeftPanel.tsx`, `RightPanel.tsx`, `MapCanvas.tsx`, `MapMetaPanel.tsx` — untouched in 7.2
- `mapStore.ts` — already has full undo/redo implementation — untouched in 7.2
- `main.tsx` — renders `<App />` with no props; remains valid since `themeConfig` is optional
- `index.ts` (root-level, the Bun.serve file) — NOT the same as the new `src/index.ts` library entry

### References

- `packages/builder-react/src/App.tsx` — file being updated
- `packages/builder-react/package.json` — file being updated
- `packages/builder-react/src/__tests__/mapStore.test.ts` — test pattern reference
- MUI ThemeProvider: `@mui/material/styles` subpackage
- MUI createTheme multi-arg deep-merge: standard MUI v6 API
- PRD FR-18, FR-19: `_bmad-output/planning-artifacts/prds/prd-resortMap-2026-06-24/prd.md`
- ThemeConfig README example: `_bmad-output/planning-artifacts/prds/prd-resortMap-2026-06-24/addendum.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- TDD cycle: 4 tests written (RED: module-not-found fail), then `theme.ts` created (GREEN: all 4 pass).
- `createAppTheme` uses MUI two-arg `createTheme(base, override)` for canonical deep-merge.
- `ThemeProvider` imported from `@mui/material/styles` subpackage per architecture guidance.
- `useMemo([themeConfig])` on theme in `App.tsx` — stable reference unless `themeConfig` prop changes.
- `src/index.ts` created as library entry; `package.json` gained `"exports"` field.
- Full workspace suite: 273/273 pass (4 new + 269 existing), 0 regressions.

### File List

- packages/builder-react/src/theme.ts
- packages/builder-react/src/App.tsx
- packages/builder-react/src/index.ts
- packages/builder-react/package.json
- packages/builder-react/src/__tests__/theme.test.ts

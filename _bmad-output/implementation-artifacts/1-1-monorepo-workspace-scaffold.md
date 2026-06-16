# Story 1.1: Monorepo Workspace Scaffold

Status: ready-for-dev

## Story

As a developer,
I want the resortMap Bun workspace initialized with all 6 package directories, root config files, and correct inter-package wiring,
so that `bun install` and `bun test` run cleanly from the workspace root as a baseline for all subsequent development.

## Acceptance Criteria

1. **Given** a fresh clone **When** I run `bun install` from root **Then** all 6 packages are symlinked in `node_modules` (`@resort-map/types`, `@resort-map/builder-core`, `@resort-map/view-core`, `@resort-map/builder-react`, `@resort-map/view-react`, `@resort-map/view-react-native`) **And** `bun test` exits 0 (no test files yet, runner finds none and exits cleanly)

2. **Given** any library package (`types`, `builder-core`, `view-core`, `view-react`, `view-react-native`) **When** I inspect its `package.json` **Then** it has an `"exports"` field with `"."` pointing to `"./src/index.ts"` **And** `@resort-map/types` additionally exports `"./fixtures/*": "./src/fixtures/*"` **And** all inter-package references use `"workspace:*"`

3. **Given** the root `tsconfig.base.json` **When** any package's `tsconfig.json` extends it **Then** `"strict": true`, `"target": "ES2022"`, `"moduleResolution": "bundler"`, and `"declaration": true` are active **And** `view-react-native`'s tsconfig adds `"jsx": "react-native"`

4. **Given** the root `package.json` **When** I inspect the `"catalog"` field **Then** `typescript`, `react`, `react-dom`, `react-native-svg`, `react-native-gesture-handler`, and `react-native-reanimated` versions are pinned there **And** each relevant package references these via `"catalog:"` protocol

## Tasks / Subtasks

- [ ] Transform root `package.json` into workspace root (AC: 1, 4)
  - [ ] Add `"workspaces": ["packages/*"]`
  - [ ] Add `"scripts"` section with `build` and `test` (see Dev Notes)
  - [ ] Add `"catalog"` section with shared dep versions
  - [ ] Remove `"module"`, `"type"`, `"peerDependencies"` fields (not appropriate for workspace root)
  - [ ] Keep `"@types/bun"` in devDependencies at root level
- [ ] Update `.gitignore` to add `packages/*/dist/` (M2)
- [ ] Create `tsconfig.base.json` at root (AC: 3)
  - [ ] Derive from existing `tsconfig.json` but target ES2022, add `declaration: true`, remove `noEmit`
- [ ] Delete root `index.ts` (AC: 1)
  - [ ] It's a `console.log` placeholder from Bun init — no longer needed
- [ ] Scaffold `packages/types/` — `@resort-map/types` (AC: 1, 2, 3)
  - [ ] `package.json` with name, version, exports (`.` + `./fixtures/*`), build script, no deps
  - [ ] `tsconfig.json` extending `../../tsconfig.base.json`
  - [ ] `src/index.ts` — placeholder export
  - [ ] `src/fixtures/.gitkeep` — preserves empty directory in git (populated in Story 1.3)
- [ ] Scaffold `packages/builder-core/` — `@resort-map/builder-core` (AC: 1, 2, 3)
  - [ ] `package.json` with exports, build script (`bun build src/index.ts --target node`), `"@resort-map/types": "workspace:*"` dep, `"typescript": "catalog:"` devDep
  - [ ] `tsconfig.json` extending `../../tsconfig.base.json`
  - [ ] `src/index.ts` — placeholder export
- [ ] Scaffold `packages/view-core/` — `@resort-map/view-core` (AC: 1, 2, 3)
  - [ ] Same pattern as builder-core but build script uses `--target browser`
- [ ] Scaffold `packages/builder-react/` — `@resort-map/builder-react` (AC: 1, 3)
  - [ ] `package.json` — NO `"exports"` field (it's a standalone app, not a library)
  - [ ] Peer deps: `"react": "catalog:"`, `"react-dom": "catalog:"`
  - [ ] `"@resort-map/builder-core": "workspace:*"` dep
  - [ ] `tsconfig.json` extending `../../tsconfig.base.json` with `"noEmit": true` override
  - [ ] `index.ts` — minimal `Bun.serve()` placeholder (see Dev Notes)
  - [ ] `index.html` — minimal HTML with script import
  - [ ] `src/main.tsx` — placeholder React root
- [ ] Scaffold `packages/view-react/` — `@resort-map/view-react` (AC: 1, 2, 3)
  - [ ] `package.json` with exports, build script (`bun build src/index.ts --external react --external react-dom`), peer deps `react`+`react-dom`, `"@resort-map/view-core": "workspace:*"` dep
  - [ ] `tsconfig.json` extending `../../tsconfig.base.json`
  - [ ] `src/index.ts` — placeholder export
- [ ] Scaffold `packages/view-react-native/` — `@resort-map/view-react-native` (AC: 1, 2, 3)
  - [ ] `package.json` with exports, peer deps including `react-native-svg`, `react-native-gesture-handler`, `react-native-reanimated`
  - [ ] `tsconfig.json` extending `../../tsconfig.base.json` **with `"jsx": "react-native"` override**
  - [ ] `src/index.ts` — placeholder export
- [ ] Run `bun install` from root and verify clean exit (AC: 1)
- [ ] Run `bun test` from root and verify exit 0 (AC: 1)

## Dev Notes

### Existing Root Files — Action Required

The repo already has these root files from `bun init`:
- `package.json` — **TRANSFORM** (do not delete; modify in place)
- `tsconfig.json` — **KEEP AS-IS** (useful for IDE/root-level type checking; create a separate `tsconfig.base.json`)
- `index.ts` — **DELETE** (placeholder `console.log("Hello via Bun!")` — serves no purpose in monorepo)
- `bun.lock` — **KEEP** (will be regenerated by `bun install`)

### Root `package.json` — Target State

```json
{
  "name": "resort-map",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun test"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "catalog": {
    "typescript": "^5.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-native-svg": "^15.8.0",
    "react-native-gesture-handler": "^2.20.0",
    "react-native-reanimated": "^3.16.0",
    "zustand": "^4.5.0"
  }
}
```

> `"private": true` prevents accidental workspace root publish. `"scripts.build"` runs the build script in every package that defines one; `"scripts.test"` is an alias for ergonomics. `"catalog"` pins all shared deps — packages reference with `"catalog:"`. Include `zustand` in catalog even though only builder-react uses it; it's a workspace-wide dep to pin.

### `tsconfig.base.json` — Target State

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "Preserve",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

> **Critical**: `allowImportingTsExtensions` is intentionally absent from the base. TypeScript TS5096 forbids combining it with `declaration: true` (which requires emit). It belongs only in `builder-react/tsconfig.json` where `"noEmit": true` is already set.
>
> Key differences from existing `tsconfig.json`: `"module": "Preserve"` carried over (correct companion for `moduleResolution: bundler`), target changed to `ES2022` (Node 18 compat — not `ESNext`), `declaration: true` added (library packages emit types), `noEmit` removed from base (library packages must emit), `allowImportingTsExtensions` removed from base (guard removed — see above), `types: ["bun"]` removed from base (only builder-react needs it).

### Root TypeScript Config Files — Two Files, Two Purposes

```
tsconfig.json       ← IDE / root-level type checking of the whole tree (existing, keep as-is)
tsconfig.base.json  ← Shared compiler options that all 6 package tsconfigs extend (new)
```

These coexist without conflict. IDEs (VS Code, WebStorm) use `tsconfig.json` to index the workspace. Each package's `tsconfig.json` extends `../../tsconfig.base.json` — not the root `tsconfig.json`. Do not merge them.

### Package `package.json` Patterns

**`@resort-map/types`:**
```json
{
  "name": "@resort-map/types",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./fixtures/*": "./src/fixtures/*"
  },
  "scripts": {
    "build": "tsc --emitDeclarationOnly --outDir dist"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

**`@resort-map/builder-core`:**
```json
{
  "name": "@resort-map/builder-core",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build src/index.ts --target node --outdir dist"
  },
  "dependencies": {
    "@resort-map/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

**`@resort-map/view-core`:**
```json
{
  "name": "@resort-map/view-core",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build src/index.ts --target browser --outdir dist"
  },
  "dependencies": {
    "@resort-map/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

**`@resort-map/view-react`:**
```json
{
  "name": "@resort-map/view-react",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "build": "bun build src/index.ts --external react --external react-dom --outdir dist"
  },
  "dependencies": {
    "@resort-map/view-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

**`@resort-map/view-react-native`:**
```json
{
  "name": "@resort-map/view-react-native",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@resort-map/view-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-native": "*",
    "react-native-svg": "catalog:",
    "react-native-gesture-handler": "catalog:",
    "react-native-reanimated": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```
> Ships TypeScript source — Metro handles transpilation. **No `build` script** and no `"main"` field. The `bun run --filter '*' build` root script will simply skip this package since it has no build script defined.

**`@resort-map/builder-react` — standalone app, NOT a library:**
```json
{
  "name": "@resort-map/builder-react",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun --hot index.ts"
  },
  "dependencies": {
    "@resort-map/builder-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```
> NO `"exports"` field — it's not a library. Has `index.ts` at package root (not `src/`).

### Package `tsconfig.json` Patterns

**Library packages (types, builder-core, view-core, view-react):**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**`@resort-map/view-react-native` — MUST add jsx override:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**`@resort-map/builder-react` — app tsconfig (no emit, Bun types):**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "types": ["bun"]
  },
  "include": ["src", "index.ts", "index.html"]
}
```
> `allowImportingTsExtensions` is safe here because `noEmit: true` satisfies TypeScript's guard (TS5096). This is the only package where it belongs.

### Placeholder Source Files

Each `src/index.ts` in this story is a scaffold placeholder — subsequent stories fill in the real exports:

```ts
// @resort-map/types — src/index.ts
export {}; // populated in Story 1.2
```

```ts
// @resort-map/builder-core — src/index.ts
export {}; // populated in Story 2.1
```

```ts
// @resort-map/view-core — src/index.ts
export {}; // populated in Story 3.1
```

```ts
// @resort-map/view-react — src/index.ts
export {}; // populated in Story 4.1
```

```ts
// @resort-map/view-react-native — src/index.ts
export {}; // populated in Story 5.1
```

**builder-react minimal skeleton** (serves a placeholder page):
```ts
// packages/builder-react/index.ts
import index from "./index.html";
Bun.serve({
  routes: { "/": index },
  development: { hmr: true },
});
```

```html
<!-- packages/builder-react/index.html -->
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>
```

```tsx
// packages/builder-react/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("root")!);
root.render(<div>builder-react placeholder</div>);
```

### `.gitignore` Update

Add the following lines to the existing root `.gitignore` (check what's already there first, do not duplicate):

```
# Package build output
packages/*/dist/
```

### Bun `catalog:` Protocol Behaviour

- Packages declare `"typescript": "catalog:"` (no version) — Bun resolves it from the root catalog at install time.
- `workspace:*` resolves to the local package path; Bun symlinks it into `node_modules`.
- After `bun install`, `node_modules/@resort-map/types` → `../../packages/types` (symlink).
- `bun test` with zero `*.test.ts` files prints "No tests found" and exits 0 — this is expected and correct for AC 1. If for any reason it exits non-zero, add a minimal placeholder test: `packages/types/src/__tests__/placeholder.test.ts` containing `import { test } from "bun:test"; test("placeholder", () => {});` then remove it once real tests exist.
- The `bun run --filter '*' build` root script skips packages without a `"build"` script (i.e., view-react-native) — this is correct behaviour, not an error.

### File Structure to Create

```
resortMap/                        ← already exists
├── .gitignore                    ← UPDATE (add packages/*/dist/)
├── package.json                  ← TRANSFORM (workspace root)
├── tsconfig.json                 ← KEEP (IDE/root type checking, do not touch)
├── tsconfig.base.json            ← CREATE (shared base all packages extend)
├── index.ts                      ← DELETE
└── packages/                     ← CREATE
    ├── types/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       └── fixtures/
    │           └── .gitkeep      ← CREATE (preserves empty dir in git)
    ├── builder-core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts
    ├── view-core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts
    ├── builder-react/
    │   ├── package.json
    │   ├── tsconfig.json         ← allowImportingTsExtensions here (not in base)
    │   ├── index.ts              ← Bun.serve() entry
    │   ├── index.html
    │   └── src/main.tsx
    ├── view-react/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts
    └── view-react-native/
        ├── package.json
        ├── tsconfig.json         ← jsx: react-native override
        └── src/index.ts
```

### References

- Architecture: Package dependency graph [Source: architecture.md#Package Dependency Graph]
- Architecture: Build strategy per package [Source: architecture.md#Per-Package Build Strategy]
- Architecture: Export patterns + `"exports"` field requirement [Source: architecture.md#Export Patterns]
- Architecture: Naming conventions (camelCase files) [Source: architecture.md#Naming Patterns]
- Architecture: First implementation priority checklist [Source: architecture.md#First Implementation Priority]
- CLAUDE.md: Use `bun install`, `bun test`, `bun build` — not npm/yarn/webpack
- SPEC: Constraint — "Bun workspace monorepo; `bun install`, `bun test`, and `bun build` are the only build/test entry points" (NFR2)
- SPEC: Constraint — "builder-core and view-core must contain zero React/React Native imports" (NFR4) — enforced by package.json peer dep declarations, NOT by this story's code, but the package.json structure you create here enables it
- Epics Story 1.1 ACs [Source: epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

### Completion Notes List

### File List

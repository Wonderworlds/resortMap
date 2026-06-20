---
id: 6-1
title: "@resort-map/poi-icons — SVG Icon Package"
epic: 6
status: ready-for-dev
created: 2026-06-20
updated: 2026-06-20
---

## Story

As a map author, I want a shared library of SVG POI icons so I can pick recognizable symbols for my points of interest without entering raw URLs.

## Context

This story creates `packages/poi-icons` — a new Bun workspace package. It has no dependency on the UI redesign and can be built and tested independently. The icon picker in Story 6-4 imports `POI_ICONS` from this package.

No existing code changes. Pure new package creation.

**Relevant PRD sections:** F1 (FR-1.1 through FR-1.5), NFR-6.2.

## Acceptance Criteria

**AC-1 — Package scaffold**
- Given: the monorepo root `package.json` lists `"packages/poi-icons"` in `workspaces`
- When: `bun install` runs from the monorepo root
- Then: `packages/poi-icons` is linked and `@resort-map/poi-icons` is resolvable from `builder-react`

**AC-2 — SVG icon components**
- Given: `packages/poi-icons/src/icons/` contains individual icon files
- When: a consumer does `import { RestaurantIcon } from '@resort-map/poi-icons'`
- Then: `RestaurantIcon` renders a 24×24 SVG at `currentColor` with no explicit fill/stroke hardcoded

**AC-3 — Full icon set**
- Given: `packages/poi-icons/src/index.ts` is the package entry
- When: it is imported
- Then: the following 12 named exports are present: `RestaurantIcon`, `CafeIcon`, `HotelIcon`, `ParkingIcon`, `RestroomIcon`, `FirstAidIcon`, `InfoIcon`, `ShopIcon`, `PoolIcon`, `SkiLiftIcon`, `EntranceIcon`, `AccessibilityIcon`

**AC-4 — POI_ICONS registry**
- Given: `import { POI_ICONS } from '@resort-map/poi-icons'`
- When: `Object.keys(POI_ICONS)` is called
- Then: it returns exactly 12 keys (one per icon), each key is a stable kebab-case string (e.g. `"restaurant"`, `"cafe"`, `"hotel"`, `"parking"`, `"restroom"`, `"first-aid"`, `"info"`, `"shop"`, `"pool"`, `"ski-lift"`, `"entrance"`, `"accessibility"`)
- And: each value is `{ label: string; Icon: React.ComponentType }` with a human-readable label

**AC-5 — Peer dependency**
- Given: `packages/poi-icons/package.json`
- When: read
- Then: `"react"` appears in `"peerDependencies"`, NOT in `"dependencies"` or `"devDependencies"`; `"@resort-map/types"` is absent (this package has no type imports from the monorepo)

**AC-6 — Exports field**
- Given: `packages/poi-icons/package.json`
- When: read
- Then: an `"exports"` field maps `"."` to the compiled entry so `import ... from '@resort-map/poi-icons'` resolves correctly

**AC-7 — Smoke test**
- Given: `packages/poi-icons/src/__tests__/icons.test.ts` exists
- When: `bun test` runs from `packages/poi-icons`
- Then: tests verify (a) `POI_ICONS` has exactly 12 entries, (b) every entry has `label` (non-empty string) and `Icon` (function), (c) every named icon export is a function

## Tasks

1. **`packages/poi-icons/package.json`** — create with `name: "@resort-map/poi-icons"`, `version: "0.1.0"`, `type: "module"`, `peerDependencies: { react: "catalog:" }`, `exports: { ".": "./src/index.ts" }`, `devDependencies: { typescript: "catalog:", "@types/react": "^18.3.0" }`
2. **`packages/poi-icons/tsconfig.json`** — extend `../../tsconfig.base.json`, `jsx: "react-jsx"`, include `src`
3. **`packages/poi-icons/src/icons/`** — create 12 SVG component files (one per icon). Each file: `import React from 'react'; export function XxxIcon(props: React.SVGProps<SVGSVGElement>) { return <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" {...props}>…path…</svg>; }`. Use simple, clean paths (Material Design icon paths acceptable as reference).
4. **`packages/poi-icons/src/registry.ts`** — define and export `POI_ICONS` object mapping kebab-case key → `{ label, Icon }`
5. **`packages/poi-icons/src/index.ts`** — re-export all 12 icon components + `POI_ICONS` + `type PoiIconEntry`
6. **Root `package.json`** — add `"packages/poi-icons"` to `workspaces` array
7. **`packages/poi-icons/src/__tests__/icons.test.ts`** — write AC-7 tests using `bun:test`
8. **`bun install`** — run from monorepo root, verify no resolution errors

## Design Notes

- Icon SVG paths: use Material Design outlined icon paths (24×24 grid). Acceptable to inline the path data directly — no external SVG asset loading.
- The `Icon` in `POI_ICONS` and the named export are the same component reference.
- No CSS, no Tailwind, no MUI dependency in this package — it must remain framework-agnostic beyond React itself.

## Spec Change Log

| Date | Change |
|---|---|
| 2026-06-20 | Initial creation |

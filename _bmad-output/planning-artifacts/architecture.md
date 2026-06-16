---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-16'
inputDocuments:
  - _bmad-output/specs/spec-resort-map/SPEC.md
  - _bmad-output/specs/spec-resort-map/gwmap-schema.md
  - _bmad-output/specs/spec-resort-map/package-architecture.md
workflowType: 'architecture'
project_name: 'resortMap'
user_name: 'Floran'
date: '2026-06-16'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
8 capabilities across two domains — builder (CAP-1, CAP-2) and viewer (CAP-3 through CAP-7) — plus a framework-agnostic constraint (CAP-8). The builder domain produces `.gwmap` files; the viewer domain consumes them. All business logic lives in two framework-agnostic cores; three adapter packages handle rendering only.

**Non-Functional Requirements:**
- Node 18 compatibility for all core packages
- Expo managed/bare workflow for view-react-native (iOS + Android)
- Deterministic routing output (same inputs → identical results)
- Descriptive parse errors at schema boundary
- Zero framework coupling in builder-core and view-core
- No logic duplication in adapter packages

**Scale & Complexity:**
- Primary domain: Cross-platform TypeScript SDK (multi-target library)
- Complexity level: Medium
- Total packages: 6 (builder-core, builder-react, view-core, view-react, view-react-native, types)
- Real-time features: None
- Multi-tenancy: None
- Regulatory compliance: None
- Integration complexity: Low (external dependency = image URLs only)

### Technical Constraints & Dependencies

- Bun workspace monorepo; `bun install` / `bun test` / `bun build` only
- TypeScript; Node 18 target for core packages
- `.gwmap` = JSON, custom extension, schema is single source of truth
- Expo-compatible native deps only in view-react-native
- React ≥18 peer dependency in view-react and builder-react
- Walk-only transportation (no routing mode abstraction needed)
- URL-referenced assets only (no embedded binaries in `.gwmap`)

### Cross-Cutting Concerns Identified

1. **Shared TypeScript types** — `MapConfig`, `POI`, `GraphNode`, `GraphEdge` needed by all packages → resolved by ADR-001 (dedicated types package)
2. **Coordinate math utilities** — pixel distance, meters conversion, nearest-node snapping; used by routing (CAP-4) and distance filtering (CAP-5)
3. **`.gwmap` validation** — must be callable from both builder-core (on export) and view-core (on parse); single implementation in types package, no duplication
4. **Stable ID generation** — POI and graph node IDs must be stable across builder edit sessions
5. **Error taxonomy** — consistent error format across parse failures and routing failures
6. **Test fixtures** — sample `.gwmap` files shared across all package test suites
7. **Expo SVG+gesture coordinate system** → resolved by ADR-003

### Architectural Decisions Made

**ADR-001 — Shared Types Strategy: Dedicated `packages/types` package**
All five packages declare `"@resort-map/types": "workspace:*"`. Types-only package, no build step, independently versionable. Rejected: view-core re-exporting builder-core (cross-domain coupling, mobile bundle bloat); structural typing per package (silent runtime divergence).

**ADR-002 — Renderer Abstraction: view-core as pure functions, adapters own state**
view-core exports stateless pure functions (`computeRoute`, `filterPois`, `parseGwmap`, etc.). Adapter packages (view-react, view-react-native) hold all UI state and call view-core functions on user events. No subscription mechanism, no framework imports in view-core. Justified by scale: resort-scale graphs (50–200 POIs, ~300 nodes) make Dijkstra sub-millisecond; no caching layer needed.

**ADR-003 — Expo Pan/Zoom: Single animated transform container**
One `<Animated.View>` (RN) or CSS-transformed `<div>` (web) wraps the background `<Image>` and `<Svg>` overlay as siblings. Gesture handler drives shared animated scale+translate values on the UI thread (react-native-reanimated worklets). POI pins render at raw pixel coordinates from the `.gwmap` file — zero coordinate conversion at render time. Web equivalent: `react-zoom-pan-pinch` or equivalent CSS transform container.

## Starter Template Evaluation

### Primary Technology Domain

Cross-platform TypeScript library monorepo (SDK with 6 packages, heterogeneous build targets). No single community starter covers this combination.

### Starters Considered

| Option | Verdict |
|---|---|
| `create-turbo` (Turborepo) | Rejected — adds task graph overhead; CLAUDE.md mandates `bun build` only |
| `nx` monorepo | Rejected — enterprise overhead, not Bun-native |
| `create-expo-app` | Partial — appropriate for the consumer Expo app, not the library workspace |
| **Manual Bun workspace** | **Selected** — full control, Bun-native, matches CLAUDE.md exactly |

### Selected Approach: Manual Bun Workspace Scaffold

No community starter fits. Manual scaffold gives precise per-package control with zero Bun-incompatible tooling overhead. Bun 1.3.14 (locally installed) supports workspaces, `workspace:*` inter-package refs, and the `catalog:` protocol for pinning shared dep versions.

**Per-Package Build Strategy:**

| Package | Build approach | Output |
|---|---|---|
| `@resort-map/types` | `tsc --emitDeclarationOnly` | `.d.ts` only |
| `@resort-map/builder-core` | `bun build src/index.ts --target node` | ESM + types |
| `@resort-map/view-core` | `bun build src/index.ts --target browser` | ESM + types |
| `@resort-map/builder-react` | `Bun.serve()` with HTML imports (CLAUDE.md pattern) | Standalone app |
| `@resort-map/view-react` | `bun build --external react --external react-dom` | ESM + types |
| `@resort-map/view-react-native` | No build step — ship TS source | Metro processes directly |

**Architectural Decisions Established by Scaffold:**

**Language & Runtime:**
TypeScript strict mode, ES2022 target (Node 18 compatible), `moduleResolution: bundler`. Root `tsconfig.base.json` extended by each package. `view-react-native` adds `"jsx": "react-native"`.

**Dependency Management:**
Bun `catalog:` protocol in root `package.json` pins all shared dep versions (`typescript`, `react`, `react-dom`, RN gesture/SVG libraries). `workspace:*` for all inter-package references.

**Testing:**
`bun test` at workspace root discovers `*.test.ts` across all packages. Shared `.gwmap` test fixtures in `packages/types/fixtures/` — importable by all packages.

**Code Organization:**
`src/index.ts` entry point convention in all packages. All types flow from `@resort-map/types` (ADR-001). Root scripts: `bun run --filter '*' build` for full workspace build, `bun test` for all tests, `bun --hot packages/builder-react/index.ts` for builder dev server.

**Note:** Workspace initialization is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**
- Error handling strategy — plain Error + code (ADR-004)
- State management in builder-react — Zustand (ADR-005)
- Schema versioning — forward-compatible (ADR-006)
- ID generation — `crypto.randomUUID()` (ADR-007)

**Decided by context (no explicit choice needed):**
- builder-react authoring canvas: SVG (not Canvas) — DOM-native selection/drag, no manual hit-testing required
- Expo file loading: URL-fetch at runtime (deferred to open question resolution)

**Deferred (post-MVP):**
- Package publishing scope (`@resort-map` vs. public npm scope)
- CI/CD pipeline (GitHub Actions or similar)
- builder-react production deployment target

### Data Architecture

No database. The `.gwmap` file is the sole persistence artifact.

**ADR-006 — Schema Versioning: Forward-compatible with unknown-field preservation**
- Additive changes (new optional field) → bump minor version only
- Breaking changes (field rename, type change, removal) → bump major version, require explicit migration
- `validateGwmap()` uses "strip + preserve" mode: unknown top-level fields are dropped with a warning; unknown fields inside `POI.meta` are preserved as-is
- Parser never throws on unknown fields; only throws on missing required fields or type violations

**ADR-007 — ID Generation: `crypto.randomUUID()`**
- Used in builder-core for all `addPoi()` and `addNode()` calls
- Zero external dependency; built into Node 18+, all modern browsers, and Expo's Hermes engine
- IDs are stable across save/reload cycles and globally unique

### Authentication & Security

Not applicable — client-side library with no backend or user sessions. The only boundary validation is `.gwmap` schema validation at parse time (ADR-006).

### API & Communication Patterns

**ADR-004 — Error Handling: Plain Error with `code` property**
- All thrown errors follow: `Object.assign(new Error(message), { code: ErrorCode })`
- `ErrorCode` is a `const` object exported from `@resort-map/types`:
  `GWMAP_PARSE_ERROR`, `GWMAP_VERSION_MISMATCH`, `ROUTE_NOT_FOUND`, `INVALID_POSITION`, `INVALID_NODE_REF`
- Rationale: zero boilerplate for library consumers; React error boundaries and Expo crash reporters handle plain `Error` natively; `code` property enables programmatic branching without `instanceof` checks

Package public API: semver. Breaking changes to any package's exported types or function signatures require a major version bump on `@resort-map/types`.

### Frontend Architecture

**ADR-005 — builder-react State Management: Zustand**
- Single Zustand store in builder-react containing: `MapConfig` (current map state), `activeTool` (`'select' | 'placePoi' | 'drawRoad'`), `selectedItemId`, `undoStack`
- Store actions wrap builder-core's immutable operations (e.g., `addPoi` action calls `builder-core.addPoi()` and pushes to `undoStack`)
- builder-core remains pure — Zustand store is the only stateful layer in builder

**builder-react canvas: SVG (decided by context)**
- Each POI pin and graph node is an `<svg>` element with `onPointerDown` handlers
- No manual hit-testing; native DOM selection and drag via pointer events
- SVG viewport matches the background image dimensions

**view-react / view-react-native state: local `useState` + `useReducer` (per ADR-002)**
- No shared state library; each `MapViewer` instance owns its state independently
- State shape: `{ route: Route | null, activeFilters: PoiFilterOptions, selectedPoiId: string | null }`

### Infrastructure & Deployment

**builder-react:**
- Dev: `bun --hot packages/builder-react/index.ts` (`Bun.serve()` with HMR)
- Prod: `bun build packages/builder-react/index.html --outdir dist/builder` (static bundle, deployable to any static host)

**CI/CD:** Deferred post-MVP. No pipeline configured at project start.

**Package publishing:** Deferred. Packages developed as workspace-internal first; npm publishing scope and access to be decided before first external release.

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Addressed: 6 areas

Naming, structure, exports, component organisation, SVG/RN rendering, and state management patterns are all specified below. Any pattern not listed here is left to the implementing agent's discretion.

### Naming Patterns

**File naming: camelCase**
- Source files: `computeRoute.ts`, `filterPois.ts`, `MapCanvas.tsx`
- Test files: `computeRoute.test.ts`, `MapCanvas.test.tsx`
- Store files: `mapStore.ts`
- No kebab-case. No snake_case. Exception: config files follow their tool's convention (`tsconfig.json`, `package.json`).

**TypeScript identifiers:**
- Types and interfaces: PascalCase (`MapConfig`, `POI`, `GraphNode`)
- Functions and variables: camelCase (`computeRoute`, `activeFilters`)
- React components: PascalCase (`MapViewer`, `MapCanvas`, `PoiPin`)
- Error codes: SCREAMING_SNAKE_CASE as values of the `ErrorCode` const object (`GWMAP_PARSE_ERROR`, `ROUTE_NOT_FOUND`)
- Zustand store hook: `useMapStore`
- Props interfaces: `${ComponentName}Props` (`MapViewerProps`, `MapCanvasProps`)

**`.gwmap` JSON fields: camelCase** (established in gwmap-schema.md — `backgroundImageUrl`, `nodeId`, `oneway`, etc.)

### Structure Patterns

**Test location: `src/__tests__/` folder per package**
```
packages/view-core/
  src/
    computeRoute.ts
    filterPois.ts
    __tests__/
      computeRoute.test.ts
      filterPois.test.ts
```
Shared `.gwmap` test fixtures live in `packages/types/fixtures/` and are imported by any package's tests:
`import sampleMap from '@resort-map/types/fixtures/sample.gwmap.json'`

**Package public API: `src/index.ts` only**
The `index.ts` re-exports everything the package makes public. Implementation files are never imported directly by other packages. Agents must not add new public exports to any file other than `src/index.ts`.

**Internal utilities: `src/utils/` subfolder**
Pure helper functions (pixel math, ID generation, graph helpers) live in `src/utils/` within their package. Not exported from `index.ts` unless the utility is part of the public API.

**Internal types: `src/types.ts` (package-private)**
Types used only inside one package live in `src/types.ts`. All shared cross-package types live exclusively in `@resort-map/types`.

### Export Patterns

**Default exports: allowed**
Library packages may use `export default` for their primary export. Named exports are preferred for utilities and types (better tree-shaking), but a single default export per file is acceptable.

**`import type` for type-only imports (mandatory)**
```ts
// correct
import type { POI, MapConfig } from '@resort-map/types'
import { parseGwmap } from '@resort-map/view-core'

// wrong
import { POI, parseGwmap } from '@resort-map/view-core'
```

**Import ordering:**
1. External packages (`react`, `zustand`, `@resort-map/types`)
2. Internal workspace packages (`@resort-map/view-core`)
3. Local relative imports (`./utils/pixelDistance`)
Blank line between each group.

**No `any`. Use `unknown` at parse boundaries:**
```ts
// correct
export function parseGwmap(raw: unknown): MapConfig { ... }
// wrong
export function parseGwmap(raw: any): MapConfig { ... }
```

**Explicit return types on all exported functions.**

### Component Patterns (builder-react, view-react)

**Collocated private sub-components: allowed**
Small components used only within one parent file may be defined in that file without being exported:
```tsx
// MapCanvas.tsx
export function MapCanvas(props: MapCanvasProps) { ... }
function PoiPin({ poi }: { poi: POI }) { ... }  // private, not exported
```

**No prop spreading onto host elements.**

**Props interface always defined above the component function in the same file.**

### SVG Patterns (builder-react canvas)

- `onPointerDown` (not `onClick`) for all drag-initiating interactions
- POI pins: `<g data-poi-id={poi.id}>` wrapping an `<image>` or `<circle>`
- Graph nodes: `<circle data-node-id={node.id} />`
- Road edges: `<line data-edge-id={...} />`
- Coordinate space: always image pixels — never mix with CSS pixels in the same calculation
- SVG `viewBox` always set to `"0 0 {imageWidth} {imageHeight}"`

### React Native / Expo Patterns (view-react-native)

- `<GestureHandlerRootView style={{ flex: 1 }}>` wraps the root of `MapViewer`
- All map overlay elements (pins, route path) rendered via `react-native-svg` — never use `<View position="absolute">` for map overlays
- Animations: `useSharedValue` + `useAnimatedStyle` (Reanimated v2+ API). Never use `Animated.Value` from core RN.
- Pan/zoom shared values (`translateX`, `translateY`, `scale`) defined once in parent `MapViewer`, never re-created in child components

### State Management Patterns

**builder-react Zustand store (`src/store/mapStore.ts`):**
```ts
interface MapStore {
  config: MapConfig
  activeTool: 'select' | 'placePoi' | 'drawRoad'
  selectedItemId: string | null
  undoStack: MapConfig[]   // max 50 entries
  addPoi: (poi: Omit<POI, 'id'>) => void
  undo: () => void
}
```
Actions call builder-core functions and push the previous `config` to `undoStack` before updating. Undo pops from `undoStack`.

**view-react / view-react-native local state shape:**
```ts
interface ViewerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: Error | null
  route: Route | null
  activeFilters: PoiFilterOptions
  selectedPoiId: string | null
}
```
Managed with `useReducer`. State never exposed directly — only via `onRouteRequest`, `onFilterChange`, `onStatusChange` callback props.

### Error Handling Patterns

**Throw pattern (mandatory):**
```ts
throw Object.assign(new Error('No path exists between the two positions'), {
  code: ErrorCode.ROUTE_NOT_FOUND
})
```

**Catch pattern:**
```ts
try { ... } catch (err: unknown) {
  if (err instanceof Error && 'code' in err) { /* handle */ }
  else { throw err }
}
```

### Process Patterns

**Immutability in builder-core and view-core (mandatory):**
```ts
// correct
export function addPoi(config: MapConfig, poi: Omit<POI, 'id'>): MapConfig {
  return { ...config, pois: [...config.pois, { ...poi, id: crypto.randomUUID() }] }
}
// wrong — never mutate a parameter
config.pois.push(poi)
return config
```

**Background image loading in viewers:**
Status exposed via `onStatusChange?: (status: ViewerStatus) => void`. No built-in spinner or error UI — host app decides presentation.

### Enforcement Guidelines

**All implementing agents MUST:**
- Import all cross-package types from `@resort-map/types` — never redeclare shared types
- Use `import type` for type-only imports
- Place tests in `src/__tests__/` using fixtures from `@resort-map/types/fixtures/`
- Return new objects from all builder-core and view-core functions
- Use `crypto.randomUUID()` for ID generation
- Use `Object.assign(new Error(msg), { code: ErrorCode.X })` throw pattern
- Name all props interfaces `${ComponentName}Props`

**Anti-patterns (never do these):**
- `import { POI } from '@resort-map/builder-core'` — types only from `@resort-map/types`
- `config.pois.push(...)` — mutation in core packages
- `throw ErrorCode.GWMAP_PARSE_ERROR` — always throw an Error instance
- `<View style={{ position: 'absolute' }}>` for RN map overlays — use SVG only
- `onClick` on SVG elements in builder canvas — use `onPointerDown`

## Project Structure & Boundaries

### Complete Project Directory Structure

```
resortMap/
├── package.json              # workspace root + Bun catalogs
├── tsconfig.base.json        # shared: strict, ES2022, moduleResolution: bundler
├── bun.lockb
├── .gitignore
├── CLAUDE.md
│
└── packages/
    │
    ├── types/                          # @resort-map/types
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts                # re-exports all public types + ErrorCode + validateGwmap
    │       ├── schema.ts               # MapConfig, POI, GraphNode, GraphEdge, MapMeta, Position, Route
    │       ├── errors.ts               # ErrorCode const object
    │       ├── validate.ts             # validateGwmap(raw: unknown): MapConfig
    │       └── fixtures/
    │           ├── sample.gwmap.json   # minimal valid file (1 POI, 2 nodes, 1 edge)
    │           └── complex.gwmap.json  # multi-POI, multi-road for routing tests
    │
    ├── builder-core/                   # @resort-map/builder-core
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts                # public API
    │       ├── mapConfig.ts            # createMapConfig, addPoi, removePoi,
    │       │                           # updatePoi, addNode, addEdge, removeNode
    │       ├── serialization.ts        # serializeGwmap, parseGwmap (delegates to types)
    │       ├── utils/
    │       │   └── idGeneration.ts     # thin wrapper over crypto.randomUUID()
    │       └── __tests__/
    │           ├── mapConfig.test.ts
    │           └── serialization.test.ts
    │
    ├── view-core/                      # @resort-map/view-core
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts                # public API
    │       ├── routing.ts              # computeRoute() — Dijkstra over graph
    │       ├── filtering.ts            # filterPois()
    │       ├── utils/
    │       │   ├── pixelMath.ts        # pixelDistance, pixelsToMeters, estimateWalkTime
    │       │   └── graphUtils.ts       # nearestNode, buildAdjacencyList
    │       └── __tests__/
    │           ├── routing.test.ts
    │           ├── filtering.test.ts
    │           └── pixelMath.test.ts
    │
    ├── builder-react/                  # @resort-map/builder-react (standalone app)
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── index.ts                    # Bun.serve() entry — serves index.html
    │   ├── index.html                  # <script type="module" src="./src/main.tsx">
    │   └── src/
    │       ├── main.tsx                # createRoot → <App />
    │       ├── App.tsx                 # root layout (canvas + toolbar + sidebar)
    │       ├── store/
    │       │   └── mapStore.ts         # Zustand: MapConfig, activeTool, undoStack
    │       ├── components/
    │       │   ├── MapCanvas.tsx       # SVG canvas — background image + POI/node overlay
    │       │   ├── Toolbar.tsx         # select / placePoi / drawRoad tool buttons
    │       │   ├── Sidebar.tsx         # POI property editor (label, tags, icon, nodeId)
    │       │   ├── MapMetaPanel.tsx    # imageUrl input, center picker, scale input
    │       │   └── ExportButton.tsx    # serializeGwmap() → file download
    │       └── __tests__/
    │           └── mapStore.test.ts
    │
    ├── view-react/                     # @resort-map/view-react
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts                # exports MapViewer
    │       ├── MapViewer.tsx           # root component — accepts source prop
    │       ├── components/
    │       │   ├── MapCanvas.tsx       # CSS-transform div wrapping img + svg overlay
    │       │   ├── PoiPin.tsx          # <g data-poi-id> with icon/circle
    │       │   ├── RoutePath.tsx       # <polyline> for computed route
    │       │   └── FilterPanel.tsx     # tag chips + distance slider
    │       ├── hooks/
    │       │   └── useMapViewer.ts     # useReducer → ViewerState
    │       └── __tests__/
    │           ├── MapViewer.test.tsx
    │           └── useMapViewer.test.ts
    │
    └── view-react-native/              # @resort-map/view-react-native
        ├── package.json
        ├── tsconfig.json               # jsx: react-native
        └── src/
            ├── index.ts                # exports MapViewer
            ├── MapViewer.tsx           # root — GestureHandlerRootView wrapper
            ├── components/
            │   ├── MapCanvas.tsx       # Animated.View → Image + Svg overlay
            │   ├── PoiPin.tsx          # <G><Circle/></G> with data attrs
            │   ├── RoutePath.tsx       # <Polyline> for route
            │   └── FilterPanel.tsx     # RN View with tag TouchableOpacity buttons
            ├── hooks/
            │   ├── useMapViewer.ts     # useReducer → ViewerState (mirrors view-react)
            │   └── useGestures.ts      # pan + pinch setup via Reanimated worklets
            └── __tests__/
                └── MapViewer.test.tsx
```

### Package Dependency Graph

```
@resort-map/types          (no workspace deps)
       ↑
       ├── @resort-map/builder-core
       │          ↑
       │    @resort-map/builder-react  (peer: react, react-dom)
       │
       └── @resort-map/view-core
                  ↑
            ├── @resort-map/view-react
            │   (peer: react, react-dom)
            │
            └── @resort-map/view-react-native
                (peer: react, react-native, react-native-svg,
                 react-native-gesture-handler, react-native-reanimated)
```

No cross-domain deps: builder packages never import view packages and vice versa.

### Architectural Boundaries

**Schema boundary (`@resort-map/types`):**
`validateGwmap()` is the sole entry point for untrusted `.gwmap` data. All other packages call it; none re-implement validation logic.

**Builder/viewer boundary:**
The `.gwmap` file (on disk or as a JSON string) is the only artifact that crosses from builder to viewer. No runtime coupling exists between the two domains.

**Core/adapter boundary:**
builder-core and view-core export pure functions only. Adapters own all state and call core functions on events. No shared state, no callbacks, no subscriptions cross this boundary.

**Render boundary (view-react vs view-react-native):**
Both adapters implement the same `MapViewerProps` interface and `ViewerState` shape. Divergence is limited to rendering primitives (`<svg>` vs `<Svg>`, `<img>` vs `<Image>`, CSS transforms vs Reanimated).

### Requirements → File Mapping

| Capability | Primary files |
|---|---|
| CAP-1 — produce valid `.gwmap` | `builder-core/src/mapConfig.ts`, `builder-core/src/serialization.ts` |
| CAP-2 — visual builder UI | `builder-react/src/store/mapStore.ts`, `builder-react/src/components/` |
| CAP-3 — parse `.gwmap` | `types/src/validate.ts`, `view-core/src/index.ts` |
| CAP-4 — walking itinerary + walk time | `view-core/src/routing.ts`, `view-core/src/utils/graphUtils.ts`, `view-core/src/utils/pixelMath.ts` |
| CAP-5 — POI filtering | `view-core/src/filtering.ts`, `view-core/src/utils/pixelMath.ts` |
| CAP-6 — React web viewer | `view-react/src/MapViewer.tsx`, `view-react/src/components/`, `view-react/src/hooks/useMapViewer.ts` |
| CAP-7 — RN/Expo viewer | `view-react-native/src/MapViewer.tsx`, `view-react-native/src/components/`, `view-react-native/src/hooks/` |
| CAP-8 — framework-agnostic cores | Enforced by `package.json` — builder-core and view-core have zero React peer deps |

### Data Flow

**Authoring path:**
```
User interaction
  → builder-react Zustand store action
  → builder-core pure function (returns new MapConfig)
  → store state update → SVG canvas re-renders
  → ExportButton: serializeGwmap(config) → .gwmap file download
```

**Viewing path:**
```
Host app passes source prop (string | MapConfig)
  → MapViewer: parseGwmap(source) if string → MapConfig
  → validateGwmap(config) at parse boundary
  → user taps POI / requests route / changes filter
  → useMapViewer dispatch → ViewerState update
  → view-core pure function called (computeRoute / filterPois)
  → result stored in ViewerState → canvas re-renders
```

### Development Workflow

**Builder dev server:** `bun --hot packages/builder-react/index.ts`

**Run all tests:** `bun test`

**Full workspace build:** `bun run --filter '*' build`

**Shared fixture import in any test:** `import sampleMap from '@resort-map/types/fixtures/sample.gwmap.json'`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:** All 7 ADRs are mutually compatible. Technology versions confirmed: Bun 1.3.14, Expo SDK 56, React ≥18, Node 18, Zustand 4+, Reanimated v2 API, GestureHandler SDK 50+ API. No version conflicts detected.

**Pattern Consistency:** camelCase file naming, `src/__tests__/` structure, `import type` discipline, and immutability rules are internally consistent and aligned with the chosen stack.

**Structure Alignment:** Package dependency graph is acyclic. Core/adapter boundary is enforced by package.json peer dep declarations. `.gwmap` remains the sole builder→viewer integration artifact.

**Coherence Note:** Each library package's `package.json` must define an `"exports"` field to enable `@resort-map/types/fixtures/*` imports and prevent consumers from deep-importing implementation files. Addressed in first implementation story.

### Requirements Coverage Validation ✅

All 8 capabilities (CAP-1 through CAP-8) are mapped to specific files. All NFRs are architecturally supported: Node 18 compatibility (ES2022 target, no Node 19+ APIs), Expo managed workflow (Expo-compatible deps only, TS source shipped), deterministic routing (pure functions), zero framework coupling in cores (enforced by package.json).

### Implementation Readiness Validation ✅

All critical decisions are documented. Naming, structure, export, component, SVG, RN, state, error, and process patterns are all specified with examples and anti-patterns. The file tree maps every capability to specific source files.

**Note on open SPEC questions:** 5 questions remain open from the SPEC (POI/node namespace, RN offline, route animation, graph scale, undo/redo). The POI/node namespace question must be resolved before implementing `routing.ts` — it determines whether `nearestNode` snapping is always required. All others are non-blocking for the first 3 packages.

### Gap Analysis Results

**Important — `package.json` exports field:**
Each library package needs an `"exports"` field. For `@resort-map/types`:
```json
"exports": {
  ".": "./src/index.ts",
  "./fixtures/*": "./src/fixtures/*"
}
```
Similar entries for builder-core, view-core, view-react, view-react-native. Implement in the workspace initialisation story.

**Important — Shared viewer reducer:**
`useMapViewer.ts` will be near-identical in view-react and view-react-native, creating a divergence risk. Resolution: add `viewerReducer(state, action)` as a pure function exported from `view-core/src/viewerState.ts`. Both adapters import it and wrap with `useReducer`. Adds one file to view-core; keeps adapters thin.

**Minor — Background image dimensions:**
SVG viewBox requires natural image dimensions at runtime. Resolution: use the `onLoad` / `onLoadEnd` event of `<img>` / `<Image>` to read dimensions and store in ViewerState as `imageSize: { width: number; height: number } | null`.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** High

**Key Strengths:**
- Clean acyclic dependency graph with a single shared-types package
- Pure-function cores make every business logic unit trivially testable
- Single transform container pattern (ADR-003) eliminates the hardest coordinate-sync problem in cross-platform map rendering
- `.gwmap` as the sole builder/viewer boundary means the two domains can be developed and tested in complete isolation
- All Expo constraints are respected from the start — no future ejection risk

**Areas for Future Enhancement:**
- Schema migration functions (when v2.0 breaking changes are needed)
- CI/CD pipeline (GitHub Actions, deferred post-MVP)
- npm publishing configuration and scope
- E2E test suite using a headless browser for builder-react
- Extraction of `viewerReducer` to view-core (Important gap above)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all ADRs exactly as documented (ADR-001 through ADR-007)
- Use implementation patterns from the Patterns section consistently across all packages
- Respect the acyclic dependency graph — builder packages never import view packages
- All shared types come from `@resort-map/types` — never redeclare
- Resolve the POI/node namespace open question before implementing `routing.ts`

**First Implementation Priority:**
Workspace initialisation story:
1. Create root `package.json` with `"workspaces": ["packages/*"]` and Bun catalogs
2. Create `tsconfig.base.json`
3. Scaffold all 6 package directories with `package.json` + `tsconfig.json` + `src/index.ts`
4. Add `"exports"` fields to all library packages
5. Create `packages/types/src/fixtures/sample.gwmap.json` (minimal valid file)
6. Verify `bun install` and `bun test` run cleanly from workspace root

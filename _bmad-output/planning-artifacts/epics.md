---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/specs/spec-resort-map/SPEC.md
  - _bmad-output/specs/spec-resort-map/gwmap-schema.md
  - _bmad-output/specs/spec-resort-map/package-architecture.md
  - _bmad-output/planning-artifacts/architecture.md
---

# resortMap - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for resortMap, decomposing the requirements from the SPEC, gwmap schema, and Architecture decisions into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: An author can produce a valid `.gwmap` file encoding a background image URL, map metadata (center, scale), points of interest, and a road graph — the file passes schema validation and round-trips (serialize → parse) with zero data loss. (CAP-1)

FR2: An author using builder-react can visually place POIs and road nodes on a background image, configure their properties (label, tags, icon, nodeId), and export the result as a `.gwmap` file — without editing JSON. (CAP-2)

FR3: view-core can parse a `.gwmap` file and return a typed `MapConfig` object; parsing a malformed file throws a descriptive error with an `ErrorCode`. (CAP-3)

FR4: view-core can compute a walking itinerary and estimated walk time between any two points on the map (POI id, user position, or custom pixel position) — deterministic on identical inputs. (CAP-4)

FR5: view-core can filter the POI list by one or more tags, by maximum distance from a given position, or by both combined; an empty predicate set returns the full list. (CAP-5)

FR6: view-react exposes the map viewer as a React ≥18 component accepting a `.gwmap` source (string or parsed config), rendering the interactive map with routing and filtering. (CAP-6)

FR7: view-react-native exposes the same viewer capabilities as an Expo-compatible React Native component for iOS and Android, consuming the same `.gwmap` file without platform-specific schema changes. (CAP-7)

FR8: builder-core and view-core are framework-agnostic — zero React/RN imports — and their full test suites pass in a plain Node 18 environment. (CAP-8)

### NonFunctional Requirements

NFR1: All packages must compile and tests must pass under Node 18 (ES2022 target, no Node 19+ APIs).
NFR2: Bun workspace monorepo — `bun install`, `bun test`, and `bun build` are the only build/test entry points.
NFR3: The `.gwmap` format is JSON with a `.gwmap` file extension; the schema in `gwmap-schema.md` is the single source of truth for all packages.
NFR4: builder-core and view-core must contain zero React or React Native imports.
NFR5: Adapter packages (builder-react, view-react, view-react-native) must delegate all business logic to their respective core — no duplicated routing, filtering, or serialization logic.
NFR6: Walk is the only supported transportation mode; no vehicle or cycling routing attributes.
NFR7: Background map image is referenced by URL in the `.gwmap` file — not embedded or base64-encoded.
NFR8: view-react targets React ≥18; view-react-native targets Expo SDK 56 (React Native current stable).
NFR9: view-react-native must be Expo-compatible (managed or bare workflow) — all native deps available via `expo install`, no custom native modules outside the Expo SDK.
NFR10: Routing is deterministic — identical inputs always produce identical route and walk-time outputs.

### Additional Requirements

From Architecture decisions (ADRs) and validation gaps:

- ARCH-1: Dedicated `@resort-map/types` package (6th package) — all other packages declare `"@resort-map/types": "workspace:*"` dependency. This is the sole source for all shared TypeScript types and `ErrorCode`.
- ARCH-2: view-core exports stateless pure functions only (`computeRoute`, `filterPois`, `parseGwmap`, `validateGwmap`, `viewerReducer`). No internal state.
- ARCH-3: Single animated transform container for pan/zoom — one `<Animated.View>` (RN) or CSS-transformed `<div>` (web) wraps the background image and SVG overlay as siblings.
- ARCH-4: Error handling — all thrown errors follow `Object.assign(new Error(message), { code: ErrorCode.X })`. `ErrorCode` const object exported from `@resort-map/types`.
- ARCH-5: Zustand store in builder-react (`src/store/mapStore.ts`) manages `MapConfig`, `activeTool`, `selectedItemId`, and `undoStack` (max 50 entries). Actions wrap builder-core's immutable functions.
- ARCH-6: Forward-compatible `.gwmap` schema versioning — additive changes bump minor version; breaking changes bump major. Parser uses strip+preserve mode for unknown fields.
- ARCH-7: `crypto.randomUUID()` for all POI and graph node ID generation — no external dep.
- ARCH-8: `viewerReducer(state, action)` exported as a pure function from `view-core/src/viewerState.ts`; both view-react and view-react-native import and wrap with `useReducer`.
- ARCH-9: `imageSize: { width: number; height: number } | null` in ViewerState — populated via `onLoad`/`onLoadEnd` event of the background image; used for SVG `viewBox`.
- ARCH-10: All library packages require an `"exports"` field in `package.json` — prevents deep imports and enables `@resort-map/types/fixtures/*` test imports.
- ARCH-11: Shared `.gwmap` test fixtures at `packages/types/src/fixtures/` — `sample.gwmap.json` (minimal) and `complex.gwmap.json` (multi-POI/road for routing tests).
- ARCH-12: builder-react SVG canvas uses `onPointerDown` (not `onClick`), `viewBox="0 0 {w} {h}"`, and `data-poi-id` / `data-node-id` attributes on elements.
- ARCH-13: Expo patterns — `GestureHandlerRootView` at root of RN `MapViewer`; all overlays via `react-native-svg`; animations via Reanimated v2 `useSharedValue` + `useAnimatedStyle`.

### UX Design Requirements

No UX design document. Visual reference: https://www.stay-app.com/hotel-map (custom image-based map, category filter chips, tap-to-select POI, A→B routing path). All UX requirements are captured within CAP-2 (builder) and CAP-6/CAP-7 (viewers).

### FR Coverage Map

```
FR1  → Epic 2 — builder-core: createMapConfig, addPoi, addNode, serializeGwmap
FR2  → Epic 2 — builder-react: SVG canvas, Zustand store, toolbar, export
FR3  → Epic 3 — view-core: parseGwmap, validateGwmap
FR4  → Epic 3 — view-core: computeRoute, graphUtils, pixelMath
FR5  → Epic 3 — view-core: filterPois, pixelMath (distance)
FR6  → Epic 4 — view-react: MapViewer, MapCanvas, PoiPin, RoutePath, FilterPanel
FR7  → Epic 5 — view-react-native: MapViewer, MapCanvas, PoiPin, RoutePath, FilterPanel
FR8  → Epic 1 + 2 + 3 — enforced by package.json peer dep declarations in all core packages
SPEC Success Signal → Epic 3 Story 3.5 — end-to-end pipeline integration test (builder-core → view-core)
```

## Epic List

### Epic 1: Workspace Foundation & Shared Schema
Developers can scaffold the full monorepo, run `bun install` and `bun test` cleanly, and have the `.gwmap` schema, shared types, `ErrorCode`, `validateGwmap`, and test fixtures available as `@resort-map/types` — the contract every other package builds against.
**FRs covered:** FR8 (types package)
**ARCH covered:** ARCH-1, ARCH-4, ARCH-7, ARCH-10, ARCH-11

### Epic 2: Map File Authoring (builder-core + builder-react)
A map author can open builder-react in a browser, load a background image by URL, visually place POIs (with tags, icons, and node connections) and road graph nodes/edges, set the map center and scale, undo mistakes, and download a valid `.gwmap` file — without touching JSON.
**FRs covered:** FR1, FR2, FR8 (builder-core)
**ARCH covered:** ARCH-5, ARCH-6, ARCH-7, ARCH-12
**Depends on:** Epic 1

### Epic 3: Map Viewing Core (view-core)
Any adapter — web or mobile — can parse a `.gwmap` file, compute a walking itinerary with walk time between any two points, and filter POIs by tag or distance. All logic is tested in isolation, framework-agnostic, with shared fixtures. An end-to-end integration test validates the full builder-to-viewer pipeline at the library level.
**FRs covered:** FR3, FR4, FR5, FR8 (view-core)
**ARCH covered:** ARCH-2, ARCH-8, ARCH-9
**Depends on:** Epic 1

### Epic 4: Web Map Viewer (view-react)
A React ≥18 developer can drop `<MapViewer source={...} />` into their web app and get a pannable/zoomable map with POI pins, tag/distance filtering, and an A→B walking route with walk time.
**FRs covered:** FR6
**ARCH covered:** ARCH-3 (web), ARCH-9
**Depends on:** Epic 3

### Epic 5: Mobile Map Viewer (view-react-native)
An Expo developer can add `<MapViewer source={...} />` to their iOS/Android app and get the same map experience — pinch-to-zoom, POI filtering, walking route — from the exact same `.gwmap` file.
**FRs covered:** FR7
**ARCH covered:** ARCH-3 (RN), ARCH-13
**Depends on:** Epic 3

---

## Stories

### Epic 1: Workspace Foundation & Shared Schema

#### Story 1.1: Monorepo Workspace Scaffold

**As a** developer,
**I want** the resortMap Bun workspace initialized with all 6 package directories, root config files, and correct inter-package wiring,
**So that** `bun install` and `bun test` run cleanly from the workspace root as a baseline for all subsequent development.

**Acceptance Criteria:**

- **Given** a fresh clone of the repository **When** I run `bun install` from the root **Then** all 6 packages are symlinked in `node_modules` (`@resort-map/types`, `@resort-map/builder-core`, `@resort-map/view-core`, `@resort-map/builder-react`, `@resort-map/view-react`, `@resort-map/view-react-native`) **And** `bun test` exits cleanly (no test files yet, runner finds none and exits 0)

- **Given** any library package (`types`, `builder-core`, `view-core`, `view-react`, `view-react-native`) **When** I inspect its `package.json` **Then** it has an `"exports"` field with `"."` pointing to `"./src/index.ts"` **And** `@resort-map/types` additionally exports `"./fixtures/*": "./src/fixtures/*"` **And** all inter-package references use `"workspace:*"`

- **Given** the root `tsconfig.base.json` **When** any package's `tsconfig.json` extends it **Then** `"strict": true`, `"target": "ES2022"`, `"moduleResolution": "bundler"`, and `"declaration": true` are active **And** `view-react-native`'s tsconfig adds `"jsx": "react-native"`

- **Given** the root `package.json` **When** I inspect the `"catalog"` field **Then** `typescript`, `react`, `react-dom`, `react-native-svg`, `react-native-gesture-handler`, and `react-native-reanimated` versions are pinned there **And** each relevant package references these via `"catalog:"` protocol

---

#### Story 1.2: @resort-map/types — Shared TypeScript Types & ErrorCode

**As a** developer building any resortMap package,
**I want** `@resort-map/types` to export all shared TypeScript interfaces and the `ErrorCode` const object,
**So that** every package has a single, type-safe source of truth for the `.gwmap` data model without duplicating type definitions.

**Acceptance Criteria:**

- **Given** `@resort-map/types` is imported in any package **When** I import named types from `"@resort-map/types"` **Then** the following are available and correctly typed: `MapConfig`, `POI`, `GraphNode`, `GraphEdge`, `MapMeta`, `Position`, `Route`, `PoiFilterOptions`, `ViewerStatus`, `ViewerState`, `ViewerAction` **And** `ViewerAction` is a discriminated union of all viewer action types (`MAP_LOADED`, `SELECT_POI`, `SET_ROUTE`, `SET_FILTER`, `IMAGE_LOADED`, `SET_ERROR`) allowing adapter packages to dispatch typed actions without importing from `view-core`

- **Given** I import `ErrorCode` from `"@resort-map/types"` **When** I inspect its values **Then** it is a `const` object (not an enum) with exactly these keys: `GWMAP_PARSE_ERROR`, `GWMAP_VERSION_MISMATCH`, `ROUTE_NOT_FOUND`, `INVALID_POSITION`, `INVALID_NODE_REF` **And** TypeScript infers the value type as a string literal union

- **Given** builder-core and view-core packages **When** I search their source files for type definitions of `POI`, `MapConfig`, or `GraphNode` **Then** none are found — all types are imported from `@resort-map/types`

- **Given** the `@resort-map/types` package **When** I run `bun test` **Then** all type-export tests pass and the package compiles with zero TypeScript errors

---

#### Story 1.3: @resort-map/types — validateGwmap & Test Fixtures

**As a** developer in any resortMap package,
**I want** `validateGwmap(raw: unknown): MapConfig` available from `@resort-map/types` and shared `.gwmap` fixture files importable via `@resort-map/types/fixtures/*`,
**So that** schema validation is a single implementation shared across all packages and test fixtures are consistent everywhere.

**Acceptance Criteria:**

- **Given** a valid `.gwmap` JSON object **When** I call `validateGwmap(obj)` **Then** it returns a fully typed `MapConfig` with no errors **And** unknown top-level fields are stripped silently **And** unknown fields inside any `POI.meta` object are preserved

- **Given** a `.gwmap` object missing a required field (e.g., `map.backgroundImageUrl`) **When** I call `validateGwmap(obj)` **Then** it throws `Object.assign(new Error(message), { code: ErrorCode.GWMAP_PARSE_ERROR })` **And** the error message names the specific missing field

- **Given** a `.gwmap` object with an unknown major version (e.g., `"version": "2.0"`) **When** I call `validateGwmap(obj)` **Then** it throws with `code: ErrorCode.GWMAP_VERSION_MISMATCH`

- **Given** `import sampleMap from "@resort-map/types/fixtures/sample.gwmap.json"` **When** I call `validateGwmap(sampleMap)` **Then** it validates without error **And** `sampleMap.pois` has exactly 1 entry with at least one tag **And** `sampleMap.graph.nodes` has exactly 2 entries and `sampleMap.graph.edges` has exactly 1 entry

- **Given** `import complexMap from "@resort-map/types/fixtures/complex.gwmap.json"` **When** I call `validateGwmap(complexMap)` **Then** it validates without error **And** `complexMap.pois` has at least 3 POIs across at least 2 distinct tags **And** `complexMap.graph` has at least 6 nodes and 5 edges forming a connected path between at least 2 POIs

---

### Epic 2: Map File Authoring (builder-core + builder-react)

#### Story 2.1: builder-core — Authoring Operations & Serialization

**As a** builder-react adapter,
**I want** builder-core to expose immutable operations for composing a `MapConfig` (create, add/remove/update POIs, add/remove nodes and edges) plus serialize/parse round-trip functions,
**So that** the UI can call pure functions to mutate map state and export a valid `.gwmap` file with guaranteed schema compliance.

**Acceptance Criteria:**

- **Given** a valid `MapMeta` (`backgroundImageUrl`, `center`, `scale`) **When** I call `createMapConfig(meta)` **Then** it returns a `MapConfig` with `version: "1.0"`, `pois: []`, and `graph: { nodes: [], edges: [] }`

- **Given** an existing `MapConfig` **When** I call `addPoi(config, { label, position, tags })` **Then** it returns a new `MapConfig` with the POI appended and `id` generated by `crypto.randomUUID()` **And** the original `config` is unchanged

- **Given** a `MapConfig` with at least one POI **When** I call `removePoi(config, poiId)` **Then** it returns a new `MapConfig` with that POI removed

- **Given** a `MapConfig` with at least one POI **When** I call `updatePoi(config, poiId, { label: "New Name" })` **Then** it returns a new `MapConfig` where only the patched fields change and all others are preserved

- **Given** a `MapConfig` **When** I call `addNode(config, { position })` **Then** it returns a new `MapConfig` with the node appended and `id` from `crypto.randomUUID()`

- **Given** a `MapConfig` with two nodes `A` and `B` **When** I call `addEdge(config, { from: A.id, to: B.id })` **Then** it returns a new `MapConfig` with the edge appended

- **Given** a `MapConfig` with node `N` referenced by one or more edges **When** I call `removeNode(config, N.id)` **Then** it returns a new `MapConfig` with the node removed **and** all edges where `from` or `to` equals `N.id` removed

- **Given** a `MapConfig` with an edge from node `A` to node `B` **When** I call `removeEdge(config, A.id, B.id)` **Then** it returns a new `MapConfig` with that specific edge removed **And** both nodes remain in the graph **And** the original `config` is unchanged

- **Given** any valid `MapConfig` **When** I call `serializeGwmap(config)` then `parseGwmap(result)` **Then** the parsed result deep-equals the original `config` (lossless round-trip, FR1)

- **Given** a malformed JSON string **When** I call `parseGwmap(raw)` **Then** it throws with `code: ErrorCode.GWMAP_PARSE_ERROR`

- **Given** builder-core's source files **When** I grep for `import.*react` **Then** zero matches are found (NFR4)

> **Public API exports** (in addition to above operations): `export function removeEdge(config: MapConfig, from: string, to: string): MapConfig`

---

#### Story 2.2: builder-react — App Skeleton & Zustand Store

**As a** map author,
**I want** builder-react to start as a working Bun.serve() app with the Zustand store wired up, undo/redo operational, and tool selection available in a toolbar,
**So that** all subsequent story features have a stable foundation to build on.

**Acceptance Criteria:**

- **Given** I run `bun --hot ./packages/builder-react/src/index.ts` **When** I open `http://localhost:3000` **Then** the app renders without errors and shows a three-zone layout: toolbar (top), canvas area (center), sidebar (right)

- **Given** the Zustand store at `src/store/mapStore.ts` **When** I inspect its state shape **Then** it contains: `mapConfig: MapConfig | null`, `activeTool: "select" | "placePoi" | "placeNode" | "drawEdge"`, `selectedItemId: string | null`, `undoStack: MapConfig[]`

- **Given** any store action that mutates `mapConfig` **When** the action executes **Then** the current `mapConfig` is pushed onto `undoStack` before mutation **And** if `undoStack` would exceed 50 entries, the oldest entry is dropped

- **Given** `undoStack` has at least one entry **When** I call `undo()` **Then** the top entry is popped from `undoStack` and becomes the current `mapConfig`

- **Given** the toolbar **When** I click a tool button (Select, Place POI, Place Node, Draw Edge) **Then** `activeTool` updates to the corresponding value **And** the active button is visually highlighted

---

#### Story 2.3: builder-react — MapCanvas: Image Loading & POI Placement

**As a** map author,
**I want** to see my background image on the SVG canvas and place POI pins by clicking in Place POI mode,
**So that** I can visually position points of interest without editing JSON.

**Acceptance Criteria:**

- **Given** `mapConfig` has a `backgroundImageUrl` **When** the MapCanvas renders **Then** the background image appears inside an SVG with `viewBox="0 0 {imageNaturalWidth} {imageNaturalHeight}"` **And** the `<image>` element uses `onPointerDown` (not `onClick`, per ARCH-12)

- **Given** `activeTool` is `"placePoi"` **When** I click the canvas **Then** `addPoi` is called with `position` computed from the click coordinates relative to the SVG viewBox **And** a POI pin (SVG marker) appears at that position immediately **And** the new POI's id becomes `selectedItemId`

- **Given** `activeTool` is `"select"` and I click a POI pin **When** the `onPointerDown` fires on the pin (carrying `data-poi-id`) **Then** `selectedItemId` updates to that POI's id

- **Given** `activeTool` is `"select"` and I drag a POI pin **When** pointer events fire during drag **Then** `updatePoi` is called with the updated pixel position **And** the pin moves in real time with the pointer

- **Given** `activeTool` is `"select"` and a POI is selected (`selectedItemId` matches a POI id) **When** I press the Delete key **Then** `removePoi` is called with that POI's id **And** the pin is removed from the canvas **And** `selectedItemId` is cleared to `null`

- **Given** a POI whose id matches `selectedItemId` **When** the canvas renders **Then** that pin is visually distinct from unselected pins (e.g., different fill color or outline)

---

#### Story 2.4: builder-react — Road Drawing: Node & Edge Placement

**As a** map author,
**I want** to place road nodes and draw edges between them on the canvas,
**So that** view-core can compute walking itinerary routes over the road graph I define.

**Acceptance Criteria:**

- **Given** `activeTool` is `"placeNode"` **When** I click the canvas **Then** `addNode` is called with the click position **And** a road node marker (visually distinct from POI pins) appears on the canvas with a `data-node-id` attribute (ARCH-12) **And** the new node's id becomes `selectedItemId`

- **Given** `activeTool` is `"drawEdge"` and I click a graph node (first click) **When** the node's `data-node-id` is read **Then** that node becomes the edge-start candidate with a visual indicator (e.g., highlighted ring)

- **Given** an edge-start candidate exists **When** I click a second graph node **Then** `addEdge` is called with `{ from: startId, to: endId }` **And** a line connecting the two nodes renders on the canvas **And** the edge-start candidate is cleared

- **Given** `activeTool` is `"select"` and a node is selected **When** I press the Delete key **Then** `removeNode` is called, removing the node and all its connected edges from the canvas

- **Given** `activeTool` is `"select"` and I click an edge line (`<line>` element carrying `data-edge-from` and `data-edge-to` attributes) **When** the `onPointerDown` fires **Then** `selectedItemId` is set to a synthetic edge key `"{from}:{to}"` **And** the edge is visually highlighted

- **Given** an edge is selected (via `selectedItemId` of the form `"{from}:{to}"`) **When** I press the Delete key **Then** `removeEdge` is called with the `from` and `to` node ids **And** the edge line is removed from the canvas **And** both connected nodes remain **And** `selectedItemId` is cleared to `null`

- **Given** a canvas with both POI pins and road nodes **When** rendered **Then** the two element types are visually distinct in shape or color **And** both carry the correct `data-poi-id` or `data-node-id` attributes

---

#### Story 2.5: builder-react — Sidebar Property Editor

**As a** map author,
**I want** to edit a selected POI's label, tags, icon URL, and node connection in a sidebar panel,
**So that** I can configure all POI metadata visually without touching the JSON.

**Acceptance Criteria:**

- **Given** a POI is selected (`selectedItemId` matches a POI id) **When** the sidebar renders **Then** it shows editable fields for: Label (text input), Tags (chip input supporting free text), Icon URL (text input), Node ID (text input)

- **Given** I update the Label field and blur **When** `updatePoi` is called **Then** the POI's label reflects the new value immediately on the canvas

- **Given** I add a tag chip **When** the tag is committed (Enter or blur) **Then** `updatePoi` is called with the new tags array **And** the updated tags are shown in the sidebar

- **Given** I enter a value in Icon URL and blur **When** `updatePoi` is called **Then** the POI's `icon` field reflects the new URL

- **Given** a node is selected (`selectedItemId` matches a node id) **When** the sidebar renders **Then** it shows the node's position (read-only) and its id (read-only, copyable to clipboard)

- **Given** nothing is selected (`selectedItemId` is null) **When** the sidebar renders **Then** it shows a placeholder message: "Select a POI or node to edit its properties"

---

#### Story 2.6: builder-react — Map Metadata Panel & .gwmap Export

**As a** map author,
**I want** to set the background image URL, define the map center, enter the scale, and download the completed map as a `.gwmap` file,
**So that** I can produce a complete, valid file for consumption by view-react and view-react-native.

**Acceptance Criteria:**

- **Given** the metadata panel **When** I enter a background image URL and press Enter or blur **Then** `mapConfig.map.backgroundImageUrl` is updated and the canvas attempts to load the new image

- **Given** I click the "Set Center" button and then click a point on the canvas **When** the click position is recorded **Then** `mapConfig.map.center` updates to that pixel coordinate **And** a center marker renders on the canvas at that position

- **Given** I enter a numeric value in the Scale (m/px) field and blur **When** the value is committed **Then** `mapConfig.map.scale` updates to the parsed float

- **Given** a valid `mapConfig` **When** I click "Export .gwmap" **Then** `serializeGwmap(mapConfig)` is called **And** a browser file download is triggered with filename `map.gwmap` and the serialized JSON as content **And** the downloaded file passes `validateGwmap` without error

- **Given** `mapConfig` is null **When** I look at the "Export .gwmap" button **Then** it is disabled (no download triggered on click)

---

### Epic 3: Map Viewing Core (view-core)

#### Story 3.1: view-core — Pixel Math & Graph Utilities

**As a** view-core routing and filtering function,
**I want** foundational pixel-space math utilities and graph structure helpers available,
**So that** routing and filtering logic can call pure, tested primitives without reimplementing geometry.

**Acceptance Criteria:**

- **Given** two `Position` values `a` and `b` **When** I call `pixelDistance(a, b)` **Then** it returns the Euclidean distance in pixels as a number ≥ 0

- **Given** a pixel distance and a `scale` (meters/pixel) **When** I call `pixelsToMeters(pixels, scale)` **Then** it returns `pixels × scale`

- **Given** a distance in meters **When** I call `estimateWalkTime(distanceMeters)` **Then** it returns `Math.round(distanceMeters / 1.4)` (seconds, walk speed 1.4 m/s)

- **Given** a `MapConfig` **When** I call `buildAdjacencyList(config)` **Then** it returns a `Map<string, string[]>` where each node id maps to the ids of its neighbours **And** for undirected edges (no `oneway`), both directions are added **And** for edges with `oneway: true`, only `from → to` is added

- **Given** a `MapConfig` and a `Position` **When** I call `nearestNode(config, position)` **Then** it returns the `GraphNode` with the smallest `pixelDistance` to the given position **And** if `config.graph.nodes` is empty, it returns `null`

- **Given** a valid `.gwmap` JSON string **When** I call `parseGwmap(raw)` from view-core **Then** it returns a fully typed `MapConfig` (delegates to `JSON.parse` + `validateGwmap` from `@resort-map/types`) — satisfying FR3 through view-core, not the adapter

- **Given** view-core source files **When** I grep for `import.*react` **Then** zero matches are found (NFR4)

---

#### Story 3.2: view-core — Dijkstra Route Computation

**As a** viewer adapter (view-react or view-react-native),
**I want** `computeRoute(config, from, to)` to return an ordered list of graph nodes and a walk time between any two points,
**So that** I can display the shortest walking path between two positions on the map.

**Acceptance Criteria:**

- **Given** a `MapConfig` with a connected graph and two POI ids as `from` and `to` **When** I call `computeRoute(config, fromPoiId, toPoiId)` **Then** it returns a `Route` with `nodes` (ordered path), `distanceMeters`, and `walkTimeSeconds` **And** `walkTimeSeconds` equals `Math.round(distanceMeters / 1.4)`

- **Given** a `Position` (not a POI id) as `from` or `to` **When** `computeRoute` is called **Then** it snaps the position to the nearest graph node via `nearestNode` before pathfinding

- **Given** a POI with a valid `nodeId` **When** `computeRoute` is called with that POI id **Then** it uses `nodeId` directly without snapping

- **Given** a POI without a `nodeId` **When** `computeRoute` is called with that POI id **Then** it snaps to the nearest node via `nearestNode`

- **Given** no path exists between `from` and `to` in the graph **When** `computeRoute` is called **Then** it returns `null` (not an error, per FR4)

- **Given** identical inputs to `computeRoute` called twice **When** both calls return a `Route` **Then** the two results are deep-equal (deterministic, NFR10)

- **Given** a `MapConfig` from `complexMap` fixture (multi-node connected graph) **When** I call `computeRoute` between two POIs connected by a known path **Then** the returned `nodes` array matches the expected shortest path

> **Deferred (post-v1):** The routing algorithm is Dijkstra for v1. The question of whether graph scale (number of nodes/edges) warrants switching to A* is deferred — revisit if performance testing reveals a bottleneck.

---

#### Story 3.3: view-core — POI Filtering

**As a** viewer adapter,
**I want** `filterPois(config, options)` to return only POIs matching supplied tag and/or distance predicates,
**So that** the viewer can display filtered POI sets without duplicating filtering logic in each adapter.

**Acceptance Criteria:**

- **Given** a `MapConfig` and `filterPois(config, {})` (empty options) **When** called **Then** it returns all POIs in the config unchanged

- **Given** options `{ tags: ["restaurant"] }` **When** `filterPois` is called **Then** it returns only POIs whose `tags` array contains `"restaurant"` (at least one matching tag)

- **Given** options `{ tags: ["restaurant", "wc"] }` **When** `filterPois` is called **Then** it returns POIs that have at least one of those tags (OR semantics)

- **Given** options `{ maxDistanceMeters: 50, origin: { x: 100, y: 100 } }` **When** `filterPois` is called **Then** it returns only POIs whose `pixelsToMeters(pixelDistance(poi.position, origin), scale)` is ≤ 50

- **Given** options `{ tags: ["restaurant"], maxDistanceMeters: 100, origin: pos }` **When** `filterPois` is called **Then** it returns POIs that satisfy BOTH the tag AND distance predicates

- **Given** options `{ maxDistanceMeters: 50 }` with no `origin` **When** `filterPois` is called **Then** it throws with `code: ErrorCode.INVALID_POSITION`

---

#### Story 3.5: End-to-End Pipeline Integration Test

**As a** developer,
**I want** an automated test that exercises the full builder-to-viewer pipeline end-to-end,
**So that** I can confirm a `.gwmap` file authored via builder-core is correctly parsed and processed by view-core, validating the SPEC success signal before any adapter is involved.

**Acceptance Criteria:**

- **Given** a `MapConfig` created via `createMapConfig`, `addPoi`, `addNode`, and `addEdge` from builder-core **When** I call `serializeGwmap(config)` to produce a JSON string **And** then call `parseGwmap(jsonString)` from view-core **Then** the parsed result deep-equals the original config (round-trip integrity)

- **Given** a parsed `MapConfig` with at least 2 POIs each connected to graph nodes **When** I call `computeRoute(config, poiA.id, poiB.id)` from view-core **Then** it returns a `Route` with a non-empty `nodes` array, a positive `distanceMeters`, and a positive `walkTimeSeconds`

- **Given** a parsed `MapConfig` with POIs of mixed tags **When** I call `filterPois(config, { tags: [oneTag] })` **Then** it returns only POIs carrying that tag **And** `filterPois(config, {})` returns all POIs

- **Given** the test file **When** I inspect its imports **Then** it imports only from `@resort-map/builder-core` and `@resort-map/view-core` — no adapter packages involved

> This story implements the SPEC "Success signal" at the library level. Adapter-level visual validation (view-react and view-react-native rendering) is covered by Stories 4.1–4.5 and 5.1–5.5.

---

#### Story 3.4: view-core — viewerReducer & ViewerState

**As a** viewer adapter (view-react or view-react-native),
**I want** `viewerReducer(state, action)` exported as a pure function from `view-core/src/viewerState.ts`,
**So that** both adapters can call `useReducer(viewerReducer, initialState)` and share identical state transition logic.

**Acceptance Criteria:**

- **Given** `viewerReducer` is exported from `view-core/src/viewerState.ts` **When** I import it **Then** its signature is `(state: ViewerState, action: ViewerAction) => ViewerState`

- **Given** `initialViewerState` exported from the same file **When** I inspect it **Then** `status` is `"idle"`, `mapConfig` is `null`, `route` is `null`, `filteredPois` is `[]`, `selectedPoiId` is `null`, `imageSize` is `null`, `filterOptions` is `{}`

- **Given** action `{ type: "MAP_LOADED", payload: MapConfig }` **When** passed to `viewerReducer` **Then** `state.mapConfig` is set to the payload, `status` becomes `"ready"`, and `filteredPois` is set to all POIs from the config

- **Given** action `{ type: "SELECT_POI", payload: poiId }` **When** passed to `viewerReducer` **Then** `state.selectedPoiId` is updated to the id

- **Given** action `{ type: "SET_ROUTE", payload: Route | null }` **When** passed to `viewerReducer` **Then** `state.route` is updated

- **Given** action `{ type: "SET_FILTER", payload: PoiFilterOptions }` and a loaded `mapConfig` **When** passed to `viewerReducer` **Then** `state.filterOptions` is updated **And** `state.filteredPois` is re-computed by calling `filterPois(mapConfig, newOptions)`

- **Given** action `{ type: "IMAGE_LOADED", payload: { width: number, height: number } }` **When** passed to `viewerReducer` **Then** `state.imageSize` is set to the payload

- **Given** action `{ type: "SET_ERROR", payload: string }` **When** passed to `viewerReducer` **Then** `state.status` becomes `"error"` **And** `state.error` is set to the payload string

---

### Epic 4: Web Map Viewer (view-react)

#### Story 4.1: view-react — MapViewer Shell & Source Parsing

**As a** React ≥18 developer,
**I want** to mount `<MapViewer source={...} />` with a `.gwmap` JSON string or a pre-parsed `MapConfig` and have the component parse, validate, and hold the map data in a reducer,
**So that** the viewer self-manages its own state without requiring the host app to call view-core directly.

**Acceptance Criteria:**

- **Given** `<MapViewer source={rawGwmapJsonString} />` **When** the component mounts **Then** it calls `parseGwmap(source)` from view-core, dispatches `MAP_LOADED`, and `state.status` becomes `"ready"`

- **Given** `<MapViewer source={alreadyParsedMapConfig} />` **When** the component mounts **Then** it dispatches `MAP_LOADED` directly without re-parsing

- **Given** `source` is an invalid JSON string **When** the component mounts **Then** `SET_ERROR` is dispatched with the error message **And** an error message is rendered to the user

- **Given** `state.status` is `"ready"` **When** the component renders **Then** it renders `<MapCanvas>` passing `mapConfig` and `imageSize`

- **Given** view-react source files **When** I grep for `import.*view-core` **Then** only wrapper imports (`viewerReducer`, `parseGwmap`, `computeRoute`, `filterPois`, etc.) are found — no logic is duplicated

---

#### Story 4.2: view-react — MapCanvas: Pan & Zoom

**As a** map viewer user,
**I want** to pan the map by dragging and zoom by scrolling (mouse wheel or pinch trackpad),
**So that** I can explore the full map and inspect areas in detail.

**Acceptance Criteria:**

- **Given** the map is loaded and `status` is `"ready"` **When** the MapCanvas renders **Then** a CSS-transformed `<div>` wraps both the background `<img>` and an SVG overlay as siblings (ARCH-3 web pattern)

- **Given** I click and drag on the canvas **When** pointer events fire **Then** the transform `div` translates in real time with the drag delta **And** releasing the pointer commits the new pan offset

- **Given** I scroll with the mouse wheel over the canvas **When** the wheel event fires **Then** the transform `div` scales around the cursor position **And** zoom level stays within sensible bounds (e.g. 0.5× – 5×)

- **Given** the background image loads successfully **When** `onLoad` fires **Then** action `IMAGE_LOADED` is dispatched with the image's `naturalWidth` and `naturalHeight` **And** the SVG overlay's `viewBox` is set to `"0 0 {naturalWidth} {naturalHeight}"`

---

#### Story 4.3: view-react — POI Pins & Selection

**As a** map viewer user,
**I want** to see all POI pins on the map and tap one to select it and see its label,
**So that** I can identify points of interest and trigger routing from them.

**Acceptance Criteria:**

- **Given** `state.filteredPois` is non-empty **When** the SVG overlay renders **Then** each POI in `filteredPois` has a pin rendered at its `position` pixel coordinates inside the SVG

- **Given** I click a POI pin **When** the click event fires **Then** `SELECT_POI` is dispatched with that POI's id **And** the pin is highlighted to indicate selection

- **Given** a POI is selected **When** a second POI is selected **Then** `computeRoute` is called internally with both POI ids **And** `SET_ROUTE` is dispatched with the result — this always happens regardless of whether `onRouteRequest` is provided

- **Given** a POI is selected, `onRouteRequest` prop is provided, and a second POI is selected **When** the internal route is computed **Then** `onRouteRequest(firstPoiId, secondPoiId)` is additionally called as an observation hook, allowing the host app to respond to route events without preventing the component's internal state update

- **Given** the map is filtered (some POIs hidden) **When** a POI not in `filteredPois` is hidden **Then** its pin is not rendered in the SVG overlay

---

#### Story 4.4: view-react — Route Path Display

**As a** map viewer user,
**I want** to see a highlighted path drawn on the map between two selected POIs with the walk time shown,
**So that** I know which path to follow and how long it will take.

**Acceptance Criteria:**

- **Given** `state.route` is non-null **When** the SVG overlay renders **Then** a polyline connects the route's nodes in order at their pixel coordinates **And** the polyline has a visually distinct style (e.g., contrasting color, stroke-width)

- **Given** `state.route` has a `walkTimeSeconds` value **When** the component renders **Then** a walk time label is displayed (e.g., "~3 min")

- **Given** `state.route` is null **When** the SVG overlay renders **Then** no route polyline is rendered

- **Given** the route is for a path crossing multiple graph nodes **When** rendered **Then** the polyline passes through each node position in the correct order

> **Deferred (post-v1):** Animated route display (e.g., animated dash or progress dot) is out of scope for v1. A static highlighted polyline is sufficient.

---

#### Story 4.5: view-react — FilterPanel: Tag & Distance Filtering

**As a** map viewer user,
**I want** to filter visible POIs by category tags and/or maximum walking distance,
**So that** I can quickly find the specific type of facility I need.

**Acceptance Criteria:**

- **Given** the map is loaded **When** the FilterPanel renders **Then** it shows one chip/button per unique tag found across all POIs in `mapConfig`

- **Given** I click a tag chip **When** the chip toggles **Then** `SET_FILTER` is dispatched with the updated `tags` array **And** `filteredPois` in the reducer updates accordingly

- **Given** I set a maximum distance value via a slider or input **When** the value changes **Then** `SET_FILTER` is dispatched with `maxDistanceMeters` and a required `origin` position **And** only POIs within that distance render as pins

- **Given** all filters are cleared **When** `filterOptions` is `{}` **Then** all POIs are shown (full list)

- **Given** `onFilterChange` prop is provided **When** any filter changes **Then** `onFilterChange(filterOptions)` is called with the current options

---

### Epic 5: Mobile Map Viewer (view-react-native)

#### Story 5.1: view-react-native — MapViewer Shell & Source Parsing

**As an** Expo developer,
**I want** to mount `<MapViewer source={...} />` in my Expo app and have it parse a `.gwmap` string or accept a pre-parsed config,
**So that** the RN viewer self-manages its state using the same `viewerReducer` as the web viewer.

**Acceptance Criteria:**

- **Given** `<MapViewer source={rawGwmapJsonString} />` **When** the component mounts **Then** it calls `parseGwmap(source)` from view-core, dispatches `MAP_LOADED`, and `state.status` becomes `"ready"`

- **Given** `<MapViewer source={alreadyParsedMapConfig} />` **When** the component mounts **Then** it dispatches `MAP_LOADED` directly

- **Given** `source` is invalid **When** the component mounts **Then** `SET_ERROR` is dispatched and a `<Text>` error message is rendered

- **Given** the component tree **When** `<MapViewer>` renders **Then** `GestureHandlerRootView` wraps the entire component tree (ARCH-13)

- **Given** view-react-native source files **When** I grep for `import.*view-core` **Then** only wrapper imports (`viewerReducer`, `parseGwmap`, `computeRoute`, `filterPois`) are present — no routing or filtering logic is duplicated

- **Given** view-react-native `package.json` **When** I inspect it **Then** `react-native-svg`, `react-native-gesture-handler`, and `react-native-reanimated` are listed as peer dependencies with no `"main"` / `"bun build"` step (ships TS source for Metro)

> **Deferred (post-v1):** Offline support (bundling the `.gwmap` file as an Expo asset) is not required for v1. The component accepts a pre-parsed `MapConfig` or a raw JSON string; loading from device storage via `expo-file-system` is a host-app concern. Revisit if venue operators need offline-first deployments.

---

#### Story 5.2: view-react-native — MapCanvas: Pan & Pinch-to-Zoom

**As a** mobile map viewer user,
**I want** to pan by dragging one finger and zoom by pinching,
**So that** I can explore the full map on a phone screen with natural mobile gestures.

**Acceptance Criteria:**

- **Given** the map is loaded **When** MapCanvas renders **Then** a single `Animated.View` (Reanimated v2) wraps both the `<Image>` background and `<Svg>` overlay as siblings (ARCH-3 RN pattern)

- **Given** I drag one finger across the screen **When** the pan gesture fires **Then** the `Animated.View` translates using `useAnimatedStyle` + `useSharedValue` for `translateX`/`translateY`

- **Given** I pinch with two fingers **When** the pinch gesture fires **Then** the `Animated.View` scales using `useAnimatedStyle` + `useSharedValue` for `scale` **And** zoom is bounded to a sensible range (e.g. 0.5× – 5×)

- **Given** the `<Image>` loads **When** `onLoadEnd` fires **Then** `IMAGE_LOADED` is dispatched with the image dimensions **And** the `<Svg>` overlay's `viewBox` is set to `"0 0 {width} {height}"`

- **Given** the canvas **When** inspected **Then** all gesture handling is done via `react-native-gesture-handler` primitives **And** all animation uses Reanimated v2 (`useSharedValue`, `useAnimatedStyle`) — no `Animated` from core RN (ARCH-13)

---

#### Story 5.3: view-react-native — POI Pins & Selection

**As a** mobile map viewer user,
**I want** to see all POI pins rendered via `react-native-svg` and tap one to select it,
**So that** I can identify facilities and initiate routing from them on a mobile device.

**Acceptance Criteria:**

- **Given** `state.filteredPois` is non-empty **When** the `<Svg>` overlay renders **Then** each POI in `filteredPois` has a pin (SVG `<Circle>` or `<Path>`) at its pixel coordinates inside the `<Svg>` (using `react-native-svg`)

- **Given** I tap a POI pin **When** the tap gesture fires **Then** `SELECT_POI` is dispatched with that POI's id **And** the pin is visually highlighted

- **Given** a POI is selected and a second POI is tapped **When** the tap fires **Then** `computeRoute` is called with the two POI ids **And** `SET_ROUTE` is dispatched — this always happens regardless of whether `onRouteRequest` is provided

- **Given** `onRouteRequest` prop is provided and a second POI is tapped **When** the internal route is computed **Then** `onRouteRequest(firstPoiId, secondPoiId)` is additionally called as an observation hook (same semantics as view-react Story 4.3)

- **Given** POIs are filtered **When** a POI is not in `filteredPois` **Then** its pin is not rendered in the `<Svg>` overlay

---

#### Story 5.4: view-react-native — Route Path Display

**As a** mobile map viewer user,
**I want** to see a route path drawn on the map overlay with a walk time label,
**So that** I can follow the walking route visually on my phone.

**Acceptance Criteria:**

- **Given** `state.route` is non-null **When** the `<Svg>` overlay renders **Then** a `<Polyline>` from `react-native-svg` connects the route nodes in order at their pixel coordinates **And** the polyline has a visually distinct stroke color and width

- **Given** `state.route.walkTimeSeconds` is set **When** the component renders **Then** a `<Text>` element displays the walk time in a human-readable format (e.g., "~3 min")

- **Given** `state.route` is null **When** the overlay renders **Then** no `<Polyline>` is rendered

> **Deferred (post-v1):** Animated route display is out of scope for v1 (same as view-react Story 4.4).

---

#### Story 5.5: view-react-native — FilterPanel: Tag & Distance Filtering

**As a** mobile map viewer user,
**I want** to filter POIs by tag category using touch-friendly buttons,
**So that** I can find a specific type of facility quickly on my phone.

**Acceptance Criteria:**

- **Given** the map is loaded **When** the FilterPanel renders **Then** it shows one `<TouchableOpacity>` chip per unique tag across all POIs

- **Given** I tap a tag chip **When** the tap fires **Then** `SET_FILTER` is dispatched with the updated `tags` array **And** `filteredPois` updates and visible pins change accordingly

- **Given** I interact with a distance filter control **When** the value changes **Then** `SET_FILTER` is dispatched with `maxDistanceMeters` and `origin` **And** only near POIs remain visible

- **Given** all filters are cleared **When** `filterOptions` is `{}` **Then** all POIs are shown

- **Given** `onFilterChange` prop is provided **When** any filter changes **Then** `onFilterChange(filterOptions)` is called

# Package Architecture

Companion to `SPEC.md` (CAP-2, CAP-6, CAP-7, CAP-8). Defines the monorepo package layout, the core/adapter split, and the public API contracts each package must expose.

## Monorepo layout

```
resortMap/                        ← Bun workspace root
  package.json                    ← workspace declaration
  tsconfig.base.json              ← shared TS config
  packages/
    builder-core/                 ← framework-agnostic authoring logic
    builder-react/                ← React authoring UI (standalone app)
    view-core/                    ← framework-agnostic rendering + routing logic
    view-react/                   ← React ≥18 viewer component
    view-react-native/            ← React Native viewer component
```

## Dependency graph

```
builder-react  →  builder-core
view-react     →  view-core
view-react-native → view-core
```

No cross-domain dependencies: builder packages must not import view packages and vice versa.

---

## builder-core

**Role:** Owns the `.gwmap` data model, serialization/deserialization, and authoring operations (add POI, add node, add edge, set map metadata).

**Public API contract:**

```ts
// Types
export type Position = { x: number; y: number };
export type Tag = string;

export interface POI {
  id: string;
  label: string;
  position: Position;
  tags: Tag[];
  icon?: string;
  nodeId?: string;
  meta?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  position: Position;
}

export interface GraphEdge {
  from: string;
  to: string;
  oneway?: boolean;
}

export interface MapMeta {
  backgroundImageUrl: string;
  center: Position;
  scale: number;          // meters per pixel
}

export interface MapConfig {
  version: string;
  map: MapMeta;
  pois: POI[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
}

// Operations
export function createMapConfig(meta: MapMeta): MapConfig;
export function addPoi(config: MapConfig, poi: Omit<POI, 'id'>): MapConfig;
export function removePoi(config: MapConfig, id: string): MapConfig;
export function updatePoi(config: MapConfig, id: string, patch: Partial<POI>): MapConfig;
export function addNode(config: MapConfig, node: Omit<GraphNode, 'id'>): MapConfig;
export function addEdge(config: MapConfig, edge: GraphEdge): MapConfig;
export function removeNode(config: MapConfig, id: string): MapConfig;  // also removes connected edges

// Serialization
export function serializeGwmap(config: MapConfig): string;     // → JSON string
export function parseGwmap(raw: string): MapConfig;            // throws on invalid schema
export function validateGwmap(config: unknown): MapConfig;     // throws descriptive error on violation
```

All mutating operations return a new `MapConfig` (immutable update pattern). No side effects.

---

## builder-react

**Role:** Standalone React ≥18 application that provides the authoring UI. Wraps builder-core; contains no authoring logic of its own.

**Responsibilities:**
- Canvas rendering of the background image with draggable POI pins and road nodes
- Sidebar/panel for POI property editing (label, tags, icon URL)
- Road drawing mode: click to add nodes, click existing node to create edge
- Map metadata panel (image URL input, center picker, scale input)
- Export button: calls `serializeGwmap()` and triggers browser file download

**Not responsible for:** Any routing or filtering logic (that lives in view-core).

---

## view-core

**Role:** Framework-agnostic library. Parses `.gwmap` files, exposes map data, computes routes, and filters POIs. Contains no rendering code.

**Public API contract:**

```ts
// Re-exports types from builder-core (or a shared @resort-map/types package)
export type { MapConfig, POI, GraphNode, GraphEdge, MapMeta, Position, Tag } from 'builder-core';

// Parsing (delegates to builder-core)
export { parseGwmap, validateGwmap } from 'builder-core';

// Route result
export interface Route {
  nodes: GraphNode[];          // ordered list of waypoints
  distanceMeters: number;
  walkTimeSeconds: number;
}

// Routing
export function computeRoute(
  config: MapConfig,
  from: Position | string,    // Position or POI id
  to: Position | string
): Route | null;              // null if no path exists

// Filtering
export interface PoiFilterOptions {
  tags?: Tag[];               // POI must have at least one matching tag
  maxDistanceMeters?: number; // from `origin`
  origin?: Position;          // required when maxDistanceMeters is set
}

export function filterPois(config: MapConfig, options: PoiFilterOptions): POI[];

// Utilities
export function estimateWalkTime(distanceMeters: number): number;  // → seconds
export function pixelDistance(a: Position, b: Position): number;
export function pixelsToMeters(pixels: number, scale: number): number;
```

**Routing algorithm:** Dijkstra over the graph. When a `Position` (not a POI id) is supplied, snap to the nearest graph node before pathfinding. POIs with a `nodeId` use that node directly; POIs without one snap to the nearest node.

---

## view-react

**Role:** React ≥18 component library. Wraps view-core; contains no routing or filtering logic.

**Public API contract:**

```tsx
export interface MapViewerProps {
  source: MapConfig | string;   // parsed config or raw .gwmap JSON string
  onRouteRequest?: (from: Position | string, to: Position | string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
  style?: React.CSSProperties;
}

export function MapViewer(props: MapViewerProps): React.ReactElement;
```

The component internally calls view-core for routing and filtering in response to user interactions. The host app may optionally intercept those events via callbacks.

---

## view-react-native

**Role:** React Native component targeting Expo (iOS and Android). Same responsibilities as view-react but uses Expo-compatible primitives only.

**Expo dependency constraints:**
- `react-native-svg` — SVG rendering of POI pins and route paths (installed via `expo install`)
- `react-native-gesture-handler` — pan and pinch-to-zoom gestures (Expo-compatible)
- `react-native-reanimated` — smooth zoom/pan animation (Expo-compatible)
- `expo-file-system` — optional, for loading `.gwmap` from device storage
- No bare native modules; must work in Expo managed workflow

**Public API contract:**

```tsx
export interface MapViewerProps {
  source: MapConfig | string;
  onRouteRequest?: (from: Position | string, to: Position | string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
  style?: StyleProp<ViewStyle>;
}

export function MapViewer(props: MapViewerProps): React.ReactElement;
```

Shares the same prop shape as view-react to minimize integration divergence. Rendering uses `react-native-svg` `<Svg>` overlay on top of `<Image>` for POI pins and route paths, with gesture-handler for pan/zoom.

---

## Shared types strategy

Two acceptable options (to be decided in architecture phase):
1. **Shared package** `packages/types` — both builder-core and view-core import types from there. Cleanest dependency graph.
2. **view-core re-exports builder-core types** — simpler, one fewer package, but creates a build-time dependency from viewer on builder.

Open question from SPEC.md applies here: if POIs and graph nodes share an ID namespace, the type definitions collapse slightly.

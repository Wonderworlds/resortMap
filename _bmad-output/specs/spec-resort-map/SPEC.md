---
id: SPEC-resort-map
companions:
  - gwmap-schema.md
  - package-architecture.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# ResortMap — Custom Image Map Builder & Viewer

## Why

Venue operators (hotels, theme parks, campuses, convention halls) need a way to let visitors navigate complex physical spaces using a custom indoor/outdoor map. No off-the-shelf tool covers the full workflow: authoring an image-based map with points of interest and a walking-route graph, then consuming that same map artifact in both a React web app and a React Native mobile app. This project realizes that end-to-end toolchain as an open, file-centric monorepo — the `.gwmap` file is the portable contract between builder and viewer, decoupling authoring from rendering.

## Capabilities

- id: CAP-1
  intent: An author can produce a valid `.gwmap` file that encodes a background image URL, map metadata (center, scale), points of interest, and a road graph.
  success: A `.gwmap` file written by builder-core passes schema validation and round-trips (serialize → parse) with zero data loss.

- id: CAP-2
  intent: An author using builder-react can visually place POIs and road nodes on a background image and configure their properties, then export the result as a `.gwmap` file.
  success: A non-technical user can open builder-react, load a background image by URL, place at least one POI with a tag and icon, draw at least one road segment, set the map center and scale, and download a valid `.gwmap` file — all without editing JSON by hand.

- id: CAP-3
  intent: view-core can parse a `.gwmap` file and expose the map data (background image URL, POIs, road graph) to a rendering adapter.
  success: Parsing a well-formed `.gwmap` file returns a typed `MapConfig` object; parsing a malformed file throws a descriptive error.

- id: CAP-4
  intent: view-core can compute a walking itinerary and estimated walk time between any two points on the map (POI, user position, or custom tap position).
  success: Given two valid positions, `computeRoute()` returns an ordered list of graph nodes and a walk-time in seconds; repeated calls with the same inputs return identical results.

- id: CAP-5
  intent: view-core can filter the POI list by one or more tags, by maximum distance from a given position, or by both combined.
  success: `filterPois()` returns only POIs satisfying all supplied predicates; an empty predicate set returns the full list.

- id: CAP-6
  intent: view-react exposes the map viewer as a React ≥18 component that accepts a `.gwmap` file path or parsed config and renders the interactive map with routing and filtering.
  success: Mounting `<MapViewer>` in a React 18+ app displays the background image, all POIs, and responds to route-request and filter events without requiring the host app to import view-core directly.

- id: CAP-7
  intent: view-react-native exposes the same viewer capabilities as a React Native component usable in iOS and Android mobile apps.
  success: The RN component renders the map, POIs, and a computed route on a real device (or emulator) from the same `.gwmap` file used by view-react, with no platform-specific schema changes.

- id: CAP-8
  intent: builder-core and view-core are framework-agnostic TypeScript packages with no React or React Native imports.
  success: Both packages compile and their full test suites pass in a plain Node 18 environment with no React peer dependency installed.

## Constraints

- TypeScript source; all packages must compile and their tests must pass under Node 18.
- Bun workspace monorepo; `bun install`, `bun test`, and `bun build` are the only build/test entry points.
- The `.gwmap` format is JSON with a `.gwmap` file extension; the schema is defined in `gwmap-schema.md` and is the single source of truth for all packages.
- builder-core and view-core must contain zero React/React Native imports; all framework coupling lives in the adapter packages.
- Adapter packages (builder-react, view-react, view-react-native) must delegate all business logic to their respective core package — no duplicated routing, filtering, or serialization logic in adapters.
- Walk is the only supported transportation mode; the routing graph carries no vehicle or cycling attributes.
- The background map image is referenced by URL in the `.gwmap` file; it is not embedded or base64-encoded.
- React adapter targets React ≥18; React Native adapter targets the current stable RN release at build time.
- view-react-native must be compatible with **Expo** (managed or bare workflow); all native dependencies must be available via `expo install` and must not require custom native modules outside the Expo SDK.
- All gesture and animation libraries used in view-react-native must be Expo-compatible (e.g., `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg` via Expo).

## Non-goals

- Geographic projection or real-world coordinate systems (lat/lon, WGS-84, Mercator) — positions are pixel coordinates on the background image.
- GPS-based real-time user location tracking (the viewer accepts a position value; how that value is obtained is the host app's responsibility).
- Transportation modes other than walking (driving, cycling, wheelchair routing).
- Multi-user simultaneous collaborative editing of a `.gwmap` file.
- Export of `.gwmap` data to standard geospatial formats (GeoJSON, KML, Shapefile).
- Server-side rendering of map tiles or dynamic map generation.
- Embedded binary assets inside the `.gwmap` file (images, icons) — all external assets are URL-referenced.

## Success signal

A `.gwmap` file authored entirely through builder-react loads in view-react and view-react-native without modification: both display the background image and all POIs, compute a valid walk-time itinerary between two selected points, and correctly filter POIs by tag — confirming the full builder-to-viewer pipeline works across both rendering targets from a single shared file format.

## Assumptions

- Walk-time uses a fixed average pedestrian speed of 1.4 m/s; no per-segment speed override is needed at this stage.
- The `scale` field in the `.gwmap` file is expressed as **meters per pixel**, which is multiplied by the Euclidean pixel distance to derive real-world distance for walk-time calculation.
- POIs that serve as routing waypoints are connected to the road graph by referencing a graph node ID; POIs not connected to any node are reachable by snapping to the nearest node at query time.
- The builder-react package is a **standalone React app** (not a library), used as a desktop authoring tool run locally or deployed as a hosted page.
- Pixel coordinate origin (0, 0) is the **top-left corner** of the background image, with x increasing rightward and y increasing downward.
- The default tag vocabulary (restaurants, wc) is a convention enforced by the builder UI — the schema permits any string tag, keeping the format open for custom venue categories.
- The road graph is **undirected by default** (all edges are bidirectional); a per-edge `oneway` flag overrides this for one-way paths.

## Open Questions

- ~~Should POI nodes and road graph nodes share the same ID namespace?~~ **Resolved:** POIs and graph nodes are separate entities. A POI connects to a node via `poi.nodeId`; they have independent ID namespaces. Routing always snaps to the nearest graph node if `nodeId` is absent.
- Is offline support required for view-react-native — specifically, must the `.gwmap` file be bundleable into the app binary (as an Expo asset), or is fetching it from a URL at runtime acceptable?
- Should the viewer animate the route path (e.g., animated dash or progress dot), or is a static highlighted path sufficient for v1?
- Is there a maximum expected number of POIs or graph nodes that should inform the routing algorithm choice (Dijkstra vs A*)? (Affects view-core's routing implementation.)
- Should builder-react support undo/redo for placement operations, or is a simpler "delete last placed item" sufficient for v1?

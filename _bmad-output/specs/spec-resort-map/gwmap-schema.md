# .gwmap File Schema

Companion to `SPEC.md` (CAP-1, CAP-3). Defines the canonical JSON structure of all `.gwmap` files. All packages that read or write `.gwmap` files derive their types from this document.

## Top-level structure

```json
{
  "version": "1.0",
  "map": { ... },
  "pois": [ ... ],
  "graph": { ... }
}
```

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `version` | string | yes      | Schema version. Current: `"1.0"`. Parsers must reject unknown versions. |
| `map`     | object | yes      | Map metadata. |
| `pois`    | array  | yes      | List of points of interest. May be empty. |
| `graph`   | object | yes      | Road/path graph used for routing. May have empty `nodes` and `edges`. |

---

## `map` object

```json
{
  "backgroundImageUrl": "https://example.com/floorplan.png",
  "center": { "x": 512, "y": 384 },
  "scale": 0.05
}
```

| Field                | Type   | Required | Description |
|----------------------|--------|----------|-------------|
| `backgroundImageUrl` | string | yes      | Absolute URL of the background image. |
| `center`             | object | yes      | Pixel coordinate designating the map's reference center. `x` and `y` are non-negative integers. |
| `scale`              | number | yes      | Meters per pixel. Used to convert pixel distances to real-world distances for walk-time calculation. Must be > 0. |

---

## `pois` array — POI object

```json
{
  "id": "poi-001",
  "label": "Main Restaurant",
  "position": { "x": 320, "y": 210 },
  "tags": ["restaurant"],
  "icon": "https://example.com/icons/restaurant.svg",
  "nodeId": "node-045",
  "meta": {}
}
```

| Field      | Type            | Required | Description |
|------------|-----------------|----------|-------------|
| `id`       | string          | yes      | Unique identifier within the file. Stable across edits. |
| `label`    | string          | yes      | Human-readable display name. |
| `position` | object          | yes      | Pixel coordinate `{x, y}` on the background image. Origin is top-left. |
| `tags`     | string[]        | yes      | One or more category tags. Default vocabulary: `"restaurant"`, `"wc"`. Custom strings are allowed. |
| `icon`     | string          | no       | URL or named identifier for the POI icon. If absent, renderer uses a default pin. |
| `nodeId`   | string          | no       | ID of the graph node this POI connects to for routing. If absent, routing snaps to the nearest graph node. |
| `meta`     | object          | no       | Arbitrary key-value pairs for venue-specific data. Parsers must preserve this field without interpreting it. |

---

## `graph` object

```json
{
  "nodes": [
    { "id": "node-001", "position": { "x": 100, "y": 200 } },
    { "id": "node-002", "position": { "x": 180, "y": 200 } }
  ],
  "edges": [
    { "from": "node-001", "to": "node-002", "oneway": false }
  ]
}
```

### `nodes` array — node object

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `id`       | string | yes      | Unique identifier within the graph. Referenced by POI `nodeId` and edge `from`/`to`. |
| `position` | object | yes      | Pixel coordinate `{x, y}` of the waypoint on the background image. |

### `edges` array — edge object

| Field    | Type    | Required | Description |
|----------|---------|----------|-------------|
| `from`   | string  | yes      | ID of the source node. |
| `to`     | string  | yes      | ID of the destination node. |
| `oneway` | boolean | no       | If `true`, edge is directional (from → to only). Default: `false` (bidirectional). |

---

## Walk-time computation

Walk time in seconds between two pixel positions A and B via a route through graph nodes:

```
pixel_distance = sum of Euclidean distances between consecutive nodes on route
real_distance_m = pixel_distance × map.scale
walk_time_s = real_distance_m / 1.4   (1.4 m/s average pedestrian speed)
```

---

## Validation rules

1. `version` must equal `"1.0"` (parsers reject other values).
2. All `id` values within `pois` must be unique; all `id` values within `graph.nodes` must be unique. The two namespaces are independent.
3. Every `edge.from` and `edge.to` must reference an existing `graph.node.id`.
4. Every `poi.nodeId`, if present, must reference an existing `graph.node.id`.
5. `map.scale` must be a positive number.
6. `position.x` and `position.y` must be non-negative numbers.

---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 2.4: builder-react — Road Drawing: Node & Edge Placement

Status: review

## Story

As a map author,
I want to place road nodes and draw edges between them on the canvas,
So that view-core can compute walking itinerary routes over the road graph I define.

## Acceptance Criteria

1. **Given** `activeTool` is `"placeNode"` **When** I click the canvas **Then** `addNode` is called with the click position **And** a road node marker (visually distinct from POI pins) appears on the canvas with a `data-node-id` attribute (ARCH-12) **And** the new node's id becomes `selectedItemId`

2. **Given** `activeTool` is `"drawEdge"` and I click a graph node (first click) **When** the node's `data-node-id` is read **Then** that node becomes the edge-start candidate with a visual indicator (e.g., highlighted ring)

3. **Given** an edge-start candidate exists **When** I click a second graph node **Then** `addEdge` is called with `{ from: startId, to: endId }` **And** a line connecting the two nodes renders on the canvas **And** the edge-start candidate is cleared

4. **Given** `activeTool` is `"select"` and a node is selected **When** I press the Delete key **Then** `removeNode` is called, removing the node and all its connected edges from the canvas

5. **Given** `activeTool` is `"select"` and I click an edge line (`<line>` element carrying `data-edge-from` and `data-edge-to` attributes) **When** the `onPointerDown` fires **Then** `selectedItemId` is set to a synthetic edge key `"{from}:{to}"` **And** the edge is visually highlighted

6. **Given** an edge is selected (via `selectedItemId` of the form `"{from}:{to}"`) **When** I press the Delete key **Then** `removeEdge` is called with the `from` and `to` node ids **And** the edge line is removed from the canvas **And** both connected nodes remain **And** `selectedItemId` is cleared to `null`

7. **Given** a canvas with both POI pins and road nodes **When** rendered **Then** the two element types are visually distinct in shape or color **And** both carry the correct `data-poi-id` or `data-node-id` attributes

## Tasks / Subtasks

- [x] Fix `removeNode` store action — clear `selectedItemId` when a selected edge involves the deleted node (code review finding #1)
  - [x] Update `removeNode` in `packages/builder-react/src/store/mapStore.ts`: parse `selectedItemId` as potential edge key `"{from}:{to}"` and clear when `from === nodeId || to === nodeId`
  - [x] Add test in `packages/builder-react/src/__tests__/mapStore.test.ts`: `removeNode` clears selectedItemId when an incident edge is selected (`"from:to"` format)
  - [x] Add test: clears when removed node is the `to` end of selected edge
- [x] Update `packages/builder-react/src/components/MapCanvas.tsx` — add node/edge placement, rendering, and interactions (AC: 1–7)
  - [x] Add local state: `edgeStartId: string | null` for drawEdge two-click sequence (AC: 2, 3)
  - [x] Add store bindings: `addNode`, `removeNode`, `addEdge`, `removeEdge`
  - [x] Update `onSvgPointerDown`: handle `placeNode` tool → `addNode`, read new node id from store, `setSelectedItemId` (AC: 1)
  - [x] Update `onKeyDown` in `useEffect`: handle node Delete (AC: 4), edge Delete (AC: 6), Escape to cancel `edgeStartId`
  - [x] Add `onNodePointerDown(e, nodeId)`: `select` → select node; `drawEdge` → set edge-start or complete edge (AC: 2, 3)
  - [x] Add `onEdgePointerDown(e, from, to)`: `select` → `setSelectedItemId("{from}:{to}")` (AC: 5)
  - [x] Update cursor logic: `crosshair` for `placeNode`, `copy` for `drawEdge` (no start), `crosshair` for `drawEdge` (start selected) (UX: tool feedback)
  - [x] Add `RoadEdge` private sub-component: `<g data-edge-from={…} data-edge-to={…}>` with visible `<line>` (data attrs on `<line>` per AC5) and transparent 20-wide hit area (AC: 5, 6)
  - [x] Add `RoadNode` private sub-component: `<g data-node-id={…}>` with a 12×12 gray `<rect>` (visually distinct from POI circles), orange when selected, yellow ring when edge-start candidate (AC: 1, 2, 7)
  - [x] Update SVG render order: edges (`<RoadEdge>`) first, then nodes (`<RoadNode>`), then POI pins (`<PoiPin>`) — ensures nodes/pins are on top and clickable (AC: 7)
  - [x] Add `nodeById(id)` inline helper for edge rendering (looks up node position from `mapConfig.graph.nodes`)
- [x] Run `bun test` from workspace root — all tests pass, no regressions

## Dev Notes

### What MapCanvas.tsx Currently Does (Story 2.3 State)

Current `MapCanvas.tsx` handles:
- Image loading via `new Image()` → `imageSize` state
- `placePoi` tool: `onSvgPointerDown` places a POI and selects it
- POI drag: pointer capture on pin, `coreUpdatePoi` + `setState` on move, store `updatePoi` on up
- `select` on POI pin: `onPinPointerDown` → `setSelectedItemId`
- Delete key: removes selected POI only
- Renders: `<image>` background + `<PoiPin>` for each POI

Story 2.4 extends this by:
1. Adding node/edge rendering layers **below** POI pins
2. Adding `placeNode` to `onSvgPointerDown`
3. Adding `onNodePointerDown` and `onEdgePointerDown` handlers
4. Updating the Delete key `useEffect` to also handle node/edge deletion
5. Adding `edgeStartId` local state for the two-click edge-drawing sequence

**What must be preserved:**
- All existing POI placement, drag, selection, and Delete logic
- Image loading and `imageSize` state
- `coreUpdatePoi` + direct `setState` pattern for drag (no undo spam)
- `dragState` for POI drag + pointer capture

### Fix: `removeNode` Store Action Clears Stale Edge Selection (Code Review Finding #1)

**Problem:** The current store `removeNode` action checks `selectedItemId === nodeId` to clear selection. But if an edge "A:B" is selected (`selectedItemId = "A:B"`) and node "A" is removed, `coreRemoveNode` correctly deletes node A and all its edges from the graph — but `selectedItemId` stays `"A:B"`, a dangling ghost selection.

**Fix in `packages/builder-react/src/store/mapStore.ts`:**

Replace the existing `removeNode` action:

```ts
removeNode: (nodeId) =>
  set((state) => {
    if (!state.mapConfig) return {};
    const current = state.selectedItemId;
    let shouldClearSelection = current === nodeId;
    if (!shouldClearSelection && current !== null) {
      const colonIdx = current.indexOf(':');
      if (colonIdx !== -1) {
        const edgeFrom = current.slice(0, colonIdx);
        const edgeTo = current.slice(colonIdx + 1);
        shouldClearSelection = edgeFrom === nodeId || edgeTo === nodeId;
      }
    }
    return {
      mapConfig: coreRemoveNode(state.mapConfig, nodeId),
      undoStack: pushUndo(state.undoStack, state.mapConfig),
      selectedItemId: shouldClearSelection ? null : current,
    };
  }),
```

**Why colon-split is safe:** `crypto.randomUUID()` generates UUIDs in the form `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` — only hyphens, no colons. The edge key `"${from}:${to}"` therefore has exactly one colon, which is always the separator.

**Tests to add in `src/__tests__/mapStore.test.ts`:**

```ts
describe('removeNode — stale edge selection fix', () => {
  function setupTwoNodesAndEdge() {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    useMapStore.getState().addNode({ position: { x: 50, y: 50 } });
    const nodes = useMapStore.getState().mapConfig!.graph.nodes;
    const nodeA = nodes[0]!;
    const nodeB = nodes[1]!;
    useMapStore.getState().addEdge({ from: nodeA.id, to: nodeB.id });
    return { nodeA, nodeB };
  }

  test('clears selectedItemId when removed node is the "from" end of selected edge', () => {
    const { nodeA, nodeB } = setupTwoNodesAndEdge();
    const edgeKey = `${nodeA.id}:${nodeB.id}`;
    useMapStore.setState({ selectedItemId: edgeKey });
    useMapStore.getState().removeNode(nodeA.id);
    expect(useMapStore.getState().selectedItemId).toBeNull();
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(0);
  });

  test('clears selectedItemId when removed node is the "to" end of selected edge', () => {
    const { nodeA, nodeB } = setupTwoNodesAndEdge();
    const edgeKey = `${nodeA.id}:${nodeB.id}`;
    useMapStore.setState({ selectedItemId: edgeKey });
    useMapStore.getState().removeNode(nodeB.id);
    expect(useMapStore.getState().selectedItemId).toBeNull();
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(0);
  });

  test('preserves selectedItemId of an unrelated element when node is removed', () => {
    const { nodeA } = setupTwoNodesAndEdge();
    useMapStore.getState().addPoi({ label: 'X', position: { x: 5, y: 5 }, tags: [] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.setState({ selectedItemId: poiId });
    useMapStore.getState().removeNode(nodeA.id);
    expect(useMapStore.getState().selectedItemId).toBe(poiId);
  });
});
```

### `MapCanvas.tsx` — Edge-Start Two-Click Logic

The `drawEdge` tool uses two sequential node clicks to define `from` and `to`. This state is transient UI state (no undo needed) — it belongs in component state, NOT in Zustand:

```ts
const [edgeStartId, setEdgeStartId] = useState<string | null>(null);
```

**`onNodePointerDown` handler:**

```ts
function onNodePointerDown(e: React.PointerEvent<SVGGElement>, nodeId: string): void {
  e.stopPropagation(); // prevent onSvgPointerDown
  if (activeTool === 'select') {
    setSelectedItemId(nodeId);
  } else if (activeTool === 'drawEdge') {
    if (!edgeStartId) {
      setEdgeStartId(nodeId);
      setSelectedItemId(nodeId); // visual: select node as edge-start
    } else if (edgeStartId === nodeId) {
      // Clicking same node again cancels edge-start
      setEdgeStartId(null);
      setSelectedItemId(null);
    } else {
      addEdge({ from: edgeStartId, to: nodeId });
      setEdgeStartId(null);
      // Don't force select the edge; leave selectedItemId unchanged
    }
  }
}
```

**`onEdgePointerDown` handler:**

```ts
function onEdgePointerDown(e: React.PointerEvent<SVGGElement>, from: string, to: string): void {
  e.stopPropagation();
  if (activeTool === 'select') {
    setSelectedItemId(`${from}:${to}`);
  }
}
```

### Updated `onKeyDown` in `useEffect`

The Delete key handler must now handle nodes AND edges in addition to POIs:

```ts
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setEdgeStartId(null);
      return;
    }
    if (e.key !== 'Delete') return;
    if (!selectedItemId || !mapConfig) return;

    // POI deletion
    if (mapConfig.pois.some((p) => p.id === selectedItemId)) {
      removePoi(selectedItemId);
      return;
    }

    // Node deletion (also removes incident edges via coreRemoveNode)
    if (mapConfig.graph.nodes.some((n) => n.id === selectedItemId)) {
      removeNode(selectedItemId);
      return;
    }

    // Edge deletion — edge key format: "{from}:{to}", UUIDs contain no colons
    const colonIdx = selectedItemId.indexOf(':');
    if (colonIdx !== -1) {
      const from = selectedItemId.slice(0, colonIdx);
      const to = selectedItemId.slice(colonIdx + 1);
      if (mapConfig.graph.edges.some((edge) => edge.from === from && edge.to === to)) {
        removeEdge(from, to);
      }
    }
  }
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [selectedItemId, mapConfig, removePoi, removeNode, removeEdge]);
```

Note: `removeNode` (store action) already handles `selectedItemId` clearing (including the edge-key fix above). `removeEdge` (store action) already clears `selectedItemId` when it matches `"${from}:${to}"` (see mapStore.ts line 120–124).

### Updated `onSvgPointerDown` — Add `placeNode` Branch

```ts
function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>): void {
  if (!imageSize) return;
  const rect = getSvgRect();
  if (!rect) return;
  const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);

  if (activeTool === 'placePoi') {
    addPoi({ label: 'New POI', position: pos, tags: [] });
    const newPois = useMapStore.getState().mapConfig!.pois;
    const newId = newPois[newPois.length - 1]!.id;
    setSelectedItemId(newId);
  } else if (activeTool === 'placeNode') {
    addNode({ position: pos });
    const nodes = useMapStore.getState().mapConfig!.graph.nodes;
    const newId = nodes[nodes.length - 1]!.id;
    setSelectedItemId(newId);
  }
}
```

**Why `useMapStore.getState()` for reading new id:** Zustand `set()` is synchronous. Immediately after calling `addNode()`, `getState()` returns the updated state. The `!` on `nodes[nodes.length - 1]!.id` is required by `noUncheckedIndexedAccess` — safe here because `addNode` just appended an item.

### Cursor Logic Update

```ts
const cursor = (() => {
  if (activeTool === 'placePoi' || activeTool === 'placeNode') return 'crosshair';
  if (activeTool === 'drawEdge') return edgeStartId ? 'crosshair' : 'copy';
  return 'default';
})();
```

Pass to SVG: `style={{ ..., cursor }}`.

### `RoadNode` Sub-Component

Road nodes are **gray squares** (12×12 `<rect>`, `rx={2}`) to distinguish from POI **red circles**. Selected = orange. Edge-start candidate = yellow ring around the square.

```tsx
interface RoadNodeProps {
  node: GraphNode;
  isSelected: boolean;
  isEdgeStart: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function RoadNode({ node, isSelected, isEdgeStart, onPointerDown }: RoadNodeProps): JSX.Element {
  const { x, y } = node.position;
  return (
    <g data-node-id={node.id} onPointerDown={onPointerDown} style={{ cursor: 'pointer' }}>
      {isEdgeStart && (
        <rect
          x={x - 10}
          y={y - 10}
          width={20}
          height={20}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={3}
          rx={3}
        />
      )}
      <rect
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
        fill={isSelected ? '#f97316' : '#6b7280'}
        stroke={isSelected ? '#ea580c' : '#374151'}
        strokeWidth={2}
        rx={2}
      />
    </g>
  );
}
```

**AC7 compliance:** Road nodes = gray squares; POI pins = red circles. Both carry `data-node-id` / `data-poi-id` on their `<g>` wrapper.

### `RoadEdge` Sub-Component

Edge lines need a wide transparent hit area (SVG lines are thin and hard to click):

```tsx
interface RoadEdgeProps {
  edge: GraphEdge;
  fromNode: GraphNode;
  toNode: GraphNode;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function RoadEdge({ edge, fromNode, toNode, isSelected, onPointerDown }: RoadEdgeProps): JSX.Element {
  const x1 = fromNode.position.x;
  const y1 = fromNode.position.y;
  const x2 = toNode.position.x;
  const y2 = toNode.position.y;
  return (
    <g data-edge-from={edge.from} data-edge-to={edge.to} onPointerDown={onPointerDown}>
      {/* Transparent hit area (20px wide) for easy clicking */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={20} strokeLinecap="round" />
      {/* Visible line — carries data attributes per AC5 */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        data-edge-from={edge.from}
        data-edge-to={edge.to}
        stroke={isSelected ? '#f59e0b' : '#6b7280'}
        strokeWidth={isSelected ? 4 : 2}
        strokeLinecap="round"
      />
    </g>
  );
}
```

**AC5 compliance:** The visible `<line>` carries `data-edge-from` and `data-edge-to` attributes. The `<g>` also carries them for redundancy. The `onPointerDown` on `<g>` fires once regardless of which child `<line>` was hit.

**Why the `<g>` wrapper for handler:** If the handler were on each `<line>` separately, events could fire twice (once for the transparent hit-area line, once for the visible line). A single `<g>` handler fires once.

### SVG Render Order (AC7)

Edges MUST render before nodes, and nodes before POI pins, so that nodes and pins can be clicked (they appear above edges in z-order):

```tsx
return (
  <svg ...>
    <image href={...} ... />

    {/* 1: Edge lines (lowest layer) */}
    {mapConfig.graph.edges.map((edge) => {
      const fromNode = nodeById(edge.from);
      const toNode = nodeById(edge.to);
      if (!fromNode || !toNode) return null;
      const edgeKey = `${edge.from}:${edge.to}`;
      return (
        <RoadEdge
          key={edgeKey}
          edge={edge}
          fromNode={fromNode}
          toNode={toNode}
          isSelected={selectedItemId === edgeKey}
          onPointerDown={(e) => onEdgePointerDown(e, edge.from, edge.to)}
        />
      );
    })}

    {/* 2: Road nodes */}
    {mapConfig.graph.nodes.map((node) => (
      <RoadNode
        key={node.id}
        node={node}
        isSelected={selectedItemId === node.id}
        isEdgeStart={edgeStartId === node.id}
        onPointerDown={(e) => onNodePointerDown(e, node.id)}
      />
    ))}

    {/* 3: POI pins (top layer) */}
    {mapConfig.pois.map((poi) => (
      <PoiPin
        key={poi.id}
        poi={poi}
        isSelected={poi.id === selectedItemId}
        onPointerDown={(e) => onPinPointerDown(e, poi.id)}
      />
    ))}
  </svg>
);
```

**`nodeById` helper:**

```ts
function nodeById(id: string): GraphNode | undefined {
  return mapConfig.graph.nodes.find((n) => n.id === id);
}
```

Define inside the `MapCanvas` function body after the early-return guards (where `mapConfig` is guaranteed non-null).

### `nodeById` and `noUncheckedIndexedAccess`

`.find()` returns `T | undefined`. Always check for undefined before using:

```ts
if (!fromNode || !toNode) return null; // skip orphan edges
```

This prevents runtime errors if an edge references a deleted node (shouldn't happen with `coreRemoveNode`, but defensive).

### Updated Store Bindings in MapCanvas

Add to the existing Zustand subscriptions at the top of `MapCanvas`:

```ts
const addNode = useMapStore((s) => s.addNode);
const removeNode = useMapStore((s) => s.removeNode);
const addEdge = useMapStore((s) => s.addEdge);
const removeEdge = useMapStore((s) => s.removeEdge);
```

And add new type imports:

```ts
import type { POI, GraphNode, GraphEdge } from '@resort-map/types';
```

(Was only `POI` in Story 2.3 — extend to include `GraphNode` and `GraphEdge` for the new sub-components.)

### Architecture Compliance (MANDATORY)

1. **`verbatimModuleSyntax: true`** — `import type { GraphNode, GraphEdge }` (type-only); `import { updatePoi as coreUpdatePoi }` (value used at runtime). No changes needed.

2. **`noUncheckedIndexedAccess: true`** — All array subscripts that might be undefined must use `!` only when logically guaranteed, or handle the undefined case:
   - `nodes[nodes.length - 1]!.id` — safe after `addNode()` appended one item
   - `nodeById()` returns `T | undefined` — always check before use

3. **`onPointerDown` not `onClick`** — All interactions in `onNodePointerDown`, `onEdgePointerDown`, `onPinPointerDown` use `onPointerDown`. The Toolbar uses `onClick` for tool buttons (that is correct — toolbar buttons are UI controls, not SVG canvas elements).

4. **`data-node-id` attribute** — Every road node `<g>` must carry `data-node-id={node.id}` (ARCH-12).

5. **`data-edge-from` / `data-edge-to`** — Story AC5 specifies these exact attribute names on the visible `<line>` element. Do NOT use `data-edge-id` (that was the architecture suggestion; AC takes precedence).

6. **`e.stopPropagation()`** — Required in `onNodePointerDown` and `onEdgePointerDown` to prevent the SVG's `onSvgPointerDown` from also firing and inadvertently placing a node/POI.

7. **Props interfaces above components** — `RoadNodeProps` defined above `function RoadNode(...)`, `RoadEdgeProps` above `function RoadEdge(...)`.

8. **Explicit return types** — `RoadNode` and `RoadEdge` return `: JSX.Element`.

9. **`.ts` extensions** — All relative imports keep `.ts`/`.tsx` suffix.

### Files to Create / Modify

```
packages/builder-react/
├── src/
│   ├── store/
│   │   └── mapStore.ts          ← UPDATE: fix removeNode stale edge selection
│   ├── components/
│   │   └── MapCanvas.tsx        ← UPDATE: add node/edge rendering + interactions
│   └── __tests__/
│       └── mapStore.test.ts     ← UPDATE: add 3 tests for removeNode fix
```

Do NOT modify: App.tsx, Toolbar.tsx (already has placeNode/drawEdge buttons), Sidebar.tsx (Story 2.5), svgCoords.ts, index.ts, main.tsx, package.json, tsconfig.json.

### Previous Story Learnings (Stories 2.2 & 2.3)

- **Zustand `set()` is synchronous** — read new item's id via `useMapStore.getState()` immediately after calling `addNode()` / `addPoi()`. Safe with `!` assertion.
- **Drag pattern** — pointer capture on `svgRef`, `coreUpdatePoi + setState` on move (no undo), store action on up. Reuse existing pattern unchanged for POI drag.
- **`useMapStore.getState()` in event handlers** — preferred over closures to avoid stale state. The Delete key handler reads `mapConfig` from the closure dep but correctly lists it in the dep array.
- **TypeScript `"types": ["bun", "react"]`** — `JSX` namespace, `React.PointerEvent<T>`, `SVGGElement`, `SVGLineElement`, `SVGSVGElement` are all globally available. No import needed.
- **Edge key `"${from}:${to}"`** — already used in `mapStore.ts` for `removeEdge` selectedItemId clearing (line 120). Story 2.4 must use the same format everywhere (in `onEdgePointerDown` and in `onKeyDown` parsing).
- **Test isolation** — `beforeEach` in `mapStore.test.ts` resets store to null state. New tests in the "removeNode" describe block follow the same `initMap → addNode → addEdge → setState → act → assert` pattern.
- **bun test** — auto-discovers all `*.test.ts` files. The updated `mapStore.test.ts` runs automatically.

### Edge Case: Orphan Edge After Node Deletion via Store Action Directly

`coreRemoveNode` in builder-core removes all edges where `from === nodeId || to === nodeId`. So after any `removeNode` store action, `mapConfig.graph.edges` is already clean — no dangling edges. The `nodeById` check `if (!fromNode || !toNode) return null` is defensive but should never fire in practice.

### Scope: Node Drag is NOT in Story 2.4

Story 2.4 ACs do NOT mention dragging road nodes — only placing, selecting, and deleting them. Do NOT implement node drag in this story. Only POI drag exists (from Story 2.3). Node drag can be added in a future story if needed.

### Visual Summary

| Element | Shape | Unselected color | Selected color | Edge-start |
|---|---|---|---|---|
| POI pin | `<circle r={10}>` | red `#ef4444` | blue `#2563eb` | — |
| Road node | `<rect 12×12 rx=2>` | gray `#6b7280` | orange `#f97316` | yellow ring `#f59e0b` |
| Road edge | `<line>` | gray `#6b7280 / 2px` | yellow `#f59e0b / 4px` | — |

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- All 28 mapStore tests pass after `removeNode` fix (including 3 new edge-selection tests)
- tsc --noEmit clean (no TypeScript errors in builder-react)
- Full workspace suite: 106 pass, 0 fail across 6 files

### Completion Notes List

- Fixed `removeNode` store action to clear `selectedItemId` when a selected edge key (`"from:to"`) involves the deleted node — colon-split safe because UUIDs use hyphens only (code review finding #1)
- Rewrote `MapCanvas.tsx`: added `edgeStartId` local state for two-click edge drawing, `onNodePointerDown`/`onEdgePointerDown` handlers, SVG render order (edges → nodes → pins), `RoadEdge` (gray line + transparent 20px hit area, data-edge-from/to on both `<g>` and visible `<line>`), `RoadNode` (gray 12×12 square, orange when selected, yellow ring when edge-start candidate), updated Delete/Escape key handler for node and edge deletion, updated cursor logic (crosshair/copy/default per tool state), all 7 ACs satisfied
- `nodeById` defined inside MapCanvas body (after imageSize guard) where mapConfig is non-null — avoids null assertion inside the helper

### File List

- `packages/builder-react/src/store/mapStore.ts` (modified)
- `packages/builder-react/src/__tests__/mapStore.test.ts` (modified)
- `packages/builder-react/src/components/MapCanvas.tsx` (modified)

### Change Log

- 2026-06-17: Fix `removeNode` stale edge selection (mapStore.ts) + 3 new tests; extend MapCanvas with road node/edge placement, rendering, and interactions (all Story 2.4 ACs)

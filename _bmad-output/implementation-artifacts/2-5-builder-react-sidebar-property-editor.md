---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 2.5: builder-react — Sidebar Property Editor

Status: review

## Story

As a map author,
I want to edit a selected POI's label, tags, icon URL, and node connection in a sidebar panel,
So that I can configure all POI metadata visually without touching the JSON.

## Acceptance Criteria

1. **Given** a POI is selected (`selectedItemId` matches a POI id) **When** the sidebar renders **Then** it shows editable fields for: Label (text input), Tags (chip input supporting free text), Icon URL (text input), Node ID (text input)

2. **Given** I update the Label field and blur **When** `updatePoi` is called **Then** the POI's label reflects the new value immediately on the canvas

3. **Given** I add a tag chip **When** the tag is committed (Enter or blur) **Then** `updatePoi` is called with the new tags array **And** the updated tags are shown in the sidebar

4. **Given** I enter a value in Icon URL and blur **When** `updatePoi` is called **Then** the POI's `icon` field reflects the new URL

5. **Given** a node is selected (`selectedItemId` matches a node id) **When** the sidebar renders **Then** it shows the node's position (read-only) and its id (read-only, copyable to clipboard)

6. **Given** nothing is selected (`selectedItemId` is null) **When** the sidebar renders **Then** it shows a placeholder message: "Select a POI or node to edit its properties"

## Tasks / Subtasks

- [x] Implement POI property editor and node view in `packages/builder-react/src/components/Sidebar.tsx`
  - [x] Read `mapConfig`, `selectedItemId`, `updatePoi` from store (AC: 1–6)
  - [x] Derive `selectedPoi` and `selectedNode` via `.find()` on `mapConfig.pois` / `mapConfig.graph.nodes` (AC: 1, 5)
  - [x] Add `PoiEditor` private sub-component with `key={poi.id}` (React remount on POI switch resets draft state) (AC: 1–4)
    - [x] Label field: local `labelDraft` state initialized from `poi.label`; call `updatePoi(id, { label: draft })` on blur (AC: 1, 2)
    - [x] Tags: render chip for each `poi.tags` entry with remove-×-button; `newTag` input commits on Enter/blur via `updatePoi(id, { tags: [...poi.tags, newTag] })` (AC: 1, 3)
    - [x] Icon URL field: local `iconDraft` state initialized from `poi.icon ?? ''`; call `updatePoi(id, { icon: trimmed || undefined })` on blur (AC: 1, 4)
    - [x] Node ID field: local `nodeIdDraft` state initialized from `poi.nodeId ?? ''`; call `updatePoi(id, { nodeId: trimmed || undefined })` on blur (AC: 1)
  - [x] Add `NodeInfo` private sub-component: show `node.id` (copyable via `navigator.clipboard.writeText`) and `node.position.x`/`node.position.y` read-only (AC: 5)
  - [x] Preserve existing placeholder when `selectedItemId` is null, an edge key, or no match (AC: 6)
- [x] Run `bun test` from workspace root — all tests pass, no regressions

## Dev Notes

### What Sidebar.tsx Currently Does

Current implementation (26 lines):
- Reads `selectedItemId` from the Zustand store
- If `null`: renders the placeholder "Select a POI or node to edit its properties"
- Otherwise: renders "Selected: {selectedItemId}"

Story 2.5 replaces the "Selected: ..." branch with full POI editing UI and node read-only view. The placeholder stays unchanged.

### Identifying What Is Selected

`selectedItemId` can be:
- `null` — nothing selected
- A POI id (UUID, no colons) — matched against `mapConfig.pois`
- A node id (UUID, no colons) — matched against `mapConfig.graph.nodes`
- An edge key (`"from:to"`, contains `:`) — edge selected; no sidebar panel for edges in Story 2.5

Detection pattern (add to `Sidebar` function body):

```ts
const selectedPoi = selectedItemId && mapConfig
  ? (mapConfig.pois.find((p) => p.id === selectedItemId) ?? null)
  : null;

const selectedNode = !selectedPoi && selectedItemId && mapConfig
  ? (mapConfig.graph.nodes.find((n) => n.id === selectedItemId) ?? null)
  : null;
```

The short-circuit `!selectedPoi` avoids searching nodes when a POI already matched. Both `.find()` calls return `T | undefined` — the `?? null` coerces undefined to null for easier conditional rendering.

**Note on edge keys:** An edge key contains `:` (e.g., `"abc-123:def-456"`). When `selectedItemId` is an edge key, neither `.find()` matches and `selectedNode` is null — the sidebar renders the placeholder. This is correct and intentional.

### Store Bindings to Add

```ts
const mapConfig = useMapStore((s) => s.mapConfig);
const selectedItemId = useMapStore((s) => s.selectedItemId);
const updatePoi = useMapStore((s) => s.updatePoi);
```

The `updatePoi` action signature (from `mapStore.ts`):
```ts
updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
```
Fields patchable: `label`, `position`, `tags`, `icon`, `nodeId`, `meta`. Story 2.5 uses `label`, `tags`, `icon`, `nodeId`.

### Type Imports

```ts
import type { POI, GraphNode } from '@resort-map/types';
```

Both are type-only (never used as a value) → must use `import type` per `verbatimModuleSyntax: true`.

### `PoiEditor` Sub-Component — Complete Spec

**Critical pattern: `key={poi.id}` on `<PoiEditor>`**

```tsx
{selectedPoi && (
  <PoiEditor key={selectedPoi.id} poi={selectedPoi} updatePoi={updatePoi} />
)}
```

The `key` prop causes React to unmount + remount `PoiEditor` when the selected POI changes. This resets all `useState` hooks to the new POI's values with zero `useEffect` complexity.

**Props interface (above the function):**

```tsx
interface PoiEditorProps {
  poi: POI;
  updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
}
```

**Complete `PoiEditor` implementation:**

```tsx
function PoiEditor({ poi, updatePoi }: PoiEditorProps): JSX.Element {
  const [labelDraft, setLabelDraft] = useState(poi.label);
  const [iconDraft, setIconDraft] = useState(poi.icon ?? '');
  const [nodeIdDraft, setNodeIdDraft] = useState(poi.nodeId ?? '');
  const [newTag, setNewTag] = useState('');

  function commitLabel(): void {
    updatePoi(poi.id, { label: labelDraft });
  }

  function commitIcon(): void {
    updatePoi(poi.id, { icon: iconDraft.trim() || undefined });
  }

  function commitNodeId(): void {
    updatePoi(poi.id, { nodeId: nodeIdDraft.trim() || undefined });
  }

  function commitTag(): void {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    updatePoi(poi.id, { tags: [...poi.tags, trimmed] });
    setNewTag('');
  }

  function removeTag(tag: string): void {
    updatePoi(poi.id, { tags: poi.tags.filter((t) => t !== tag) });
  }

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>POI Properties</h3>

      {/* Label */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Label</label>
        <input
          style={inputStyle}
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>

      {/* Tags */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
          {poi.tags.map((tag) => (
            <span key={tag} style={chipStyle}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={chipRemoveStyle}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          style={inputStyle}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTag(); } }}
          onBlur={commitTag}
          placeholder="Add tag…"
        />
      </div>

      {/* Icon URL */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Icon URL</label>
        <input
          style={inputStyle}
          value={iconDraft}
          onChange={(e) => setIconDraft(e.target.value)}
          onBlur={commitIcon}
          placeholder="https://…"
        />
      </div>

      {/* Node ID */}
      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Node ID</label>
        <input
          style={inputStyle}
          value={nodeIdDraft}
          onChange={(e) => setNodeIdDraft(e.target.value)}
          onBlur={commitNodeId}
          placeholder="Link to graph node…"
        />
      </div>
    </div>
  );
}
```

**Shared style constants** (define at file level, below the component functions):

```ts
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '13px',
  outline: 'none',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  background: '#e5e7eb',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '12px',
};

const chipRemoveStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  lineHeight: 1,
  fontSize: '14px',
  color: '#6b7280',
};
```

### `NodeInfo` Sub-Component — Complete Spec

```tsx
interface NodeInfoProps {
  node: GraphNode;
}

function NodeInfo({ node }: NodeInfoProps): JSX.Element {
  function copyId(): void {
    void navigator.clipboard.writeText(node.id);
  }

  return (
    <div>
      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>Node Properties</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>ID</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all' }}>
            {node.id}
          </span>
          <button
            type="button"
            onClick={copyId}
            style={{ flexShrink: 0, fontSize: '11px', padding: '2px 6px', cursor: 'pointer', border: '1px solid #d1d5db', borderRadius: '3px', background: '#f9fafb' }}
          >
            Copy
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Position</label>
        <span style={{ fontSize: '13px', color: '#374151' }}>
          ({node.position.x}, {node.position.y})
        </span>
      </div>
    </div>
  );
}
```

**Why `void navigator.clipboard.writeText(...)`:** The Promise return value is intentionally ignored — the AC only says "copyable to clipboard", not "show confirmation feedback". The `void` prefix suppresses the floating-promise lint warning.

### Updated `Sidebar` Root Function

```tsx
export function Sidebar(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const updatePoi = useMapStore((s) => s.updatePoi);

  const selectedPoi = selectedItemId && mapConfig
    ? (mapConfig.pois.find((p) => p.id === selectedItemId) ?? null)
    : null;

  const selectedNode = !selectedPoi && selectedItemId && mapConfig
    ? (mapConfig.graph.nodes.find((n) => n.id === selectedItemId) ?? null)
    : null;

  return (
    <div
      style={{
        width: '280px',
        borderLeft: '1px solid #d1d5db',
        padding: '16px',
        overflowY: 'auto',
        background: '#fafafa',
        flexShrink: 0,
      }}
    >
      {selectedPoi ? (
        <PoiEditor key={selectedPoi.id} poi={selectedPoi} updatePoi={updatePoi} />
      ) : selectedNode ? (
        <NodeInfo node={selectedNode} />
      ) : (
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
          Select a POI or node to edit its properties
        </p>
      )}
    </div>
  );
}
```

### Architecture Compliance (MANDATORY)

1. **`verbatimModuleSyntax: true`** — must use `import type { POI, GraphNode }` (type-only). `useMapStore` is a runtime value — normal import.

2. **`noUncheckedIndexedAccess: true`** — `.find()` returns `T | undefined`. The `?? null` coercion handles this. No array indexing in this component.

3. **Props interfaces above components** — `PoiEditorProps` defined above `function PoiEditor(...)`, `NodeInfoProps` defined above `function NodeInfo(...)`.

4. **Private sub-components** — `PoiEditor`, `NodeInfo` are private (not exported) per the architecture collocated-sub-components pattern.

5. **`React.CSSProperties`** type for style constants — requires no additional import (available via `"types": ["bun", "react"]` in tsconfig).

6. **No prop spreading** — all props are explicitly passed.

7. **Explicit return types** — `: JSX.Element` on all component functions.

8. **`.ts` extensions** — relative imports stay `.ts`/`.tsx` suffix.

### Tag Edge Cases

- **Duplicate tag entries:** `removeTag(tag)` uses `.filter(t => t !== tag)` which removes ALL entries matching that value. If two "food" tags exist, both are removed. This is acceptable — the AC doesn't require index-based removal.
- **Empty `newTag` on blur:** `commitTag` guards `if (!trimmed) return` so blurring an empty input doesn't push an empty tag.
- **Tag input cleared after commit:** `setNewTag('')` resets the input after each successful commit.

### Label/Icon/NodeId Blur Behavior

- These fields call `updatePoi` on every blur event, even if the value didn't change. This creates an unnecessary undo stack entry but is acceptable. If needed, add `if (draft === poi.label) return;` guard — but the AC doesn't require this optimization.
- The `onKeyDown` for label (`e.key === 'Enter' → e.currentTarget.blur()`) triggers the blur event, which then calls `commitLabel`. The Enter key on icon/nodeId does NOT auto-blur (the AC doesn't require it). A future story can add this.

### `icon: undefined` vs `icon: ''`

When the user clears the Icon URL input:
```ts
updatePoi(poi.id, { icon: iconDraft.trim() || undefined });
```
`''.trim() || undefined` = `undefined`. The store action calls `coreUpdatePoi(config, poiId, { icon: undefined })`. In `coreUpdatePoi`:
```ts
return { ...config, pois: config.pois.map(p => p.id === poiId ? { ...p, ...patch } : p) };
```
Spreads `{ icon: undefined }` onto the POI. TypeScript `POI.icon?: string` means `icon: string | undefined` — `undefined` is valid. The result: `poi.icon` is `undefined` (absent from gwmap JSON on serialization).

### NodeId Field Purpose

AC1 requires a "Node ID (text input)" for POI editing. This is `poi.nodeId` — a string referencing a `GraphNode.id` in the same `MapConfig`. It allows `computeRoute` (view-core) to locate the graph node nearest to this POI without position snapping. The sidebar field lets the author manually copy-paste a node id into the POI's `nodeId` field.

Story 2.5 does NOT validate whether `poi.nodeId` actually references an existing node. That validation belongs in `validateGwmap` (already implemented in Story 1.3) and would only be meaningful at export time (Story 2.6).

### Previous Story Learnings (Stories 2.3 & 2.4)

- **Zustand subscriptions**: subscribe per-field: `useMapStore((s) => s.updatePoi)` etc. Avoids unnecessary re-renders.
- **Store `updatePoi` is synchronous**: after calling `updatePoi(id, patch)`, the store updates synchronously — canvas re-renders on the next tick with the new POI data.
- **`"types": ["bun", "react"]`**: `React.CSSProperties`, `JSX.Element`, `React.PointerEvent<T>` are globally available. No per-file imports needed.
- **`.ts` extension on relative imports**: always required — `'../store/mapStore.ts'` not `'../store/mapStore'`.
- **Style objects**: the existing codebase uses inline `style={{ ... }}` objects throughout. Follow the same pattern.

### Files to Create / Modify

```
packages/builder-react/
└── src/
    └── components/
        └── Sidebar.tsx    ← UPDATE (rewrite, from 26 lines to full implementation)
```

Do NOT modify: MapCanvas.tsx, Toolbar.tsx, App.tsx, mapStore.ts, schema.ts, index.ts, main.tsx, package.json, tsconfig.json.

### Testing for Story 2.5

Story 2.5 is UI-only. All new behavior is in `Sidebar.tsx` (rendering, local state, DOM events). The underlying `updatePoi` store action is already fully tested in `mapStore.test.ts` (Story 2.2 coverage). No new unit tests are needed or possible without a DOM testing environment (which `bun test` doesn't set up for React components in this project).

Run `bun test` to verify no regressions in the existing 106 tests.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- tsc --noEmit clean on builder-react (no TypeScript errors)
- Full workspace suite: 106 pass, 0 fail — no regressions

### Completion Notes List

- Rewrote `Sidebar.tsx` from 26-line placeholder to full implementation
- Detection: `selectedPoi` via `mapConfig.pois.find()`, then `selectedNode` via `mapConfig.graph.nodes.find()` — edge keys and null both fall through to placeholder (AC: 6)
- `PoiEditor` uses `key={poi.id}` for automatic state reset on POI switch — resets all 4 draft states (label, icon, nodeId, newTag) with zero useEffect complexity (AC: 1–4)
- Tags rendered as chips with × remove button; new tag input commits on Enter/blur (AC: 3)
- Icon URL and Node ID use `trim() || undefined` to cleanly clear optional POI fields (AC: 4)
- `NodeInfo` shows UUID in monospace + Copy button via `void navigator.clipboard.writeText(...)` + read-only position (AC: 5)
- Shared style constants (`labelStyle`, `inputStyle`, `chipStyle`, `chipRemoveStyle`) at file level; `React.CSSProperties` type works globally via `"types": ["bun", "react"]` in tsconfig

### File List

- `packages/builder-react/src/components/Sidebar.tsx` (modified)

### Change Log

- 2026-06-17: Implement Sidebar property editor — POI editing (label, tags, icon URL, nodeId) and node read-only view (id + clipboard copy, position)

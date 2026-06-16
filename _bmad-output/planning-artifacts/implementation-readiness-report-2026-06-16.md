---
stepsCompleted: [step-01-document-discovery, step-02-prd-analysis, step-03-epic-coverage-validation, step-04-ux-alignment, step-05-epic-quality-review, step-06-final-assessment]
documentsIncluded:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/specs/spec-resort-map/SPEC.md
  - _bmad-output/specs/spec-resort-map/package-architecture.md
  - _bmad-output/specs/spec-resort-map/gwmap-schema.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-16
**Project:** resortMap

---

## PRD Analysis

> Source: `specs/spec-resort-map/SPEC.md` + companions (`gwmap-schema.md`, `package-architecture.md`)

### Functional Requirements

FR1 (CAP-1): builder-core must produce a valid `.gwmap` file encoding a background image URL, map metadata (center, scale), POIs, and a road graph. Must pass schema validation and round-trip (serialize → parse) with zero data loss.

FR2 (CAP-2): builder-react must allow a non-technical author to visually place POIs and road nodes on a background image, configure their properties (label, tags, icon, map metadata), and export a valid `.gwmap` file via browser download — without editing JSON by hand.

FR3 (CAP-3): view-core must parse a `.gwmap` file and expose typed `MapConfig` to a rendering adapter. Well-formed input returns a `MapConfig`; malformed input throws a descriptive error.

FR4 (CAP-4): view-core must compute a walking itinerary and estimated walk time between any two points (POI id, user Position, or custom tap Position). `computeRoute()` returns an ordered `GraphNode[]` list and `walkTimeSeconds`; results are deterministic for identical inputs.

FR5 (CAP-5): view-core must filter the POI list by one or more tags, by maximum distance from a given position, or both combined. `filterPois()` returns only POIs matching all predicates; an empty predicate set returns the full list.

FR6 (CAP-6): view-react must expose a React ≥18 `<MapViewer>` component accepting a `.gwmap` path or parsed config, rendering the interactive map with routing and filtering — without requiring the host app to import view-core directly.

FR7 (CAP-7): view-react-native must expose the same `<MapViewer>` capabilities as a React Native component for iOS and Android, loading the same `.gwmap` file used by view-react with no platform-specific schema changes.

FR8 (CAP-8): builder-core and view-core must be framework-agnostic TypeScript packages with zero React/React Native imports. Both must compile and pass their full test suites in a plain Node 18 environment without React installed.

**Total FRs: 8**

### Non-Functional Requirements

NFR1 (Toolchain): TypeScript source; all packages compile and tests pass under Node 18.
NFR2 (Build): Bun workspace monorepo; `bun install`, `bun test`, `bun build` are the only build/test entry points.
NFR3 (Schema): `.gwmap` format is JSON with `.gwmap` extension; `gwmap-schema.md` is the single source of truth.
NFR4 (Isolation): builder-core and view-core contain zero React/React Native imports.
NFR5 (No duplication): Adapter packages delegate all business logic to their core — no duplicated routing, filtering, or serialization in adapters.
NFR6 (Transport): Walk is the only supported transportation mode; 1.4 m/s fixed pedestrian speed.
NFR7 (Assets): Background image is URL-referenced in `.gwmap`; not embedded or base64-encoded.
NFR8 (Targets): React adapter targets React ≥18; RN adapter targets current stable RN at build time.
NFR9 (Expo): view-react-native must be Expo-compatible (managed or bare workflow); no custom native modules outside Expo SDK.
NFR10 (Expo libs): Gesture and animation libraries in view-react-native must be Expo-compatible (react-native-gesture-handler, react-native-reanimated, react-native-svg).

**Total NFRs: 10**

### Additional Requirements (Schema & Constraints)

- `.gwmap` top-level fields: `version`, `map`, `pois`, `graph` — all required.
- `map` fields: `backgroundImageUrl` (string), `center` ({x,y} non-negative ints), `scale` (number > 0, meters/pixel).
- `pois` object fields: `id`, `label`, `position`, `tags[]` (required); `icon`, `nodeId`, `meta` (optional).
- `graph` object: `nodes[]` (`id`, `position`) and `edges[]` (`from`, `to`, optional `oneway`).
- Schema validation rules: unique IDs within namespaces, referential integrity for edges and `poi.nodeId`, `scale > 0`, non-negative positions.
- Graph is undirected by default; per-edge `oneway: true` overrides.
- POI-to-graph: connected via `nodeId`; if absent, routing snaps to nearest graph node.
- Pixel coordinate origin: top-left corner of background image.
- No cross-domain imports: builder packages must not import view packages and vice versa.
- builder-react is a standalone React app (not a library), usable locally or as a hosted page.

### PRD Completeness Assessment

The SPEC + companions provide a well-structured, precise contract. Requirements are capability-driven with clear success criteria. Four open questions remain unresolved (offline RN support, route animation, POI/graph scale limits, undo/redo in builder-react) that may affect implementation scope but are not blockers for starting development.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | Requirement (summary) | Epic / Stories | Status |
|----|----------------------|----------------|--------|
| FR1 | builder-core produces valid `.gwmap`, round-trip lossless | Epic 2 → Story 2.1 | ✓ Covered |
| FR2 | builder-react visual POI/node placement + export | Epic 2 → Stories 2.2–2.6 | ✓ Covered |
| FR3 | view-core parses `.gwmap`, descriptive error on malformed | Epic 3 → Story 3.1 | ✓ Covered |
| FR4 | view-core computes walking route + walk time, deterministic | Epic 3 → Story 3.2 | ✓ Covered |
| FR5 | view-core filters POIs by tag, distance, or both | Epic 3 → Story 3.3 | ✓ Covered |
| FR6 | view-react `<MapViewer>` with routing + filtering | Epic 4 → Stories 4.1–4.5 | ✓ Covered |
| FR7 | view-react-native `<MapViewer>` same file, iOS + Android | Epic 5 → Stories 5.1–5.5 | ✓ Covered |
| FR8 | builder-core + view-core zero React imports, Node 18 tests | Epics 1+2+3 → Stories 1.1, 2.1, 3.1 | ✓ Covered |

| NFR | Requirement (summary) | Epic / Stories | Status |
|-----|----------------------|----------------|--------|
| NFR1 | Node 18 compile + test | Story 1.1 (tsconfig ES2022) | ✓ Covered |
| NFR2 | Bun workspace only | Story 1.1 | ✓ Covered |
| NFR3 | `.gwmap` schema single source of truth | Story 1.3 (validateGwmap from types) | ✓ Covered |
| NFR4 | Zero React/RN imports in cores | Stories 2.1, 3.1 (grep ACs) | ✓ Covered |
| NFR5 | No logic duplication in adapters | Stories 4.1, 5.1 (grep ACs) | ✓ Covered |
| NFR6 | Walk-only transport | Story 3.2 (Dijkstra, no other modes) | ✓ Covered |
| NFR7 | Image is URL-referenced, not embedded | Story 2.6, schema ACs | ✓ Covered |
| NFR8 | React ≥18 / Expo SDK 56 targets | Stories 4.1, 5.1 | ✓ Covered |
| NFR9 | Expo-compatible (managed/bare) | Stories 5.1, 5.2 (ARCH-13) | ✓ Covered |
| NFR10 | Deterministic routing | Story 3.2 (identical-inputs AC) | ✓ Covered |

| ARCH | Decision | Epic / Stories | Status |
|------|----------|----------------|--------|
| ARCH-1 | `@resort-map/types` 6th package | Story 1.1, 1.2 | ✓ Covered |
| ARCH-2 | view-core stateless pure functions only | Story 3.4 | ✓ Covered |
| ARCH-3 | Single animated transform container | Stories 4.2, 5.2 | ✓ Covered |
| ARCH-4 | Error: `Object.assign(new Error, { code })` | Stories 1.2, 1.3 | ✓ Covered |
| ARCH-5 | Zustand store in builder-react | Story 2.2 | ✓ Covered |
| ARCH-6 | Forward-compatible schema versioning | Story 1.3 (strip+preserve ACs) | ✓ Covered |
| ARCH-7 | `crypto.randomUUID()` for IDs | Stories 2.1 | ✓ Covered |
| ARCH-8 | `viewerReducer` pure function exported from view-core | Story 3.4 | ✓ Covered |
| ARCH-9 | `imageSize` in ViewerState via onLoad/onLoadEnd | Stories 4.2, 5.2 | ✓ Covered |
| ARCH-10 | `"exports"` field in all library packages | Story 1.1 | ✓ Covered |
| ARCH-11 | Shared `.gwmap` fixtures in `@resort-map/types` | Story 1.3 | ✓ Covered |
| ARCH-12 | builder-react: `onPointerDown`, `data-poi-id`/`data-node-id` | Stories 2.3, 2.4 | ✓ Covered |
| ARCH-13 | RN: `GestureHandlerRootView`, Reanimated v2 | Stories 5.1, 5.2 | ✓ Covered |

### Missing Requirements

No FRs, NFRs, or ARCHs are fully uncovered. However, 4 gaps were identified:

**GAP-1 (Medium): No `removeEdge` API in builder-core**
- The `package-architecture.md` lists `removeNode` (which cascades to edges) but no standalone `removeEdge`. Story 2.4 covers deleting a node via Delete key, but there is no story for deleting an edge between two nodes while keeping both nodes. This is a missing authoring operation.
- Recommendation: Add `removeEdge(config, from, to): MapConfig` to builder-core's public API and a corresponding AC in Story 2.4.

**GAP-2 (Low): Undo-only, no redo**
- Story 2.2 defines `undoStack` and `undo()` but the SPEC open question ("is delete last placed item sufficient?") was resolved with a 50-entry undo stack — yet no `redo()` action or `redoStack` is in the state shape. If redo is expected, it is unspecified.
- Recommendation: Either explicitly scope redo as out-of-v1 in Story 2.2's ACs, or add `redoStack` to the store and a corresponding undo/redo AC pair.

**GAP-3 (Medium): No end-to-end integration story**
- The SPEC's "Success signal" is the full pipeline: a `.gwmap` authored in builder-react loads identically in view-react and view-react-native. No story tests this cross-package round-trip. Unit stories cover each package in isolation; the integration is assumed but never explicitly validated.
- Recommendation: Add a Story 6.1 (or append to Epic 1 or 5) for an integration test that: exports a `.gwmap` from builder-core, parses it in view-core, and asserts that view-react and view-react-native render the same POIs and route result.

**GAP-4 (Low): Open questions not parked as explicit v2 items**
- Four SPEC open questions (offline RN support, route animation, max graph scale for routing algorithm, undo/redo scope) are unresolved. None are tracked in epics as "post-v1 / deferred." This creates ambiguity about scope during implementation.
- Recommendation: Add a note in each affected story (5.1 for offline, 3.2 for algorithm scale, 4.4/5.4 for route animation) explicitly marking the decision as deferred, so developers don't re-open the question mid-sprint.

### Coverage Statistics

- Total SPEC FRs: 8 — Covered: 8 — **Coverage: 100%**
- Total NFRs: 10 — Covered: 10 — **Coverage: 100%**
- Total ARCHs: 13 — Covered: 13 — **Coverage: 100%**
- Gaps identified: 4 (0 blockers, 2 medium, 2 low)

---

## UX Alignment Assessment

### UX Document Status

**Not Found.** No `*ux*.md` file exists in planning artifacts.

**Assessment:** UX is strongly implied. Two packages (builder-react, view-react) are browser UI applications; one (view-react-native) is a mobile UI component. This is a user-facing product.

**Mitigating factor:** The epics.md explicitly acknowledges this: *"All UX requirements are captured within CAP-2 (builder) and CAP-6/CAP-7 (viewers)."* A visual reference was designated: `https://www.stay-app.com/hotel-map`. The UX requirements are therefore embedded in SPEC Capabilities and Architecture decisions rather than a standalone UX document.

### UX ↔ PRD Alignment

| UX Requirement | Source | Architecture Support | Status |
|----------------|--------|---------------------|--------|
| Visual POI placement on image canvas | CAP-2, Story 2.3 | ARCH-12 (SVG canvas, `onPointerDown`) | ✓ Aligned |
| Road drawing mode (node + edge) | CAP-2, Story 2.4 | ARCH-12 (`data-node-id`) | ✓ Aligned |
| Sidebar property editor | CAP-2, Story 2.5 | ARCH-5 (Zustand `selectedItemId`) | ✓ Aligned |
| Map metadata panel + export | CAP-2, Story 2.6 | builder-core `serializeGwmap` | ✓ Aligned |
| Pan + zoom (web) | CAP-6, Story 4.2 | ARCH-3 (CSS-transformed div) | ✓ Aligned |
| Pan + pinch-to-zoom (mobile) | CAP-7, Story 5.2 | ARCH-3/13 (Reanimated v2) | ✓ Aligned |
| POI pins + selection | CAP-6/7, Stories 4.3, 5.3 | ARCH-3 (SVG overlay) | ✓ Aligned |
| Route path + walk time display | CAP-6/7, Stories 4.4, 5.4 | ARCH-8 (`viewerReducer SET_ROUTE`) | ✓ Aligned |
| Tag/distance filter panel | CAP-6/7, Stories 4.5, 5.5 | ARCH-2 (`filterPois` pure fn) | ✓ Aligned |
| Undo in builder | ARCH-5, Story 2.2 | Zustand `undoStack` (50 entries) | ✓ Aligned |

### Warnings

⚠️ **UX-W1 (Low): No visual design specification**
Colors, typography, spacing, icon style, and component sizing are unspecified. Implementations will make ad-hoc visual decisions. Acceptable for an open-source library but creates inconsistency risk between view-react and view-react-native.

⚠️ **UX-W2 (Low): No accessibility requirements**
No WCAG compliance level, keyboard navigation, or screen-reader support is specified for builder-react or view-react. view-react-native similarly has no accessibility AC. If venue operators deploy this for public-facing use, accessibility may be required later.

⚠️ **UX-W3 (Low): Visual reference is a live URL, not a captured artifact**
The visual reference (`stay-app.com/hotel-map`) is external and may change or become unavailable. Recommend capturing a screenshot into the planning artifacts for long-term reference.

⚠️ **UX-W4 (Low): Loading + error states have functional ACs but no visual design**
Stories 4.1 and 5.1 dispatch `SET_ERROR` and render an error message, but no design for loading spinners, skeleton screens, or error UX is specified.

---

## Epic Quality Review

### Best Practices Validation Summary

**Epic 1: Workspace Foundation & Shared Schema**
- [x] Delivers user value (developer is the user for this library project)
- [x] Stands alone — no upstream epic dependency
- [x] Stories 1.1 → 1.2 → 1.3 sequence correctly (each builds on prior output)
- [x] All ACs in Given/When/Then format with specific, testable outcomes

**Epic 2: Map File Authoring (builder-core + builder-react)**
- [x] User-centric goal: a map author achieves a complete workflow
- [x] Depends only on Epic 1 — no view-core needed
- [x] Story sequencing: 2.1 (core logic) → 2.2 (app skeleton) → 2.3 (canvas) → 2.4 (road drawing) → 2.5 (sidebar) → 2.6 (metadata + export) is correct
- [x] ACs are specific, measurable, GWT-structured

**Epic 3: Map Viewing Core (view-core)**
- [x] User (adapter developer) can use all routing/filtering independently
- [x] Depends only on Epic 1
- [x] Story sequencing: 3.1 (primitives) → 3.2 (routing) → 3.3 (filtering) → 3.4 (reducer) is correct
- [x] Story 3.4 (`viewerReducer`) correctly depends on 3.2 and 3.3

**Epic 4: Web Map Viewer (view-react)**
- [x] User-centric: React developer mounts `<MapViewer>` and gets a working interactive map
- [x] Depends only on Epic 3 (no Epic 2 dependency — correct for a viewer)
- [x] Story sequencing: 4.1 (shell) → 4.2 (pan/zoom) → 4.3 (POI) → 4.4 (route) → 4.5 (filter) is correct

**Epic 5: Mobile Map Viewer (view-react-native)**
- [x] Mirrors Epic 4's structure with Expo/RN-specific implementations
- [x] Depends only on Epic 3
- [x] Parallel structure with Epic 4 is consistent and intentional

### Violations Found

#### 🔴 Critical: None

#### 🟠 Major Issues

**EQ-M1: Story 4.3 — Ambiguous route callback behavior**
The AC states: *"Then onRouteRequest(firstPoiId, secondPoiId) is called And computeRoute is called internally And SET_ROUTE is dispatched."* This implies both the host prop callback AND internal routing are triggered simultaneously. But if `onRouteRequest` is provided, should the component still call `computeRoute` and dispatch `SET_ROUTE` internally? Or is the prop a replacement for internal routing (the host app handles it externally)? The current AC makes both happen — the host app gets a callback AND the component routes internally, which may produce duplicated state management.
- **Recommendation:** Clarify in Story 4.3 whether `onRouteRequest` is an observation hook (both fire) or a control override (only the callback fires, host manages route). Same ambiguity exists in Story 5.3.

**EQ-M2: No story covers deleting a POI from the canvas**
Story 2.3 covers POI placement and selection. Story 2.4 covers node deletion via the Delete key. Story 2.5 covers the sidebar editor. But no AC in any story says "pressing Delete with a POI selected removes it." The `removePoi` function exists in builder-core (Story 2.1) but no UI story invokes it.
- **Recommendation:** Add an AC to Story 2.3 or 2.5: "Given a POI is selected, When I press Delete, Then `removePoi` is called and the pin is removed from the canvas."

#### 🟡 Minor Concerns

**EQ-L1: Epic 1 is technically framed**
"Workspace Foundation & Shared Schema" reads as a technical milestone. For a developer-tooling library this is standard, but the epic title could be more value-oriented (e.g., "Shared Contract & Monorepo Foundation"). Low priority.

**EQ-L2: `ViewerAction` type not explicitly placed in `@resort-map/types`**
Story 3.4 defines action types (`MAP_LOADED`, `SELECT_POI`, `SET_ROUTE`, `SET_FILTER`, `IMAGE_LOADED`, `SET_ERROR`) inline in the story. If `ViewerAction` is not exported from `@resort-map/types`, adapter packages that want to dispatch typed actions must import from view-core, creating a non-obvious dependency. Story 1.2 lists `ViewerState` as a type to export from `@resort-map/types` but does not list `ViewerAction`.
- **Recommendation:** Add `ViewerAction` (discriminated union of all action types) to Story 1.2's AC for `@resort-map/types` exports.

**EQ-L3: No CI/CD pipeline story**
Greenfield projects benefit from early CI setup (running `bun test` on PRs). No story covers this. Acceptable for an initial scope but worth noting.

**EQ-L4: No linting/formatting setup story**
No story establishes ESLint, Prettier, or Biome configuration. Developers will make ad-hoc style decisions across 6 packages without a shared formatter.

### Best Practices Compliance Checklist

| Epic | User Value | Independent | Stories Sized | No Forward Deps | ACs Testable | FR Traceable |
|------|-----------|-------------|---------------|-----------------|--------------|--------------|
| Epic 1 | ✓ (dev user) | ✓ | ✓ | ✓ | ✓ | ✓ (FR8) |
| Epic 2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (FR1, FR2, FR8) |
| Epic 3 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (FR3–FR5, FR8) |
| Epic 4 | ✓ | ✓ | ✓ | ✓ | ⚠️ EQ-M1 | ✓ (FR6) |
| Epic 5 | ✓ | ✓ | ✓ | ✓ | ⚠️ EQ-M1 | ✓ (FR7) |

---

## Summary and Recommendations

### Overall Readiness Status

**✅ READY TO PROCEED — with recommended fixes**

The resortMap epics and stories are well-structured, comprehensive, and traceable. All 8 FRs, 10 NFRs, and 13 Architecture decisions are covered. No critical blockers exist. Eight issues were identified: 2 medium gaps, 2 major AC issues, and 4 low-priority concerns. None prevent starting Sprint Planning.

---

### Issues by Priority

| ID | Severity | Category | Issue |
|----|----------|----------|-------|
| EQ-M1 | 🟠 Major | AC Clarity | `onRouteRequest` callback vs internal routing ambiguous in Stories 4.3 + 5.3 |
| EQ-M2 | 🟠 Major | Missing Story AC | No Delete-key-to-remove-POI AC in any story |
| GAP-1 | 🟡 Medium | Missing API | No `removeEdge` function in builder-core |
| GAP-3 | 🟡 Medium | Missing Story | No end-to-end integration test story for the full pipeline |
| GAP-2 | 🔵 Low | Scope ambiguity | Redo not specified (only undo) — intent unclear |
| GAP-4 | 🔵 Low | Open questions | 4 SPEC open questions not explicitly parked as deferred |
| EQ-L2 | 🔵 Low | Type gap | `ViewerAction` type missing from `@resort-map/types` exports |
| EQ-L3/L4 | 🔵 Low | Greenfield gaps | No CI/CD or linting setup story |

---

### Recommended Next Steps

1. **Fix EQ-M1 (Stories 4.3, 5.3):** Decide and document whether `onRouteRequest` is an observation hook (component still routes internally) or a control override (component defers). Add one clarifying sentence to the AC.

2. **Fix EQ-M2 (Story 2.3 or 2.5):** Add an AC: "Given a POI is selected (selectedItemId matches a POI id), When I press the Delete key, Then `removePoi` is called and the pin is removed from the canvas."

3. **Address GAP-1:** Add `removeEdge(config: MapConfig, from: string, to: string): MapConfig` to builder-core's API (Story 2.1) and a corresponding canvas interaction AC in Story 2.4 (e.g., right-click or edge-selection + Delete).

4. **Address GAP-3:** Add a minimal integration story (e.g., Story 3.5 or a standalone Epic 6 Story 6.1): serialize a `MapConfig` via builder-core, parse it via view-core, assert POIs and a computed route are correct. This validates the full builder-to-viewer pipeline as specified by the SPEC success signal.

5. **Address EQ-L2 (Story 1.2):** Add `ViewerAction` (discriminated union) to the `@resort-map/types` export list.

6. **Park open questions (GAP-4):** Add a one-line note to Stories 3.2, 4.4/5.4, and 5.1 explicitly marking the open decisions as deferred to post-v1.

Items 1–3 are recommended before Sprint Planning. Items 4–6 can be done in parallel with early stories.

---

### Final Note

This assessment identified **8 issues** across 4 categories (coverage gaps, AC clarity, missing operations, scope ambiguity). No critical blockers were found. The planning artifacts are of high quality — requirements are precise, stories are well-sized with testable Given/When/Then criteria, and the dependency order across 5 epics is correct. Addressing the 2 major issues (EQ-M1, EQ-M2) before implementation begins is strongly recommended to avoid rework in Epic 4 and 5.

**Report saved to:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-06-16.md`
**Assessed by:** Implementation Readiness Workflow — 2026-06-16

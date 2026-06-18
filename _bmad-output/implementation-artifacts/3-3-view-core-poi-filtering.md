---
baseline_commit: 330eb97770ec97586c24ea084db880ab6247f2f1
---

# Story 3.3: view-core — POI Filtering

Status: review

## Story

**As a** viewer adapter,
**I want** `filterPois(config, options)` to return only POIs matching supplied tag and/or distance predicates,
**So that** the viewer can display filtered POI sets without duplicating filtering logic in each adapter.

## Acceptance Criteria

1. **Given** a `MapConfig` and `filterPois(config, {})` (empty options) **When** called **Then** it returns all POIs in the config unchanged

2. **Given** options `{ tags: ["food"] }` **When** `filterPois` is called **Then** it returns only POIs whose `tags` array contains `"food"` (at least one matching tag)

3. **Given** options `{ tags: ["food", "leisure"] }` **When** `filterPois` is called **Then** it returns POIs that have at least one of those tags (OR semantics)

4. **Given** options `{ maxDistanceMeters: 300, origin: { x: 100, y: 300 } }` **When** `filterPois` is called **Then** it returns only POIs whose `pixelsToMeters(pixelDistance(poi.position, origin), scale)` is ≤ 300

5. **Given** options `{ tags: ["leisure"], maxDistanceMeters: 300, origin: pos }` **When** `filterPois` is called **Then** it returns POIs that satisfy BOTH the tag AND distance predicates

6. **Given** options `{ maxDistanceMeters: 50 }` with no `origin` **When** `filterPois` is called **Then** it throws with `code: ErrorCode.INVALID_POSITION`

## Tasks / Subtasks

- [x] Create `packages/view-core/src/filterPois.ts` with the `filterPois` public function
  - [x] Guard: if `options.maxDistanceMeters` is defined but `options.origin` is not → throw ADR-004 error with `ErrorCode.INVALID_POSITION` (AC: 6)
  - [x] Implement tag filter (OR semantics): skip if `options.tags` is undefined or empty; otherwise return false if no tag matches (AC: 2, 3)
  - [x] Implement distance filter: `pixelsToMeters(pixelDistance(poi.position, origin), config.map.scale) <= maxDistanceMeters` (AC: 4)
  - [x] Both predicates apply simultaneously (AND logic) (AC: 5)
  - [x] Write unit tests in `src/__tests__/filterPois.test.ts` FIRST (RED phase), then implement (GREEN) (AC: 1–6)

- [x] Update `packages/view-core/src/index.ts` to export `filterPois` (AC: 1)
  - [x] Add `export { filterPois } from './filterPois.ts';`

- [x] Run `bun test` from workspace root — all tests pass (136 existing + ~8 new = ~144 total)

## Dev Notes

### Package Context — What Exists After Story 3.2

**`packages/view-core/src/index.ts` (current):**
```ts
export { parseGwmap } from './parseGwmap.ts';
export { computeRoute } from './computeRoute.ts';
```

**Internal utilities available (NOT exported from index.ts):**

`src/utils/pixelMath.ts`:
```ts
export function pixelDistance(a: Position, b: Position): number
export function pixelsToMeters(pixels: number, scale: number): number
export function estimateWalkTime(distanceMeters: number): number
```

`filterPois.ts` imports from pixelMath:
```ts
import { pixelDistance, pixelsToMeters } from './utils/pixelMath.ts';
```

### `PoiFilterOptions` Type (from `@resort-map/types`)

```ts
export interface PoiFilterOptions {
  tags?: string[];
  maxDistanceMeters?: number;
  origin?: Position;
}
```

All fields are optional. `filterPois` must handle every combination gracefully:
- All undefined → return all POIs (AC 1)
- `tags` only → tag filter only
- `maxDistanceMeters` + `origin` → distance filter only
- `maxDistanceMeters` without `origin` → throw (AC 6)
- All three → tag AND distance

### `ErrorCode.INVALID_POSITION` (from `@resort-map/types`)

```ts
export const ErrorCode = {
  GWMAP_PARSE_ERROR: 'GWMAP_PARSE_ERROR',
  GWMAP_VERSION_MISMATCH: 'GWMAP_VERSION_MISMATCH',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  INVALID_POSITION: 'INVALID_POSITION',
  INVALID_NODE_REF: 'INVALID_NODE_REF',
} as const;
```

ADR-004 error pattern:
```ts
throw Object.assign(
  new Error('filterPois: maxDistanceMeters requires origin'),
  { code: ErrorCode.INVALID_POSITION },
);
```

### TypeScript Constraints (MUST FOLLOW — same as Stories 3.1, 3.2)

- `verbatimModuleSyntax: true` → `import type` MANDATORY for type-only imports
- `noUncheckedIndexedAccess: true` → `for...of` over arrays; avoid `array[i]`
- All exported functions MUST have explicit return types
- `.ts` extensions on ALL relative imports

**Type narrowing via destructuring (avoids property-narrowing pitfalls):**
```ts
// CORRECT — destructure first, then narrow local variables
return config.pois.filter((poi) => {
  const { tags, maxDistanceMeters, origin } = options;
  if (tags !== undefined && tags.length > 0) {
    if (!tags.some((t) => poi.tags.includes(t))) return false;
  }
  ...
});

// RISKY — TypeScript may not narrow options.tags inside closures in all cases
if (options.tags !== undefined) {
  const hasTag = options.tags.some(...);  // could error in some TS versions
}
```

Destructuring at the top of the callback gives local `const` variables that TypeScript narrows reliably.

### Import Declarations

`POI` and `PoiFilterOptions` are types → `import type`:
```ts
import type { MapConfig, POI, PoiFilterOptions } from '@resort-map/types';
import { ErrorCode } from '@resort-map/types';
import { pixelDistance, pixelsToMeters } from './utils/pixelMath.ts';
```

### Full `filterPois` Implementation

```ts
import type { MapConfig, POI, PoiFilterOptions } from '@resort-map/types';
import { ErrorCode } from '@resort-map/types';
import { pixelDistance, pixelsToMeters } from './utils/pixelMath.ts';

export function filterPois(config: MapConfig, options: PoiFilterOptions): POI[] {
  if (options.maxDistanceMeters !== undefined && options.origin === undefined) {
    throw Object.assign(
      new Error('filterPois: maxDistanceMeters requires origin'),
      { code: ErrorCode.INVALID_POSITION },
    );
  }

  return config.pois.filter((poi) => {
    const { tags, maxDistanceMeters, origin } = options;

    if (tags !== undefined && tags.length > 0) {
      if (!tags.some((t) => poi.tags.includes(t))) return false;
    }

    if (maxDistanceMeters !== undefined && origin !== undefined) {
      const distMeters = pixelsToMeters(
        pixelDistance(poi.position, origin),
        config.map.scale,
      );
      if (distMeters > maxDistanceMeters) return false;
    }

    return true;
  });
}
```

**Behavior when `tags: []` (empty array):** `tags.length > 0` is `false` → tag filter skipped → all POIs pass tag predicate. This is correct — an empty tags array means "no tag constraint", same as omitting `tags` entirely.

### Complex Fixture for Tests

From `@resort-map/types/fixtures/complex.gwmap.json` (scale: 0.5 m/px):

| POI | Label | Position | Tags |
|---|---|---|---|
| poi-001 | Restaurant | (100, 300) | ["food"] |
| poi-002 | Pool | (900, 300) | ["leisure"] |
| poi-003 | Gym | (500, 550) | ["leisure"] |

**Pre-computed distances from origin `{x: 100, y: 300}`:**

- poi-001: `pixelDistance({x:100,y:300},{x:100,y:300})` = 0px → 0m ✓
- poi-002: `pixelDistance({x:100,y:300},{x:900,y:300})` = 800px → 400m ✗ (> 300m)
- poi-003: `pixelDistance({x:100,y:300},{x:500,y:550})` = √(400²+250²) = √222500 ≈ 471.7px → ≈235.9m ✓

So with `{ maxDistanceMeters: 300, origin: { x: 100, y: 300 } }`:
- poi-001 (0m): included
- poi-002 (400m): excluded
- poi-003 (≈235.9m): included
- **Result: [poi-001, poi-003]**

With `{ tags: ["leisure"], maxDistanceMeters: 300, origin: { x: 100, y: 300 } }` (combined):
- poi-001: tag "food" ∉ ["leisure"] → excluded
- poi-002: tag "leisure" ✓ but 400m > 300 → excluded
- poi-003: tag "leisure" ✓ and 235.9m ≤ 300 → included
- **Result: [poi-003]**

### Test File: `src/__tests__/filterPois.test.ts`

```ts
import { test, expect, describe } from 'bun:test';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { filterPois } from '../filterPois.ts';

const config = complexMap as unknown as MapConfig;
const origin = { x: 100, y: 300 } as const;

describe('filterPois', () => {
  test('empty options returns all POIs', () => {
    expect(filterPois(config, {})).toHaveLength(3);
  });

  test('single tag filter returns matching POIs only', () => {
    const result = filterPois(config, { tags: ['food'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('poi-001');
  });

  test('multi-tag filter uses OR semantics', () => {
    const result = filterPois(config, { tags: ['food', 'leisure'] });
    expect(result).toHaveLength(3);
  });

  test('tag filter with no matches returns empty array', () => {
    expect(filterPois(config, { tags: ['nonexistent'] })).toHaveLength(0);
  });

  test('distance filter includes POIs within range', () => {
    const result = filterPois(config, { maxDistanceMeters: 300, origin });
    const ids = result.map((p) => p.id);
    expect(ids).toContain('poi-001');
    expect(ids).toContain('poi-003');
    expect(ids).not.toContain('poi-002');
  });

  test('combined tag AND distance filter', () => {
    const result = filterPois(config, { tags: ['leisure'], maxDistanceMeters: 300, origin });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('poi-003');
  });

  test('missing origin with maxDistanceMeters throws INVALID_POSITION', () => {
    try {
      filterPois(config, { maxDistanceMeters: 50 });
      expect('should have thrown').toBe(false);
    } catch (err) {
      expect((err as { code: string }).code).toBe('INVALID_POSITION');
    }
  });

  test('leisure-only tag filter returns Pool and Gym', () => {
    const result = filterPois(config, { tags: ['leisure'] });
    const ids = result.map((p) => p.id).sort();
    expect(ids).toEqual(['poi-002', 'poi-003']);
  });
});
```

### `index.ts` Final State After Story 3.3

```ts
export { parseGwmap } from './parseGwmap.ts';
export { computeRoute } from './computeRoute.ts';
export { filterPois } from './filterPois.ts';
```

### Files to Create / Modify

```
packages/view-core/src/
  index.ts              ← UPDATE: add filterPois export
  filterPois.ts         ← CREATE: filterPois function
  __tests__/
    filterPois.test.ts  ← CREATE: ~8 tests
```

### NFR4 Reminder

No React imports. `filterPois.ts` only imports from `@resort-map/types` and local `./utils/pixelMath.ts`. Both are framework-agnostic.

### Previous Stories Learnings

- RED phase confirmed for each test file before implementation
- `import type` for all type-only imports; regular `import` for runtime values (`ErrorCode`)
- `import complexMap from '@resort-map/types/fixtures/complex.gwmap.json'` works (package.json has `"./fixtures/*"` export)
- Cast JSON fixture: `complexMap as unknown as MapConfig`
- `options.tags[0]` would be `string | undefined` due to `noUncheckedIndexedAccess` — never index arrays; use `.some()`, `.includes()`, `.filter()` instead
- `for...of` for iteration; `.length` for empty checks; `.map().filter()` chain for transformations

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- RED phase: `filterPois.ts` module not found → confirmed failing before implementation
- GREEN phase: all 8 tests pass on first implementation
- Full workspace: 144/144 (8 new + 136 existing, zero regressions)

### Completion Notes List

- ✅ Created `filterPois.ts` with guard (INVALID_POSITION), tag OR filter, distance filter, AND combination (AC 1–6)
- ✅ Destructuring in `.filter()` callback avoids TypeScript property-narrowing issues
- ✅ `tags.length > 0` check ensures empty tags array = no filtering (AC 1)
- ✅ Updated `index.ts` with `filterPois` export

### File List

- `packages/view-core/src/index.ts` (modified)
- `packages/view-core/src/filterPois.ts` (created)
- `packages/view-core/src/__tests__/filterPois.test.ts` (created)
- `_bmad-output/implementation-artifacts/3-3-view-core-poi-filtering.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

### Change Log

- 2026-06-17: Implemented Story 3.3 — POI filtering. 8 new tests; workspace total 144/144 passing.

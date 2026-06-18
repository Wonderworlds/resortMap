import { test, expect, describe } from 'bun:test';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { filterPois } from '../filterPois';

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

  test('leisure-only tag filter returns Pool and Gym', () => {
    const result = filterPois(config, { tags: ['leisure'] });
    const ids = result.map((p) => p.id).sort();
    expect(ids).toEqual(['poi-002', 'poi-003']);
  });

  test('multi-tag filter uses OR semantics — food or leisure returns all', () => {
    const result = filterPois(config, { tags: ['food', 'leisure'] });
    expect(result).toHaveLength(3);
  });

  test('tag filter with no matches returns empty array', () => {
    expect(filterPois(config, { tags: ['nonexistent'] })).toHaveLength(0);
  });

  test('distance filter includes only POIs within range', () => {
    // poi-001: 0m, poi-002: 400m, poi-003: ~235.9m (scale 0.5 m/px)
    const result = filterPois(config, { maxDistanceMeters: 300, origin });
    const ids = result.map((p) => p.id);
    expect(ids).toContain('poi-001');
    expect(ids).toContain('poi-003');
    expect(ids).not.toContain('poi-002');
  });

  test('combined tag AND distance filter', () => {
    // tag: leisure → poi-002 and poi-003; distance ≤ 300m from (100,300) → poi-001 and poi-003
    // intersection: poi-003 only
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
});

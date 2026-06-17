import { test, expect, describe } from 'bun:test';
import { validateGwmap } from '../validate.ts';
import { ErrorCode } from '../errors.ts';
import sampleMap from '@resort-map/types/fixtures/sample.gwmap.json';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

function makeValidBase() {
  return {
    version: '1.0',
    map: {
      backgroundImageUrl: 'https://example.com/map.png',
      center: { x: 512, y: 384 },
      scale: 0.05,
    },
    pois: [],
    graph: { nodes: [], edges: [] },
  };
}

function catchError(fn: () => unknown): (Error & { code?: string }) | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    return e as Error & { code?: string };
  }
}

describe('validateGwmap — happy path', () => {
  test('returns MapConfig for valid object', () => {
    const result = validateGwmap(makeValidBase());
    expect(result.version).toBe('1.0');
    expect(result.pois).toHaveLength(0);
    expect(result.graph.nodes).toHaveLength(0);
    expect(result.graph.edges).toHaveLength(0);
  });

  test('strips unknown top-level fields', () => {
    const input = { ...makeValidBase(), description: 'should be stripped', extra: 42 };
    const result = validateGwmap(input);
    expect((result as Record<string, unknown>)['description']).toBeUndefined();
    expect((result as Record<string, unknown>)['extra']).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(['graph', 'map', 'pois', 'version'].sort());
  });

  test('preserves POI.meta unknown fields', () => {
    const input = {
      ...makeValidBase(),
      graph: {
        nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
        edges: [],
      },
      pois: [
        {
          id: 'poi-1',
          label: 'Test POI',
          position: { x: 10, y: 10 },
          tags: ['test'],
          nodeId: 'n1',
          meta: { rating: 5, open: true, description: 'custom field' },
        },
      ],
    };
    const result = validateGwmap(input);
    expect(result.pois[0]?.meta?.['rating']).toBe(5);
    expect(result.pois[0]?.meta?.['open']).toBe(true);
    expect(result.pois[0]?.meta?.['description']).toBe('custom field');
  });

  test('accepts version "1.1" (same major)', () => {
    const input = { ...makeValidBase(), version: '1.1' };
    const result = validateGwmap(input);
    expect(result.version).toBe('1.1');
  });

  test('accepts pois with no meta/icon/nodeId (optional fields)', () => {
    const input = {
      ...makeValidBase(),
      pois: [
        {
          id: 'poi-1',
          label: 'Minimal POI',
          position: { x: 0, y: 0 },
          tags: ['tag1'],
        },
      ],
    };
    const result = validateGwmap(input);
    expect(result.pois[0]?.icon).toBeUndefined();
    expect(result.pois[0]?.nodeId).toBeUndefined();
    expect(result.pois[0]?.meta).toBeUndefined();
  });
});

describe('validateGwmap — version errors', () => {
  test('throws GWMAP_PARSE_ERROR for missing version', () => {
    const input = { ...makeValidBase(), version: undefined };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
    expect(err?.message).toContain('version');
  });

  test('throws GWMAP_VERSION_MISMATCH for version "2.0"', () => {
    const input = { ...makeValidBase(), version: '2.0' };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_VERSION_MISMATCH);
  });

  test('throws GWMAP_VERSION_MISMATCH for version "0.9"', () => {
    const input = { ...makeValidBase(), version: '0.9' };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_VERSION_MISMATCH);
  });
});

describe('validateGwmap — missing required fields', () => {
  test('throws GWMAP_PARSE_ERROR naming "map.backgroundImageUrl" when missing', () => {
    const input = {
      ...makeValidBase(),
      map: { center: { x: 0, y: 0 }, scale: 1 },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
    expect(err?.message).toContain('map.backgroundImageUrl');
  });

  test('throws GWMAP_PARSE_ERROR naming "map.center" when missing', () => {
    const input = {
      ...makeValidBase(),
      map: { backgroundImageUrl: 'https://example.com/img.png', scale: 1 },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
    expect(err?.message).toContain('map.center');
  });

  test('throws GWMAP_PARSE_ERROR naming "map.scale" when missing', () => {
    const input = {
      ...makeValidBase(),
      map: { backgroundImageUrl: 'https://example.com/img.png', center: { x: 0, y: 0 } },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
    expect(err?.message).toContain('map.scale');
  });

  test('throws GWMAP_PARSE_ERROR for scale = 0', () => {
    const input = {
      ...makeValidBase(),
      map: { backgroundImageUrl: 'https://example.com/img.png', center: { x: 0, y: 0 }, scale: 0 },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR for negative scale', () => {
    const input = {
      ...makeValidBase(),
      map: { backgroundImageUrl: 'https://example.com/img.png', center: { x: 0, y: 0 }, scale: -1 },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR when pois is not an array', () => {
    const input = { ...makeValidBase(), pois: 'not-an-array' };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
    expect(err?.message).toContain('pois');
  });

  test('throws GWMAP_PARSE_ERROR when graph is missing', () => {
    const input = { ...makeValidBase(), graph: null };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
    expect(err?.message).toContain('graph');
  });

  test('throws GWMAP_PARSE_ERROR when edge references unknown node', () => {
    const input = {
      ...makeValidBase(),
      graph: {
        nodes: [{ id: 'node-1', position: { x: 0, y: 0 } }],
        edges: [{ from: 'node-1', to: 'node-MISSING' }],
      },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR when poi.nodeId references unknown node', () => {
    const input = {
      ...makeValidBase(),
      graph: {
        nodes: [{ id: 'node-1', position: { x: 0, y: 0 } }],
        edges: [],
      },
      pois: [
        {
          id: 'poi-1',
          label: 'Test',
          position: { x: 0, y: 0 },
          tags: [],
          nodeId: 'node-MISSING',
        },
      ],
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR for duplicate POI ids', () => {
    const poi = { id: 'poi-1', label: 'Test', position: { x: 0, y: 0 }, tags: [] };
    const input = { ...makeValidBase(), pois: [poi, { ...poi }] };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR for duplicate node ids', () => {
    const node = { id: 'node-1', position: { x: 0, y: 0 } };
    const input = {
      ...makeValidBase(),
      graph: { nodes: [node, { ...node }], edges: [] },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR for negative position.x', () => {
    const input = {
      ...makeValidBase(),
      graph: {
        nodes: [{ id: 'node-1', position: { x: -1, y: 0 } }],
        edges: [],
      },
    };
    const err = catchError(() => validateGwmap(input));
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });
});

describe('fixtures', () => {
  test('sampleMap validates and has 1 POI, 2 nodes, 1 edge (AC 4)', () => {
    const result = validateGwmap(sampleMap);
    expect(result.pois).toHaveLength(1);
    expect(result.pois[0]?.tags.length).toBeGreaterThanOrEqual(1);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toHaveLength(1);
  });

  test('complexMap validates and has ≥3 POIs, ≥2 distinct tags, ≥6 nodes, ≥5 edges (AC 5)', () => {
    const result = validateGwmap(complexMap);
    expect(result.pois.length).toBeGreaterThanOrEqual(3);
    const allTags = new Set(result.pois.flatMap(p => p.tags));
    expect(allTags.size).toBeGreaterThanOrEqual(2);
    expect(result.graph.nodes.length).toBeGreaterThanOrEqual(6);
    expect(result.graph.edges.length).toBeGreaterThanOrEqual(5);
  });
});

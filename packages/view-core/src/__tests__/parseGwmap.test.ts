import { test, expect, describe } from 'bun:test';
import { parseGwmap } from '../parseGwmap.ts';

const validGwmapJson = JSON.stringify({
  version: '1.0',
  map: {
    backgroundImageUrl: 'https://example.com/map.png',
    center: { x: 512, y: 384 },
    scale: 0.1,
  },
  pois: [],
  graph: { nodes: [], edges: [] },
});

describe('parseGwmap (view-core)', () => {
  test('valid JSON string returns typed MapConfig', () => {
    const result = parseGwmap(validGwmapJson);
    expect(result.version).toBe('1.0');
    expect(result.map.backgroundImageUrl).toBe('https://example.com/map.png');
    expect(result.pois).toHaveLength(0);
    expect(result.graph.nodes).toHaveLength(0);
  });

  test('invalid JSON throws GWMAP_PARSE_ERROR', () => {
    try {
      parseGwmap('{ not valid json');
      expect('should have thrown').toBe(false);
    } catch (err) {
      expect((err as { code: string }).code).toBe('GWMAP_PARSE_ERROR');
    }
  });

  test('valid JSON but invalid schema throws GWMAP_PARSE_ERROR via validateGwmap', () => {
    const badSchema = JSON.stringify({ version: '1.0', map: { missing: 'required fields' } });
    try {
      parseGwmap(badSchema);
      expect('should have thrown').toBe(false);
    } catch (err) {
      expect((err as { code: string }).code).toBe('GWMAP_PARSE_ERROR');
    }
  });
});

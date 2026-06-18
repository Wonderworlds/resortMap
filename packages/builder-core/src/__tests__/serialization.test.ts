import { test, expect, describe } from 'bun:test';
import { serializeGwmap, parseGwmap } from '../serialization';
import { createMapConfig, addPoi, addNode, addEdge } from '../mapConfig';
import { ErrorCode } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import type { MapMeta } from '@resort-map/types';

const validMeta: MapMeta = {
  backgroundImageUrl: 'https://example.com/map.png',
  center: { x: 512, y: 384 },
  scale: 0.05,
};

describe('serializeGwmap', () => {
  test('returns a valid JSON string', () => {
    const config = createMapConfig(validMeta);
    const json = serializeGwmap(config);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('serialized JSON contains the expected fields', () => {
    const config = createMapConfig(validMeta);
    const parsed = JSON.parse(serializeGwmap(config)) as Record<string, unknown>;
    expect(parsed['version']).toBe('1.0');
    expect(Array.isArray(parsed['pois'])).toBe(true);
    expect(parsed['graph']).toBeDefined();
  });
});

describe('parseGwmap — round-trip', () => {
  test('round-trips a minimal MapConfig losslessly', () => {
    const config = createMapConfig(validMeta);
    const roundTripped = parseGwmap(serializeGwmap(config));
    expect(roundTripped).toEqual(config);
  });

  test('round-trips a MapConfig with POIs and graph nodes losslessly', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 100, y: 200 } });
    const with2 = addNode(with1, { position: { x: 300, y: 200 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    const withEdge = addEdge(with2, { from: nodeA.id, to: nodeB.id });
    const withPoi = addPoi(withEdge, {
      label: 'Restaurant',
      position: { x: 100, y: 200 },
      tags: ['food'],
      nodeId: nodeA.id,
    });
    const result = parseGwmap(serializeGwmap(withPoi));
    expect(result).toEqual(withPoi);
  });

  test('round-trips the complexMap fixture losslessly', () => {
    const serialized = JSON.stringify(complexMap);
    const parsed = parseGwmap(serialized);
    expect(parsed.pois).toHaveLength(complexMap.pois.length);
    expect(parsed.graph.nodes).toHaveLength(complexMap.graph.nodes.length);
    expect(parsed.graph.edges).toHaveLength(complexMap.graph.edges.length);
  });
});

describe('parseGwmap — errors', () => {
  test('throws GWMAP_PARSE_ERROR for invalid JSON', () => {
    let err: (Error & { code?: string }) | undefined;
    try { parseGwmap('not valid json'); } catch (e) { err = e as Error & { code?: string }; }
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_PARSE_ERROR for valid JSON but wrong schema', () => {
    let err: (Error & { code?: string }) | undefined;
    try { parseGwmap('{"wrong": true}'); } catch (e) { err = e as Error & { code?: string }; }
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });

  test('throws GWMAP_VERSION_MISMATCH for unknown major version', () => {
    const badVersion = JSON.stringify({
      version: '2.0',
      map: validMeta,
      pois: [],
      graph: { nodes: [], edges: [] },
    });
    let err: (Error & { code?: string }) | undefined;
    try { parseGwmap(badVersion); } catch (e) { err = e as Error & { code?: string }; }
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_VERSION_MISMATCH);
  });

  test('throws GWMAP_PARSE_ERROR for empty string', () => {
    let err: (Error & { code?: string }) | undefined;
    try { parseGwmap(''); } catch (e) { err = e as Error & { code?: string }; }
    expect(err).toBeDefined();
    expect(err?.code).toBe(ErrorCode.GWMAP_PARSE_ERROR);
  });
});

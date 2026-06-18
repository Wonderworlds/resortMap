import { test, expect, describe } from 'bun:test';
import type { MapConfig } from '@resort-map/types';
import { buildAdjacencyList, nearestNode } from '../utils/graphUtils';

function makeConfig(
  nodes: { id: string; x: number; y: number }[],
  edges: { from: string; to: string; oneway?: boolean }[],
): MapConfig {
  return {
    version: '1.0',
    map: { backgroundImageUrl: 'https://x.com/m.png', center: { x: 0, y: 0 }, scale: 1 },
    pois: [],
    graph: {
      nodes: nodes.map(({ id, x, y }) => ({ id, position: { x, y } })),
      edges,
    },
  };
}

describe('buildAdjacencyList', () => {
  test('undirected edge adds both directions', () => {
    const config = makeConfig(
      [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 100, y: 0 }],
      [{ from: 'A', to: 'B' }],
    );
    const adj = buildAdjacencyList(config);
    expect(adj.get('A')).toEqual(['B']);
    expect(adj.get('B')).toEqual(['A']);
  });

  test('oneway: true only adds from → to direction', () => {
    const config = makeConfig(
      [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 100, y: 0 }],
      [{ from: 'A', to: 'B', oneway: true }],
    );
    const adj = buildAdjacencyList(config);
    expect(adj.get('A')).toEqual(['B']);
    expect(adj.get('B')).toEqual([]);
  });

  test('empty graph returns empty Map', () => {
    const config = makeConfig([], []);
    const adj = buildAdjacencyList(config);
    expect(adj.size).toBe(0);
  });
});

describe('nearestNode', () => {
  test('returns null for empty nodes array', () => {
    const config = makeConfig([], []);
    expect(nearestNode(config, { x: 50, y: 50 })).toBeNull();
  });

  test('returns closest node by pixel distance', () => {
    const config = makeConfig(
      [{ id: 'close', x: 10, y: 0 }, { id: 'far', x: 100, y: 0 }],
      [],
    );
    const result = nearestNode(config, { x: 0, y: 0 });
    expect(result?.id).toBe('close');
  });

  test('returns the only node when one exists', () => {
    const config = makeConfig([{ id: 'only', x: 500, y: 500 }], []);
    const result = nearestNode(config, { x: 0, y: 0 });
    expect(result?.id).toBe('only');
  });

  test('position equidistant from two nodes returns first encountered', () => {
    const config = makeConfig(
      [{ id: 'A', x: -5, y: 0 }, { id: 'B', x: 5, y: 0 }],
      [],
    );
    const result = nearestNode(config, { x: 0, y: 0 });
    expect(result?.id).toBe('A');
  });
});

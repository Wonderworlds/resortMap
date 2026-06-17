import { test, expect, describe } from 'bun:test';
import {
  createMapConfig,
  addPoi,
  removePoi,
  updatePoi,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
} from '../mapConfig.ts';
import type { MapMeta } from '@resort-map/types';

const validMeta: MapMeta = {
  backgroundImageUrl: 'https://example.com/map.png',
  center: { x: 512, y: 384 },
  scale: 0.05,
};

describe('createMapConfig', () => {
  test('returns MapConfig with version 1.0 and empty pois/graph', () => {
    const config = createMapConfig(validMeta);
    expect(config.version).toBe('1.0');
    expect(config.map).toBe(validMeta);
    expect(config.pois).toHaveLength(0);
    expect(config.graph.nodes).toHaveLength(0);
    expect(config.graph.edges).toHaveLength(0);
  });
});

describe('addPoi', () => {
  test('returns new config with POI appended and generated id', () => {
    const config = createMapConfig(validMeta);
    const result = addPoi(config, { label: 'Restaurant', position: { x: 100, y: 200 }, tags: ['food'] });
    expect(result.pois).toHaveLength(1);
    expect(result.pois[0]!.label).toBe('Restaurant');
    expect(typeof result.pois[0]!.id).toBe('string');
    expect(result.pois[0]!.id.length).toBeGreaterThan(0);
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    addPoi(config, { label: 'Test', position: { x: 0, y: 0 }, tags: [] });
    expect(config.pois).toHaveLength(0);
  });

  test('two addPoi calls generate distinct ids', () => {
    const config = createMapConfig(validMeta);
    const r1 = addPoi(config, { label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const r2 = addPoi(config, { label: 'B', position: { x: 0, y: 0 }, tags: [] });
    expect(r1.pois[0]!.id).not.toBe(r2.pois[0]!.id);
  });

  test('returned config is a new object (immutability)', () => {
    const config = createMapConfig(validMeta);
    const result = addPoi(config, { label: 'Test', position: { x: 0, y: 0 }, tags: [] });
    expect(result).not.toBe(config);
    expect(result.pois).not.toBe(config.pois);
  });
});

describe('removePoi', () => {
  test('removes the matching POI', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = withPoi.pois[0]!.id;
    const result = removePoi(withPoi, poiId);
    expect(result.pois).toHaveLength(0);
  });

  test('leaves other POIs intact', () => {
    const config = createMapConfig(validMeta);
    const with1 = addPoi(config, { label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const with2 = addPoi(with1, { label: 'B', position: { x: 10, y: 10 }, tags: [] });
    const idA = with2.pois[0]!.id;
    const result = removePoi(with2, idA);
    expect(result.pois).toHaveLength(1);
    expect(result.pois[0]!.label).toBe('B');
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = withPoi.pois[0]!.id;
    removePoi(withPoi, poiId);
    expect(withPoi.pois).toHaveLength(1);
  });

  test('returned config is a new object (immutability)', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = withPoi.pois[0]!.id;
    const result = removePoi(withPoi, poiId);
    expect(result).not.toBe(withPoi);
    expect(result.pois).not.toBe(withPoi.pois);
  });
});

describe('updatePoi', () => {
  test('patches only the specified fields', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'Original', position: { x: 0, y: 0 }, tags: ['a'] });
    const poiId = withPoi.pois[0]!.id;
    const result = updatePoi(withPoi, poiId, { label: 'Updated' });
    expect(result.pois[0]!.label).toBe('Updated');
    expect(result.pois[0]!.tags).toEqual(['a']);
    expect(result.pois[0]!.position).toEqual({ x: 0, y: 0 });
    expect(result.pois[0]!.id).toBe(poiId);
  });

  test('does not mutate original config', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'Orig', position: { x: 0, y: 0 }, tags: [] });
    const poiId = withPoi.pois[0]!.id;
    updatePoi(withPoi, poiId, { label: 'New' });
    expect(withPoi.pois[0]!.label).toBe('Orig');
  });

  test('returned config is a new object (immutability)', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'Orig', position: { x: 0, y: 0 }, tags: [] });
    const poiId = withPoi.pois[0]!.id;
    const result = updatePoi(withPoi, poiId, { label: 'New' });
    expect(result).not.toBe(withPoi);
    expect(result.pois).not.toBe(withPoi.pois);
  });
});

describe('addNode', () => {
  test('appends node with generated id', () => {
    const config = createMapConfig(validMeta);
    const result = addNode(config, { position: { x: 50, y: 100 } });
    expect(result.graph.nodes).toHaveLength(1);
    expect(typeof result.graph.nodes[0]!.id).toBe('string');
    expect(result.graph.nodes[0]!.position).toEqual({ x: 50, y: 100 });
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    addNode(config, { position: { x: 0, y: 0 } });
    expect(config.graph.nodes).toHaveLength(0);
  });

  test('returned config is a new object (immutability)', () => {
    const config = createMapConfig(validMeta);
    const result = addNode(config, { position: { x: 0, y: 0 } });
    expect(result).not.toBe(config);
    expect(result.graph).not.toBe(config.graph);
    expect(result.graph.nodes).not.toBe(config.graph.nodes);
  });
});

describe('addEdge', () => {
  test('appends edge to the graph', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    const result = addEdge(with2, { from: nodeA.id, to: nodeB.id });
    expect(result.graph.edges).toHaveLength(1);
    expect(result.graph.edges[0]!.from).toBe(nodeA.id);
    expect(result.graph.edges[0]!.to).toBe(nodeB.id);
  });

  test('supports optional oneway field', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    const result = addEdge(with2, { from: nodeA.id, to: nodeB.id, oneway: true });
    expect(result.graph.edges[0]!.oneway).toBe(true);
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    addEdge(with2, { from: nodeA.id, to: nodeB.id });
    expect(with2.graph.edges).toHaveLength(0);
  });
});

describe('removeNode', () => {
  test('removes the node and all edges referencing it', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const with3 = addNode(with2, { position: { x: 20, y: 20 } });
    const nodeA = with3.graph.nodes[0]!;
    const nodeB = with3.graph.nodes[1]!;
    const nodeC = with3.graph.nodes[2]!;
    const withE1 = addEdge(with3, { from: nodeA.id, to: nodeB.id });
    const withE2 = addEdge(withE1, { from: nodeB.id, to: nodeC.id });
    const result = removeNode(withE2, nodeB.id);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toHaveLength(0);
  });

  test('leaves unrelated nodes and edges untouched', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const with3 = addNode(with2, { position: { x: 20, y: 20 } });
    const nodeA = with3.graph.nodes[0]!;
    const nodeB = with3.graph.nodes[1]!;
    const nodeC = with3.graph.nodes[2]!;
    const withEdge = addEdge(with3, { from: nodeB.id, to: nodeC.id });
    const result = removeNode(withEdge, nodeA.id);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toHaveLength(1);
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const nodeA = with1.graph.nodes[0]!;
    removeNode(with1, nodeA.id);
    expect(with1.graph.nodes).toHaveLength(1);
  });
});

describe('removeEdge', () => {
  test('removes the specific edge, both nodes remain', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    const withEdge = addEdge(with2, { from: nodeA.id, to: nodeB.id });
    const result = removeEdge(withEdge, nodeA.id, nodeB.id);
    expect(result.graph.edges).toHaveLength(0);
    expect(result.graph.nodes).toHaveLength(2);
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    const withEdge = addEdge(with2, { from: nodeA.id, to: nodeB.id });
    removeEdge(withEdge, nodeA.id, nodeB.id);
    expect(withEdge.graph.edges).toHaveLength(1);
  });

  test('returned config is a new object (immutability)', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const nodeA = with2.graph.nodes[0]!;
    const nodeB = with2.graph.nodes[1]!;
    const withEdge = addEdge(with2, { from: nodeA.id, to: nodeB.id });
    const result = removeEdge(withEdge, nodeA.id, nodeB.id);
    expect(result).not.toBe(withEdge);
    expect(result.graph.edges).not.toBe(withEdge.graph.edges);
  });

  test('only removes matching edge, leaves other edges intact', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 0, y: 0 } });
    const with2 = addNode(with1, { position: { x: 10, y: 10 } });
    const with3 = addNode(with2, { position: { x: 20, y: 20 } });
    const nodeA = with3.graph.nodes[0]!;
    const nodeB = with3.graph.nodes[1]!;
    const nodeC = with3.graph.nodes[2]!;
    const withE1 = addEdge(with3, { from: nodeA.id, to: nodeB.id });
    const withE2 = addEdge(withE1, { from: nodeB.id, to: nodeC.id });
    const result = removeEdge(withE2, nodeA.id, nodeB.id);
    expect(result.graph.edges).toHaveLength(1);
    expect(result.graph.edges[0]!.from).toBe(nodeB.id);
    expect(result.graph.edges[0]!.to).toBe(nodeC.id);
  });
});

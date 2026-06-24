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
  updateNode,
  updateNodePosition,
  movePoiWithNode,
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

describe('addPoi — auto node association', () => {
  test('creates a new node at POI position and wires nodeId when no nodes exist', () => {
    const config = createMapConfig(validMeta);
    const result = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    expect(result.graph.nodes).toHaveLength(1);
    expect(result.graph.nodes[0]!.position).toEqual({ x: 100, y: 200 });
    expect(result.pois[0]!.nodeId).toBe(result.graph.nodes[0]!.id);
  });

  test('snaps to existing node within default radius and does not create a new node', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    // 5px away — within default snap radius (12)
    const result = addPoi(withNode, { label: 'B', position: { x: 105, y: 200 }, tags: [] });
    expect(result.graph.nodes).toHaveLength(1);
    expect(result.pois[0]!.nodeId).toBe(nodeId);
  });

  test('creates a new node when nearest node is outside snap radius', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    // 20px away — beyond default snap radius (12)
    const result = addPoi(withNode, { label: 'C', position: { x: 120, y: 200 }, tags: [] });
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.nodes[1]!.position).toEqual({ x: 120, y: 200 });
    expect(result.pois[0]!.nodeId).toBe(result.graph.nodes[1]!.id);
  });

  test('snaps to the closest node when multiple nodes are within radius', () => {
    const config = createMapConfig(validMeta);
    const with1 = addNode(config, { position: { x: 100, y: 200 } }); // 10px from POI
    const with2 = addNode(with1, { position: { x: 108, y: 200 } }); // 2px from POI — closer
    const node2Id = with2.graph.nodes[1]!.id;
    // POI at x=110: node1 dist=10, node2 dist=2
    const result = addPoi(with2, { label: 'D', position: { x: 110, y: 200 }, tags: [] });
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.pois[0]!.nodeId).toBe(node2Id);
  });

  test('respects custom snapRadius parameter — no snap when outside custom radius', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    // 8px away, custom snapRadius=5 — outside custom radius
    const result = addPoi(withNode, { label: 'E', position: { x: 108, y: 200 }, tags: [] }, 5);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.pois[0]!.nodeId).toBe(result.graph.nodes[1]!.id);
  });

  test('respects custom snapRadius parameter — snaps when within custom radius', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    // 3px away, custom snapRadius=5 — within custom radius
    const result = addPoi(withNode, { label: 'F', position: { x: 103, y: 200 }, tags: [] }, 5);
    expect(result.graph.nodes).toHaveLength(1);
    expect(result.pois[0]!.nodeId).toBe(nodeId);
  });

  test('does not mutate original config when creating a new node', () => {
    const config = createMapConfig(validMeta);
    addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    expect(config.pois).toHaveLength(0);
    expect(config.graph.nodes).toHaveLength(0);
  });

  test('returned config is a new object (both pois and graph updated)', () => {
    const config = createMapConfig(validMeta);
    const result = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    expect(result).not.toBe(config);
    expect(result.pois).not.toBe(config.pois);
    expect(result.graph.nodes).not.toBe(config.graph.nodes);
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

describe('updateNode', () => {
  test('patches position on an existing node', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 10, y: 20 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    const result = updateNode(withNode, nodeId, { position: { x: 99, y: 88 } });
    expect(result.graph.nodes[0]!.position).toEqual({ x: 99, y: 88 });
  });

  test('patches locked field on an existing node', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 10, y: 20 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    const locked = updateNode(withNode, nodeId, { locked: true });
    expect(locked.graph.nodes[0]!.locked).toBe(true);
    const unlocked = updateNode(locked, nodeId, { locked: false });
    expect(unlocked.graph.nodes[0]!.locked).toBe(false);
  });

  test('returns same config when nodeId not found', () => {
    const config = createMapConfig(validMeta);
    const result = updateNode(config, 'nonexistent', { position: { x: 0, y: 0 } });
    expect(result.graph.nodes).toHaveLength(0);
  });

  test('only patches targeted node, others unchanged', () => {
    const config = createMapConfig(validMeta);
    const with2 = addNode(addNode(config, { position: { x: 1, y: 1 } }), { position: { x: 2, y: 2 } });
    const idA = with2.graph.nodes[0]!.id;
    const idB = with2.graph.nodes[1]!.id;
    const result = updateNode(with2, idA, { locked: true });
    expect(result.graph.nodes.find(n => n.id === idA)!.locked).toBe(true);
    expect(result.graph.nodes.find(n => n.id === idB)!.locked).toBeUndefined();
  });

  test('does not mutate original config', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 10, y: 20 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    updateNode(withNode, nodeId, { locked: true });
    expect(withNode.graph.nodes[0]!.locked).toBeUndefined();
  });
});

describe('updateNodePosition', () => {
  test('updates the position of an existing node', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    const result = updateNodePosition(withNode, nodeId, { x: 50, y: 75 });
    expect(result.graph.nodes[0]!.position).toEqual({ x: 50, y: 75 });
  });

  test('returns same config when nodeId not found', () => {
    const config = createMapConfig(validMeta);
    const result = updateNodePosition(config, 'nonexistent', { x: 0, y: 0 });
    expect(result.graph.nodes).toHaveLength(0);
  });

  test('does not mutate the original config', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    updateNodePosition(withNode, nodeId, { x: 50, y: 75 });
    expect(withNode.graph.nodes[0]!.position).toEqual({ x: 100, y: 200 });
  });

  test('returned config is a new object', () => {
    const config = createMapConfig(validMeta);
    const withNode = addNode(config, { position: { x: 100, y: 200 } });
    const nodeId = withNode.graph.nodes[0]!.id;
    const result = updateNodePosition(withNode, nodeId, { x: 50, y: 75 });
    expect(result).not.toBe(withNode);
    expect(result.graph.nodes).not.toBe(withNode.graph.nodes);
  });

  test('only updates the targeted node, others unchanged', () => {
    const config = createMapConfig(validMeta);
    const with2 = addNode(addNode(config, { position: { x: 10, y: 20 } }), { position: { x: 30, y: 40 } });
    const nodeAId = with2.graph.nodes[0]!.id;
    const nodeBId = with2.graph.nodes[1]!.id;
    const result = updateNodePosition(with2, nodeAId, { x: 99, y: 99 });
    expect(result.graph.nodes.find(n => n.id === nodeAId)!.position).toEqual({ x: 99, y: 99 });
    expect(result.graph.nodes.find(n => n.id === nodeBId)!.position).toEqual({ x: 30, y: 40 });
  });
});

describe('movePoiWithNode', () => {
  test('updates both POI position and its associated node position', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    const poi = withPoi.pois[0]!;
    const node = withPoi.graph.nodes[0]!;
    expect(poi.nodeId).toBe(node.id);

    const result = movePoiWithNode(withPoi, poi.id, { x: 50, y: 75 });
    expect(result.pois[0]!.position).toEqual({ x: 50, y: 75 });
    expect(result.graph.nodes[0]!.position).toEqual({ x: 50, y: 75 });
  });

  test('still updates POI position when it has no nodeId', () => {
    const config = createMapConfig(validMeta);
    // Manually create a POI without nodeId by patching updatePoi after addPoi
    const withPoi = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    const poi = withPoi.pois[0]!;
    // Strip nodeId
    const stripped = updatePoi(withPoi, poi.id, { nodeId: undefined });
    const result = movePoiWithNode(stripped, poi.id, { x: 50, y: 75 });
    expect(result.pois[0]!.position).toEqual({ x: 50, y: 75 });
    // No crash, node count unchanged
    expect(result.graph.nodes).toHaveLength(withPoi.graph.nodes.length);
  });

  test('returns same config when poiId not found', () => {
    const config = createMapConfig(validMeta);
    const result = movePoiWithNode(config, 'nonexistent', { x: 0, y: 0 });
    expect(result).toBe(config);
  });

  test('does not affect other POIs', () => {
    const config = createMapConfig(validMeta);
    const with1 = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    const with2 = addPoi(with1, { label: 'B', position: { x: 300, y: 400 }, tags: [] });
    const poi1Id = with2.pois[0]!.id;
    const poi2Id = with2.pois[1]!.id;

    const result = movePoiWithNode(with2, poi1Id, { x: 10, y: 10 });
    expect(result.pois.find(p => p.id === poi1Id)!.position).toEqual({ x: 10, y: 10 });
    expect(result.pois.find(p => p.id === poi2Id)!.position).toEqual({ x: 300, y: 400 });
  });

  test('edges referencing the moved node are unaffected (edges use node id, not position)', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    const poiNodeId = withPoi.pois[0]!.nodeId!;
    const withStreet = addNode(withPoi, { position: { x: 300, y: 400 } });
    const streetNodeId = withStreet.graph.nodes[1]!.id;
    const withEdge = addEdge(withStreet, { from: poiNodeId, to: streetNodeId });

    const result = movePoiWithNode(withEdge, withEdge.pois[0]!.id, { x: 50, y: 50 });
    // Edge still references same node ids
    expect(result.graph.edges[0]!.from).toBe(poiNodeId);
    expect(result.graph.edges[0]!.to).toBe(streetNodeId);
    // Node position is now updated
    expect(result.graph.nodes.find(n => n.id === poiNodeId)!.position).toEqual({ x: 50, y: 50 });
  });

  test('does not mutate original config', () => {
    const config = createMapConfig(validMeta);
    const withPoi = addPoi(config, { label: 'A', position: { x: 100, y: 200 }, tags: [] });
    const poi = withPoi.pois[0]!;
    movePoiWithNode(withPoi, poi.id, { x: 50, y: 75 });
    expect(withPoi.pois[0]!.position).toEqual({ x: 100, y: 200 });
    expect(withPoi.graph.nodes[0]!.position).toEqual({ x: 100, y: 200 });
  });
});

import { test, expect, describe, beforeEach } from 'bun:test';
import { useMapStore } from '../store/mapStore';
import type { MapMeta } from '@resort-map/types';

const validMeta: MapMeta = {
  backgroundImageUrl: 'https://example.com/map.png',
  center: { x: 512, y: 384 },
  scale: 0.05,
};

beforeEach(() => {
  useMapStore.setState({
    mapConfig: null,
    activeTool: 'select',
    selectedItemId: null,
    undoStack: [],
  });
});

describe('initial state', () => {
  test('has correct shape', () => {
    const s = useMapStore.getState();
    expect(s.mapConfig).toBeNull();
    expect(s.activeTool).toBe('select');
    expect(s.selectedItemId).toBeNull();
    expect(s.undoStack).toHaveLength(0);
  });
});

describe('setActiveTool', () => {
  test('updates to placePoi', () => {
    useMapStore.getState().setActiveTool('placePoi');
    expect(useMapStore.getState().activeTool).toBe('placePoi');
  });

  test('updates to drawStreet', () => {
    useMapStore.getState().setActiveTool('drawStreet');
    expect(useMapStore.getState().activeTool).toBe('drawStreet');
  });

  test('updates to setScale', () => {
    useMapStore.getState().setActiveTool('setScale');
    expect(useMapStore.getState().activeTool).toBe('setScale');
  });

  test('updates back to select', () => {
    useMapStore.getState().setActiveTool('placePoi');
    useMapStore.getState().setActiveTool('select');
    expect(useMapStore.getState().activeTool).toBe('select');
  });
});

describe('initMap', () => {
  test('creates MapConfig from meta', () => {
    useMapStore.getState().initMap(validMeta);
    const s = useMapStore.getState();
    expect(s.mapConfig).not.toBeNull();
    expect(s.mapConfig?.version).toBe('1.0');
    expect(s.mapConfig?.pois).toHaveLength(0);
    expect(s.mapConfig?.graph.nodes).toHaveLength(0);
    expect(s.mapConfig?.graph.edges).toHaveLength(0);
  });

  test('clears undoStack on init', () => {
    useMapStore.setState({ undoStack: [{ version: '1.0', map: validMeta, pois: [], graph: { nodes: [], edges: [] } }] });
    useMapStore.getState().initMap(validMeta);
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });

  test('clears selectedItemId on init', () => {
    useMapStore.setState({ selectedItemId: 'some-id' });
    useMapStore.getState().initMap(validMeta);
    expect(useMapStore.getState().selectedItemId).toBeNull();
  });

  test('does NOT push to undoStack on init', () => {
    useMapStore.getState().initMap(validMeta);
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });
});

describe('addPoi', () => {
  test('does nothing when mapConfig is null', () => {
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    expect(useMapStore.getState().mapConfig).toBeNull();
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });

  test('adds a POI and pushes previous config to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    const before = useMapStore.getState().mapConfig!;
    useMapStore.getState().addPoi({ label: 'Restaurant', position: { x: 100, y: 200 }, tags: ['food'] });
    const s = useMapStore.getState();
    expect(s.mapConfig?.pois).toHaveLength(1);
    expect(s.mapConfig?.pois[0]!.label).toBe('Restaurant');
    expect(s.undoStack).toHaveLength(1);
    expect(s.undoStack[0]).toBe(before);
  });
});

describe('removePoi', () => {
  test('removes a POI and pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.getState().removePoi(poiId);
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(0);
    expect(useMapStore.getState().undoStack).toHaveLength(2);
  });

  test('clears selectedItemId when the removed POI was selected', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.setState({ selectedItemId: poiId });
    useMapStore.getState().removePoi(poiId);
    expect(useMapStore.getState().selectedItemId).toBeNull();
  });

  test('preserves selectedItemId when a different POI is removed', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    useMapStore.getState().addPoi({ label: 'B', position: { x: 10, y: 10 }, tags: [] });
    const pois = useMapStore.getState().mapConfig!.pois;
    const idA = pois[0]!.id;
    const idB = pois[1]!.id;
    useMapStore.setState({ selectedItemId: idB });
    useMapStore.getState().removePoi(idA);
    expect(useMapStore.getState().selectedItemId).toBe(idB);
  });
});

describe('updatePoi', () => {
  test('patches POI fields and pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'Original', position: { x: 0, y: 0 }, tags: ['a'] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.getState().updatePoi(poiId, { label: 'Updated' });
    expect(useMapStore.getState().mapConfig?.pois[0]!.label).toBe('Updated');
    expect(useMapStore.getState().mapConfig?.pois[0]!.tags).toEqual(['a']);
    expect(useMapStore.getState().undoStack).toHaveLength(2);
  });
});

describe('undo', () => {
  test('does nothing when undoStack is empty and mapConfig is null', () => {
    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig).toBeNull();
  });

  test('does nothing when undoStack is empty after initMap', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().undo();
    const s = useMapStore.getState();
    expect(s.mapConfig?.pois).toHaveLength(0);
    expect(s.undoStack).toHaveLength(0);
  });

  test('pops undoStack and restores previous mapConfig', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(1);
    expect(useMapStore.getState().undoStack).toHaveLength(1);

    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(0);
    expect(useMapStore.getState().undoStack).toHaveLength(0);
  });

  test('multiple undos work sequentially', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addPoi({ label: 'A', position: { x: 0, y: 0 }, tags: [] });
    useMapStore.getState().addPoi({ label: 'B', position: { x: 10, y: 10 }, tags: [] });
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(2);

    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(1);

    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig?.pois).toHaveLength(0);
  });
});

describe('addNode / removeNode', () => {
  test('addNode pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 50, y: 100 } });
    expect(useMapStore.getState().mapConfig?.graph.nodes).toHaveLength(1);
    expect(useMapStore.getState().undoStack).toHaveLength(1);
  });

  test('removeNode removes node from graph', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    const nodeId = useMapStore.getState().mapConfig!.graph.nodes[0]!.id;
    useMapStore.getState().removeNode(nodeId);
    expect(useMapStore.getState().mapConfig?.graph.nodes).toHaveLength(0);
  });

  test('removeNode clears selectedItemId when node was selected', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    const nodeId = useMapStore.getState().mapConfig!.graph.nodes[0]!.id;
    useMapStore.setState({ selectedItemId: nodeId });
    useMapStore.getState().removeNode(nodeId);
    expect(useMapStore.getState().selectedItemId).toBeNull();
  });
});

describe('addEdge / removeEdge', () => {
  function setupTwoNodes() {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    useMapStore.getState().addNode({ position: { x: 10, y: 10 } });
    const nodes = useMapStore.getState().mapConfig!.graph.nodes;
    return { nodeA: nodes[0]!, nodeB: nodes[1]! };
  }

  test('addEdge appends edge and pushes to undoStack', () => {
    const { nodeA, nodeB } = setupTwoNodes();
    useMapStore.getState().addEdge({ from: nodeA.id, to: nodeB.id });
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(1);
    expect(useMapStore.getState().undoStack.length).toBeGreaterThan(0);
  });

  test('removeEdge removes edge and clears selectedItemId when edge "{from}:{to}" was selected', () => {
    const { nodeA, nodeB } = setupTwoNodes();
    useMapStore.getState().addEdge({ from: nodeA.id, to: nodeB.id });
    const edgeKey = `${nodeA.id}:${nodeB.id}`;
    useMapStore.setState({ selectedItemId: edgeKey });
    useMapStore.getState().removeEdge(nodeA.id, nodeB.id);
    expect(useMapStore.getState().selectedItemId).toBeNull();
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(0);
  });
});

describe('removeNode — stale edge selection fix', () => {
  function setupTwoNodesAndEdge() {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().addNode({ position: { x: 0, y: 0 } });
    useMapStore.getState().addNode({ position: { x: 50, y: 50 } });
    const nodes = useMapStore.getState().mapConfig!.graph.nodes;
    const nodeA = nodes[0]!;
    const nodeB = nodes[1]!;
    useMapStore.getState().addEdge({ from: nodeA.id, to: nodeB.id });
    return { nodeA, nodeB };
  }

  test('clears selectedItemId when removed node is the "from" end of selected edge', () => {
    const { nodeA, nodeB } = setupTwoNodesAndEdge();
    const edgeKey = `${nodeA.id}:${nodeB.id}`;
    useMapStore.setState({ selectedItemId: edgeKey });
    useMapStore.getState().removeNode(nodeA.id);
    expect(useMapStore.getState().selectedItemId).toBeNull();
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(0);
  });

  test('clears selectedItemId when removed node is the "to" end of selected edge', () => {
    const { nodeA, nodeB } = setupTwoNodesAndEdge();
    const edgeKey = `${nodeA.id}:${nodeB.id}`;
    useMapStore.setState({ selectedItemId: edgeKey });
    useMapStore.getState().removeNode(nodeB.id);
    expect(useMapStore.getState().selectedItemId).toBeNull();
    expect(useMapStore.getState().mapConfig?.graph.edges).toHaveLength(0);
  });

  test('preserves selectedItemId of an unrelated element when node is removed', () => {
    const { nodeA } = setupTwoNodesAndEdge();
    useMapStore.getState().addPoi({ label: 'X', position: { x: 5, y: 5 }, tags: [] });
    const poiId = useMapStore.getState().mapConfig!.pois[0]!.id;
    useMapStore.setState({ selectedItemId: poiId });
    useMapStore.getState().removeNode(nodeA.id);
    expect(useMapStore.getState().selectedItemId).toBe(poiId);
  });
});

describe('undoStack cap (50 entries)', () => {
  test('undoStack stays at 50 after 55 mutations', () => {
    useMapStore.getState().initMap(validMeta);
    for (let i = 0; i < 55; i++) {
      useMapStore.getState().addPoi({ label: `P${i}`, position: { x: i, y: i }, tags: [] });
    }
    expect(useMapStore.getState().undoStack).toHaveLength(50);
  });
});

describe('updateMapMeta', () => {
  test('updates backgroundImageUrl on existing mapConfig', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().updateMapMeta({ backgroundImageUrl: 'http://new.jpg' });
    expect(useMapStore.getState().mapConfig!.map.backgroundImageUrl).toBe('http://new.jpg');
  });

  test('updates scale and pushes to undoStack', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().updateMapMeta({ scale: 0.5 });
    expect(useMapStore.getState().mapConfig!.map.scale).toBe(0.5);
    expect(useMapStore.getState().undoStack.length).toBe(1);
  });

  test('updates center', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().updateMapMeta({ center: { x: 400, y: 300 } });
    expect(useMapStore.getState().mapConfig!.map.center).toEqual({ x: 400, y: 300 });
  });

  test('undo after updateMapMeta restores prior values', () => {
    useMapStore.getState().initMap(validMeta);
    useMapStore.getState().updateMapMeta({ scale: 2 });
    useMapStore.getState().undo();
    expect(useMapStore.getState().mapConfig!.map.scale).toBe(validMeta.scale);
  });

  test('does nothing when mapConfig is null', () => {
    useMapStore.getState().updateMapMeta({ backgroundImageUrl: 'http://x.jpg' });
    expect(useMapStore.getState().mapConfig).toBeNull();
    expect(useMapStore.getState().undoStack.length).toBe(0);
  });
});

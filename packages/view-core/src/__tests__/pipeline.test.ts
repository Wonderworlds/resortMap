import { test, expect, describe } from 'bun:test';
import { createMapConfig, addPoi, addNode, addEdge, serializeGwmap } from '@resort-map/builder-core';
import { parseGwmap, computeRoute, filterPois } from '@resort-map/view-core';

// Build a MapConfig using builder-core authoring APIs
// Nodes must be added before POIs that reference them via nodeId
let config = createMapConfig({
  backgroundImageUrl: 'https://example.com/resort.png',
  center: { x: 512, y: 400 },
  scale: 0.5,
});

config = addNode(config, { position: { x: 100, y: 200 } });
const nodeA = config.graph.nodes.at(-1)!;

config = addNode(config, { position: { x: 500, y: 200 } });
const nodeB = config.graph.nodes.at(-1)!;

config = addEdge(config, { from: nodeA.id, to: nodeB.id });

config = addPoi(config, { label: 'Entrance', position: { x: 100, y: 200 }, tags: ['info'], nodeId: nodeA.id });
const poiA = config.pois.at(-1)!;

config = addPoi(config, { label: 'Restaurant', position: { x: 500, y: 200 }, tags: ['food'], nodeId: nodeB.id });
const poiB = config.pois.at(-1)!;

config = addPoi(config, { label: 'Pool', position: { x: 300, y: 400 }, tags: ['leisure'] });

const serialized = serializeGwmap(config);
const parsed = parseGwmap(serialized);

describe('End-to-end pipeline: builder-core → view-core', () => {
  test('round-trip: serializeGwmap → parseGwmap deep-equals original config', () => {
    expect(parsed).toEqual(config);
  });

  test('computeRoute returns a valid route between two connected POIs', () => {
    const route = computeRoute(parsed, poiA.id, poiB.id);
    expect(route).not.toBeNull();
    expect(route!.nodes.length).toBeGreaterThan(0);
    expect(route!.distanceMeters).toBeGreaterThan(0);
    expect(route!.walkTimeSeconds).toBeGreaterThan(0);
  });

  test('filterPois with tag filter returns only matching POIs', () => {
    const result = filterPois(parsed, { tags: ['food'] });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(poiB.id);
  });

  test('filterPois with empty options returns all POIs', () => {
    const result = filterPois(parsed, {});
    expect(result).toHaveLength(3);
  });
});

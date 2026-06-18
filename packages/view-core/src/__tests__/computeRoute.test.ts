import { test, expect, describe } from 'bun:test';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { computeRoute } from '../computeRoute';

const config = complexMap as unknown as MapConfig;

function makeDisconnectedConfig(): MapConfig {
  return {
    version: '1.0',
    map: { backgroundImageUrl: 'https://x.com/m.png', center: { x: 0, y: 0 }, scale: 1 },
    pois: [],
    graph: {
      nodes: [
        { id: 'A', position: { x: 0, y: 0 } },
        { id: 'B', position: { x: 100, y: 0 } },
      ],
      edges: [],
    },
  };
}

describe('computeRoute', () => {
  test('Restaurant → Pool: correct path, distance, and walk time', () => {
    const route = computeRoute(config, 'poi-001', 'poi-002');
    expect(route).not.toBeNull();
    if (!route) return;
    expect(route.nodes.map((n) => n.id)).toEqual([
      'node-001', 'node-002', 'node-003', 'node-005', 'node-006',
    ]);
    expect(route.distanceMeters).toBe(400);
    expect(route.walkTimeSeconds).toBe(286);
  });

  test('Gym → Pool: shorter path', () => {
    const route = computeRoute(config, 'poi-003', 'poi-002');
    expect(route).not.toBeNull();
    if (!route) return;
    expect(route.nodes.map((n) => n.id)).toEqual([
      'node-004', 'node-003', 'node-005', 'node-006',
    ]);
    expect(route.distanceMeters).toBe(300);
    expect(route.walkTimeSeconds).toBe(214);
  });

  test('Position input snaps to nearest node and routes correctly', () => {
    // position very close to node-001 (100, 300)
    const route = computeRoute(config, { x: 102, y: 301 }, 'poi-002');
    expect(route).not.toBeNull();
    if (!route) return;
    expect(route.nodes.map((n) => n.id)).toEqual([
      'node-001', 'node-002', 'node-003', 'node-005', 'node-006',
    ]);
  });

  test('POI without nodeId snaps to nearest node', () => {
    const configWithPoiNoNodeId: MapConfig = {
      ...config,
      pois: [
        ...config.pois,
        {
          id: 'poi-snap',
          label: 'Snap POI',
          position: { x: 105, y: 300 },  // closest to node-001
          tags: [],
          // no nodeId
        },
      ],
    };
    const route = computeRoute(configWithPoiNoNodeId, 'poi-snap', 'poi-002');
    expect(route).not.toBeNull();
    if (!route) return;
    // Should route from node-001 (nearest to 105,300) to node-006
    expect(route.nodes[0]?.id).toBe('node-001');
    expect(route.nodes[route.nodes.length - 1]?.id).toBe('node-006');
  });

  test('no path in disconnected graph returns null', () => {
    const disconnected = makeDisconnectedConfig();
    const route = computeRoute(disconnected, { x: 0, y: 0 }, { x: 100, y: 0 });
    expect(route).toBeNull();
  });

  test('same POI as from and to returns zero-distance self-route', () => {
    const route = computeRoute(config, 'poi-001', 'poi-001');
    expect(route).not.toBeNull();
    if (!route) return;
    expect(route.nodes).toHaveLength(1);
    expect(route.nodes[0]?.id).toBe('node-001');
    expect(route.distanceMeters).toBe(0);
    expect(route.walkTimeSeconds).toBe(0);
  });

  test('deterministic: same inputs return deep-equal results', () => {
    const route1 = computeRoute(config, 'poi-001', 'poi-002');
    const route2 = computeRoute(config, 'poi-001', 'poi-002');
    expect(route1).toEqual(route2);
  });
});

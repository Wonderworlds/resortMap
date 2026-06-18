import { test, expect, describe } from 'bun:test';
import { ErrorCode } from '../errors';
import type {
  Position,
  MapMeta,
  POI,
  GraphNode,
  GraphEdge,
  MapConfig,
  Route,
} from '../schema.ts';
import type {
  ViewerStatus,
  PoiFilterOptions,
  ViewerState,
  ViewerAction,
} from '../viewerTypes.ts';

describe('ErrorCode', () => {
  test('has exactly the required keys', () => {
    const expectedKeys = [
      'GWMAP_PARSE_ERROR',
      'GWMAP_VERSION_MISMATCH',
      'ROUTE_NOT_FOUND',
      'INVALID_POSITION',
      'INVALID_NODE_REF',
    ];
    expect(Object.keys(ErrorCode).sort()).toEqual(expectedKeys.sort());
  });

  test('values are string literals matching their keys', () => {
    for (const key of Object.keys(ErrorCode) as (keyof typeof ErrorCode)[]) {
      expect(ErrorCode[key]).toBe(key);
    }
  });

  test('is frozen / not an enum (as const)', () => {
    expect(typeof ErrorCode).toBe('object');
    expect(ErrorCode.GWMAP_PARSE_ERROR).toBe('GWMAP_PARSE_ERROR');
    expect(ErrorCode.GWMAP_VERSION_MISMATCH).toBe('GWMAP_VERSION_MISMATCH');
    expect(ErrorCode.ROUTE_NOT_FOUND).toBe('ROUTE_NOT_FOUND');
    expect(ErrorCode.INVALID_POSITION).toBe('INVALID_POSITION');
    expect(ErrorCode.INVALID_NODE_REF).toBe('INVALID_NODE_REF');
  });
});

describe('schema types (compile-time validation)', () => {
  test('Position shape is assignable', () => {
    const pos: Position = { x: 10, y: 20 };
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(20);
  });

  test('MapMeta shape is assignable', () => {
    const meta: MapMeta = {
      backgroundImageUrl: 'https://example.com/map.png',
      center: { x: 512, y: 384 },
      scale: 0.05,
    };
    expect(meta.scale).toBe(0.05);
  });

  test('POI shape is assignable with optional fields', () => {
    const poi: POI = {
      id: 'poi-1',
      label: 'Restaurant',
      position: { x: 100, y: 200 },
      tags: ['restaurant'],
    };
    expect(poi.icon).toBeUndefined();
    expect(poi.nodeId).toBeUndefined();
    expect(poi.meta).toBeUndefined();
  });

  test('POI accepts optional meta as Record<string, unknown>', () => {
    const poi: POI = {
      id: 'poi-2',
      label: 'Pool',
      position: { x: 50, y: 50 },
      tags: ['leisure'],
      meta: { capacity: 30, outdoor: true },
    };
    expect(poi.meta?.['capacity']).toBe(30);
  });

  test('GraphNode shape is assignable', () => {
    const node: GraphNode = { id: 'node-1', position: { x: 0, y: 0 } };
    expect(node.id).toBe('node-1');
  });

  test('GraphEdge shape is assignable with optional oneway', () => {
    const edge: GraphEdge = { from: 'node-1', to: 'node-2' };
    expect(edge.oneway).toBeUndefined();
    const onewayEdge: GraphEdge = { from: 'node-1', to: 'node-2', oneway: true };
    expect(onewayEdge.oneway).toBe(true);
  });

  test('MapConfig shape is assignable', () => {
    const config: MapConfig = {
      version: '1.0',
      map: {
        backgroundImageUrl: 'https://example.com/map.png',
        center: { x: 512, y: 384 },
        scale: 0.05,
      },
      pois: [],
      graph: { nodes: [], edges: [] },
    };
    expect(config.version).toBe('1.0');
    expect(config.pois).toHaveLength(0);
  });

  test('Route shape is assignable', () => {
    const node: GraphNode = { id: 'n1', position: { x: 0, y: 0 } };
    const route: Route = { nodes: [node], distanceMeters: 42.5, walkTimeSeconds: 30 };
    expect(route.distanceMeters).toBe(42.5);
  });
});

describe('viewer types (compile-time validation)', () => {
  test('ViewerStatus accepts valid literal values', () => {
    const statuses: ViewerStatus[] = ['idle', 'loading', 'ready', 'error'];
    expect(statuses).toHaveLength(4);
  });

  test('PoiFilterOptions is assignable with all optional fields', () => {
    const empty: PoiFilterOptions = {};
    expect(Object.keys(empty)).toHaveLength(0);

    const withTags: PoiFilterOptions = { tags: ['restaurant'] };
    expect(withTags.tags).toHaveLength(1);

    const withDistance: PoiFilterOptions = {
      maxDistanceMeters: 100,
      origin: { x: 50, y: 50 },
    };
    expect(withDistance.maxDistanceMeters).toBe(100);
  });

  test('ViewerState shape is assignable', () => {
    const state: ViewerState = {
      status: 'idle',
      mapConfig: null,
      route: null,
      filteredPois: [],
      selectedPoiId: null,
      imageSize: null,
      filterOptions: {},
    };
    expect(state.status).toBe('idle');
    expect(state.imageSize).toBeNull();
  });

  test('ViewerAction discriminated union covers all action types', () => {
    const actions: ViewerAction[] = [
      { type: 'MAP_LOADED', payload: { version: '1.0', map: { backgroundImageUrl: '', center: { x: 0, y: 0 }, scale: 1 }, pois: [], graph: { nodes: [], edges: [] } } },
      { type: 'SELECT_POI', payload: 'poi-1' },
      { type: 'SET_ROUTE', payload: null },
      { type: 'SET_FILTER', payload: { tags: ['wc'] } },
      { type: 'IMAGE_LOADED', payload: { width: 1024, height: 768 } },
      { type: 'SET_ERROR', payload: 'Something went wrong' },
    ];
    expect(actions).toHaveLength(6);
    expect(actions[0]?.type).toBe('MAP_LOADED');
    expect(actions[5]?.type).toBe('SET_ERROR');
  });
});

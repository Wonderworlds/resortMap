import { test, expect, describe } from 'bun:test';
import type { MapConfig, Route } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { viewerReducer, initialViewerState } from '../viewerState.ts';

const config = complexMap as unknown as MapConfig;
const mockRoute: Route = {
  nodes: [{ id: 'n1', position: { x: 0, y: 0 } }],
  distanceMeters: 100,
  walkTimeSeconds: 71,
};

describe('initialViewerState', () => {
  test('has correct initial values', () => {
    expect(initialViewerState.status).toBe('idle');
    expect(initialViewerState.mapConfig).toBeNull();
    expect(initialViewerState.route).toBeNull();
    expect(initialViewerState.filteredPois).toEqual([]);
    expect(initialViewerState.selectedPoiId).toBeNull();
    expect(initialViewerState.imageSize).toBeNull();
    expect(initialViewerState.filterOptions).toEqual({});
  });
});

describe('viewerReducer', () => {
  test('MAP_LOADED sets mapConfig, status=ready, filteredPois=all POIs', () => {
    const next = viewerReducer(initialViewerState, { type: 'MAP_LOADED', payload: config });
    expect(next.status).toBe('ready');
    expect(next.mapConfig).toBe(config);
    expect(next.filteredPois).toHaveLength(3);
  });

  test('SELECT_POI updates selectedPoiId', () => {
    const next = viewerReducer(initialViewerState, { type: 'SELECT_POI', payload: 'poi-001' });
    expect(next.selectedPoiId).toBe('poi-001');
  });

  test('SET_ROUTE updates route', () => {
    const next = viewerReducer(initialViewerState, { type: 'SET_ROUTE', payload: mockRoute });
    expect(next.route).toBe(mockRoute);
  });

  test('SET_ROUTE with null clears route', () => {
    const withRoute = { ...initialViewerState, route: mockRoute };
    const next = viewerReducer(withRoute, { type: 'SET_ROUTE', payload: null });
    expect(next.route).toBeNull();
  });

  test('SET_FILTER re-computes filteredPois using filterPois', () => {
    const loaded = viewerReducer(initialViewerState, { type: 'MAP_LOADED', payload: config });
    const next = viewerReducer(loaded, { type: 'SET_FILTER', payload: { tags: ['food'] } });
    expect(next.filterOptions).toEqual({ tags: ['food'] });
    expect(next.filteredPois).toHaveLength(1);
    expect(next.filteredPois[0]?.id).toBe('poi-001');
  });

  test('SET_FILTER with null mapConfig returns empty filteredPois', () => {
    const next = viewerReducer(initialViewerState, { type: 'SET_FILTER', payload: { tags: ['food'] } });
    expect(next.filterOptions).toEqual({ tags: ['food'] });
    expect(next.filteredPois).toHaveLength(0);
  });

  test('IMAGE_LOADED sets imageSize', () => {
    const next = viewerReducer(initialViewerState, {
      type: 'IMAGE_LOADED',
      payload: { width: 1920, height: 1080 },
    });
    expect(next.imageSize).toEqual({ width: 1920, height: 1080 });
  });

  test('SET_ERROR sets status=error and error message', () => {
    const next = viewerReducer(initialViewerState, { type: 'SET_ERROR', payload: 'Network failure' });
    expect(next.status).toBe('error');
    expect(next.error).toBe('Network failure');
  });
});

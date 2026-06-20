import { test, expect, describe, afterEach, beforeEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction, Route } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

mock.module('react-native', () => ({
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  View: ({ children, testID, style }: { children?: React.ReactNode; testID?: string; style?: unknown }) =>
    React.createElement('div', { 'data-testid': testID, style }, children),
  Image: ({ testID, onLoad, source, style, resizeMode }: {
    testID?: string;
    onLoad?: (e: { nativeEvent: { source: { width: number; height: number } } }) => void;
    source?: { uri?: string };
    style?: unknown;
    resizeMode?: string;
  }) => React.createElement('img', {
    'data-testid': testID,
    src: source?.uri,
    onLoad: () => onLoad?.({ nativeEvent: { source: { width: 1024, height: 768 } } }),
  }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

mock.module('react-native-reanimated', () => ({
  default: {
    // style intentionally omitted — RN transform arrays are not valid CSS
    View: ({ children, testID }: { children?: React.ReactNode; testID?: string; style?: unknown }) =>
      React.createElement('div', { 'data-testid': testID }, children),
  },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (factory: () => unknown) => factory(),
}));

mock.module('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, testID, style }: { children?: React.ReactNode; testID?: string; style?: unknown }) =>
    React.createElement('div', { 'data-testid': testID ?? 'ghroot', style }, children),
  GestureDetector: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  Gesture: {
    Pan: () => ({
      onUpdate: function(this: object) { return this; },
      onEnd: function(this: object) { return this; },
      onStart: function(this: object) { return this; },
      enabled: function(this: object) { return this; },
    }),
    Pinch: () => ({
      onUpdate: function(this: object) { return this; },
      onEnd: function(this: object) { return this; },
      onStart: function(this: object) { return this; },
    }),
    Simultaneous: (...gestures: unknown[]) => ({ type: 'simultaneous', gestures }),
  },
}));

mock.module('react-native-svg', () => ({
  Svg: ({ children, testID, viewBox, style }: { children?: React.ReactNode; testID?: string; viewBox?: string; style?: unknown }) =>
    React.createElement('svg', { 'data-testid': testID, viewBox, style }, children),
  G: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('g', { 'data-testid': testID, onClick: onPress }, children),
  Circle: ({ cx, cy, r, fill, stroke, strokeWidth }: { cx?: number; cy?: number; r?: number; fill?: string; stroke?: string; strokeWidth?: number }) =>
    React.createElement('circle', { cx, cy, r, fill, stroke, strokeWidth }),
  Polyline: ({ testID, points, fill, stroke, strokeWidth }: { testID?: string; points?: string; fill?: string; stroke?: string; strokeWidth?: number }) =>
    React.createElement('polyline', { 'data-testid': testID, points, fill, stroke, strokeWidth }),
  Text: ({ testID, children, x, y, fill, stroke }: { testID?: string; children?: React.ReactNode; x?: number; y?: number; fill?: string; stroke?: string }) =>
    React.createElement('text', { 'data-testid': testID, x, y, fill, stroke }, children),
}));

const { MapCanvas } = await import('../components/MapCanvas');
const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('MapCanvas (view-react-native)', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders map-canvas wrapper', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    expect(screen.getByTestId('map-canvas')).toBeDefined();
  });

  test('renders map-image with backgroundImageUrl as src', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const img = screen.getByTestId('map-image') as HTMLImageElement;
    expect(img.src).toContain(config.map.backgroundImageUrl);
  });

  test('map-overlay has no viewBox when imageSize is null', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const svg = screen.getByTestId('map-overlay');
    expect(svg.getAttribute('viewBox')).toBeNull();
  });

  test('map-overlay has correct viewBox when imageSize is provided', () => {
    render(<MapCanvas mapConfig={config} imageSize={{ width: 1024, height: 768 }} dispatch={mockDispatch} />);
    const svg = screen.getByTestId('map-overlay');
    expect(svg.getAttribute('viewBox')).toBe('0 0 1024 768');
  });

  test('IMAGE_LOADED dispatched with dimensions when image onLoad fires', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} />);
    const img = screen.getByTestId('map-image');
    fireEvent.load(img);
    expect(dispatchCalls).toContainEqual({
      type: 'IMAGE_LOADED',
      payload: { width: 1024, height: 768 },
    });
  });
});

describe('MapCanvas — POI Pins', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders a pin for each poi in filteredPois', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={null} />);
    config.pois.forEach(poi => {
      expect(screen.getByTestId(`poi-pin-${poi.id}`)).toBeDefined();
    });
  });

  test('SELECT_POI dispatched when pin is tapped', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={null} />);
    fireEvent.click(screen.getByTestId(`poi-pin-${config.pois[0].id}`));
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: config.pois[0].id });
  });

  test('SET_ROUTE and SELECT_POI dispatched when second pin tapped while one selected', () => {
    const [poi1, poi2] = config.pois;
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={poi1.id} />);
    fireEvent.click(screen.getByTestId(`poi-pin-${poi2.id}`));
    expect(dispatchCalls.some(c => c.type === 'SET_ROUTE')).toBe(true);
    expect(dispatchCalls).toContainEqual({ type: 'SELECT_POI', payload: poi2.id });
  });

  test('onRouteRequest called with poi ids when second pin tapped', () => {
    const [poi1, poi2] = config.pois;
    const routeCalls: [string, string][] = [];
    const onRouteRequest = (from: string, to: string) => { routeCalls.push([from, to]); };
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={config.pois} selectedPoiId={poi1.id} onRouteRequest={onRouteRequest} />);
    fireEvent.click(screen.getByTestId(`poi-pin-${poi2.id}`));
    expect(routeCalls).toContainEqual([poi1.id, poi2.id]);
  });

  test('no pin rendered for poi excluded from filteredPois', () => {
    const [poi1, , poi3] = config.pois;
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch}
      filteredPois={[poi1, poi3]} selectedPoiId={null} />);
    expect(screen.queryByTestId(`poi-pin-${config.pois[1].id}`)).toBeNull();
    expect(screen.getByTestId(`poi-pin-${poi1.id}`)).toBeDefined();
  });
});

describe('MapCanvas — Route Path', () => {
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    mockDispatch = (_action: ViewerAction) => {};
  });

  test('renders route-path when route prop is provided', () => {
    const route: Route = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 } },
        { id: 'n2', position: { x: 200, y: 200 } },
      ],
      distanceMeters: 100,
      walkTimeSeconds: 60,
    };
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} route={route} />);
    expect(screen.getByTestId('route-path')).toBeDefined();
  });

  test('route-label shows walk time when route has walkTimeSeconds', () => {
    const route: Route = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 } },
        { id: 'n2', position: { x: 200, y: 200 } },
      ],
      distanceMeters: 252,
      walkTimeSeconds: 180,
    };
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} route={route} />);
    expect(screen.getByTestId('route-label').textContent).toBe('~3 min');
  });

  test('does not render route-path when route is null', () => {
    render(<MapCanvas mapConfig={config} imageSize={null} dispatch={mockDispatch} route={null} />);
    expect(screen.queryByTestId('route-path')).toBeNull();
  });
});

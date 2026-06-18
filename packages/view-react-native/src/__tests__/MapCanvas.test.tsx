import { test, expect, describe, afterEach, beforeEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction } from '@resort-map/types';
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

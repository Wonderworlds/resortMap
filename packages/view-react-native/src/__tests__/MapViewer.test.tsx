import { test, expect, describe, afterEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

// Register mocks BEFORE MapViewer is imported.
// Bun does NOT hoist mock.module — static imports run first, so MapViewer must be
// loaded via dynamic import AFTER these calls to get the mocked modules.
mock.module('react-native', () => ({
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  Image: ({ testID, onLoad, source }: {
    testID?: string;
    onLoad?: (e: { nativeEvent: { source: { width: number; height: number } } }) => void;
    source?: { uri?: string };
  }) => React.createElement('img', {
    'data-testid': testID,
    src: source?.uri,
    onLoad: () => onLoad?.({ nativeEvent: { source: { width: 1024, height: 768 } } }),
  }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
  TouchableOpacity: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('div', { 'data-testid': testID, onClick: onPress, role: 'button' }, children),
  TextInput: ({ testID, onChangeText, value, placeholder }: { testID?: string; onChangeText?: (v: string) => void; value?: string; placeholder?: string }) =>
    React.createElement('input', {
      'data-testid': testID,
      value: value ?? '',
      placeholder,
      onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
    }),
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
  GestureHandlerRootView: ({ children, testID, style }: {
    children?: React.ReactNode; testID?: string; style?: unknown;
  }) => React.createElement('div', { 'data-testid': testID ?? 'ghroot', style }, children),
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

// Dynamic import AFTER mocks are registered
const { MapViewer } = await import('../MapViewer');

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid json}';

afterEach(cleanup);

describe('MapViewer (view-react-native)', () => {
  test('MapConfig source renders map-viewer wrapper, no error element', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-viewer')).toBeDefined();
    });
    expect(screen.queryByTestId('error-message')).toBeNull();
  });

  test('valid JSON string source renders map-viewer wrapper', async () => {
    render(<MapViewer source={validJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-viewer')).toBeDefined();
    });
  });

  test('invalid source renders error-message Text', async () => {
    render(<MapViewer source={invalidJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeDefined();
    });
    expect(screen.getByTestId('error-message').textContent).toBeTruthy();
  });

  test('GestureHandlerRootView wraps tree in error state (ARCH-13)', async () => {
    render(<MapViewer source={invalidJson} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-viewer')).toBeDefined();
      expect(screen.getByTestId('error-message')).toBeDefined();
    });
    const root = screen.getByTestId('map-viewer');
    expect(root.contains(screen.getByTestId('error-message'))).toBe(true);
  });

  test('renders MapCanvas in ready state', async () => {
    render(<MapViewer source={config} />);
    await waitFor(() => {
      expect(screen.getByTestId('map-canvas')).toBeDefined();
    });
  });
});

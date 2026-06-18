import { test, expect, describe } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import type { MapConfig } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { useMapViewer } from '../hooks/useMapViewer';

const config = complexMap as unknown as MapConfig;
const validJson = JSON.stringify(config);
const invalidJson = '{not: valid json}';

describe('useMapViewer', () => {
  test('MapConfig source dispatches MAP_LOADED → status becomes ready', async () => {
    const { result } = renderHook(() => useMapViewer(config));
    await act(async () => {});
    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.mapConfig).toEqual(config);
  });

  test('valid JSON string source dispatches MAP_LOADED → status becomes ready', async () => {
    const { result } = renderHook(() => useMapViewer(validJson));
    await act(async () => {});
    expect(result.current.state.status).toBe('ready');
    expect(result.current.state.mapConfig).not.toBeNull();
  });

  test('invalid JSON string source dispatches SET_ERROR → status becomes error', async () => {
    const { result } = renderHook(() => useMapViewer(invalidJson));
    await act(async () => {});
    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error).toBeDefined();
  });
});

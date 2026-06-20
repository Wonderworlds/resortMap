import { test, expect, describe, afterEach, beforeEach, mock } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';

mock.module('react-native', () => ({
  View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('div', { 'data-testid': testID }, children),
  Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement('span', { 'data-testid': testID }, children),
  TouchableOpacity: ({ children, testID, onPress }: { children?: React.ReactNode; testID?: string; onPress?: () => void }) =>
    React.createElement('div', { 'data-testid': testID, onClick: onPress, role: 'button' }, children),
  TextInput: ({ testID, onChangeText, value, placeholder }: { testID?: string; onChangeText?: (v: string) => void; value?: string; placeholder?: string }) =>
    React.createElement('input', {
      'data-testid': testID,
      value: value ?? '',
      placeholder,
      onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
    }),
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

const { FilterPanel } = await import('../components/FilterPanel');

const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('FilterPanel (view-react-native)', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders one chip per unique tag in mapConfig', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    expect(screen.getByTestId('tag-chip-food')).toBeDefined();
    expect(screen.getByTestId('tag-chip-leisure')).toBeDefined();
    const chips = screen.getByTestId('tag-chips').querySelectorAll('[role="button"]');
    expect(chips.length).toBe(2);
  });

  test('tapping tag chip dispatches SET_FILTER adding that tag', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    fireEvent.click(screen.getByTestId('tag-chip-food'));
    expect(dispatchCalls).toContainEqual({
      type: 'SET_FILTER',
      payload: { tags: ['food'] },
    });
  });

  test('tapping active tag chip dispatches SET_FILTER removing it', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{ tags: ['food'] }}
        dispatch={mockDispatch}
      />
    );
    fireEvent.click(screen.getByTestId('tag-chip-food'));
    const setFilterCall = dispatchCalls.find(c => c.type === 'SET_FILTER') as
      | { type: 'SET_FILTER'; payload: PoiFilterOptions }
      | undefined;
    expect(setFilterCall?.payload.tags).toBeUndefined();
  });

  test('distance input change dispatches SET_FILTER with maxDistanceMeters and origin', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    fireEvent.change(screen.getByTestId('distance-input'), { target: { value: '500' } });
    expect(dispatchCalls).toContainEqual({
      type: 'SET_FILTER',
      payload: {
        maxDistanceMeters: 500,
        origin: { x: 512, y: 400 },
      },
    });
  });

  test('clearing distance input dispatches SET_FILTER without maxDistanceMeters', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{ maxDistanceMeters: 500, origin: { x: 512, y: 400 } }}
        dispatch={mockDispatch}
      />
    );
    fireEvent.change(screen.getByTestId('distance-input'), { target: { value: '' } });
    const setFilterCall = dispatchCalls.find(c => c.type === 'SET_FILTER') as
      | { type: 'SET_FILTER'; payload: PoiFilterOptions }
      | undefined;
    expect(setFilterCall?.payload.maxDistanceMeters).toBeUndefined();
    expect(setFilterCall?.payload.origin).toBeUndefined();
  });

  test('onFilterChange callback called with correct options on tag toggle', () => {
    const filterChangeCalls: PoiFilterOptions[] = [];
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
        onFilterChange={(opts) => filterChangeCalls.push(opts)}
      />
    );
    fireEvent.click(screen.getByTestId('tag-chip-food'));
    expect(filterChangeCalls).toHaveLength(1);
    expect(filterChangeCalls[0]).toEqual({ tags: ['food'] });
  });
});

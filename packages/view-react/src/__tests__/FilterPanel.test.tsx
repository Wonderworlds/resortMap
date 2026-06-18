import { test, expect, describe, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types';
import complexMap from '@resort-map/types/fixtures/complex.gwmap.json';
import { FilterPanel } from '../components/FilterPanel';

const config = complexMap as unknown as MapConfig;

afterEach(cleanup);

describe('FilterPanel', () => {
  let dispatchCalls: ViewerAction[];
  let mockDispatch: (action: ViewerAction) => void;

  beforeEach(() => {
    dispatchCalls = [];
    mockDispatch = (action: ViewerAction) => { dispatchCalls.push(action); };
  });

  test('renders one button per unique tag in mapConfig', () => {
    render(
      <FilterPanel
        mapConfig={config}
        filterOptions={{}}
        dispatch={mockDispatch}
      />
    );
    expect(screen.getByTestId('tag-chip-food')).toBeDefined();
    expect(screen.getByTestId('tag-chip-leisure')).toBeDefined();
    const chips = screen.getByTestId('tag-chips').querySelectorAll('button');
    expect(chips.length).toBe(2);
  });

  test('clicking tag chip dispatches SET_FILTER adding that tag', () => {
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

  test('clicking active tag chip dispatches SET_FILTER removing it', () => {
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

  test('changing distance input dispatches SET_FILTER with maxDistanceMeters and origin', () => {
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
});

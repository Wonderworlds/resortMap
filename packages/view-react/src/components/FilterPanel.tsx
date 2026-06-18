import { useCallback } from 'react';
import type { Dispatch, ChangeEvent } from 'react';
import type { MapConfig, ViewerAction, PoiFilterOptions } from '@resort-map/types';

export interface FilterPanelProps {
  mapConfig: MapConfig;
  filterOptions: PoiFilterOptions;
  dispatch: Dispatch<ViewerAction>;
  onFilterChange?: (options: PoiFilterOptions) => void;
}

export function FilterPanel({ mapConfig, filterOptions, dispatch, onFilterChange }: FilterPanelProps) {
  const allTags = [...new Set(mapConfig.pois.flatMap(p => p.tags))].sort();
  const activeTags = filterOptions.tags ?? [];

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    const newOptions: PoiFilterOptions = {
      ...filterOptions,
      tags: newTags.length > 0 ? newTags : undefined,
    };
    dispatch({ type: 'SET_FILTER', payload: newOptions });
    onFilterChange?.(newOptions);
  }, [activeTags, filterOptions, dispatch, onFilterChange]);

  const handleDistanceChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newOptions: PoiFilterOptions =
      isNaN(value) || value <= 0
        ? { ...filterOptions, maxDistanceMeters: undefined, origin: undefined }
        : { ...filterOptions, maxDistanceMeters: value, origin: mapConfig.map.center };
    dispatch({ type: 'SET_FILTER', payload: newOptions });
    onFilterChange?.(newOptions);
  }, [filterOptions, mapConfig.map.center, dispatch, onFilterChange]);

  return (
    <div data-testid="filter-panel">
      <div data-testid="tag-chips">
        {allTags.map(tag => (
          <button
            key={tag}
            data-testid={`tag-chip-${tag}`}
            onClick={() => handleTagToggle(tag)}
            aria-pressed={activeTags.includes(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <input
        data-testid="distance-input"
        type="number"
        min={0}
        placeholder="Max distance (m)"
        value={filterOptions.maxDistanceMeters ?? ''}
        onChange={handleDistanceChange}
      />
    </div>
  );
}

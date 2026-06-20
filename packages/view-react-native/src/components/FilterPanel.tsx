import { useCallback } from 'react';
import type { Dispatch } from 'react';
import { View, TouchableOpacity, Text, TextInput } from 'react-native';
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

  const handleDistanceChange = useCallback((value: string) => {
    const parsed = parseFloat(value);
    const newOptions: PoiFilterOptions =
      isNaN(parsed) || parsed <= 0
        ? { ...filterOptions, maxDistanceMeters: undefined, origin: undefined }
        : { ...filterOptions, maxDistanceMeters: parsed, origin: mapConfig.map.center };
    dispatch({ type: 'SET_FILTER', payload: newOptions });
    onFilterChange?.(newOptions);
  }, [filterOptions, mapConfig.map.center, dispatch, onFilterChange]);

  return (
    <View testID="filter-panel">
      <View testID="tag-chips">
        {allTags.map(tag => (
          <TouchableOpacity
            key={tag}
            testID={`tag-chip-${tag}`}
            onPress={() => handleTagToggle(tag)}
          >
            <Text>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        testID="distance-input"
        keyboardType="numeric"
        placeholder="Max distance (m)"
        value={filterOptions.maxDistanceMeters != null ? String(filterOptions.maxDistanceMeters) : ''}
        onChangeText={handleDistanceChange}
      />
    </View>
  );
}

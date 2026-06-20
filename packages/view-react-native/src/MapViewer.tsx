import type { MapConfig, ViewerStatus, PoiFilterOptions } from '@resort-map/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import { useMapViewer } from './hooks/useMapViewer';
import { MapCanvas } from './components/MapCanvas';
import { FilterPanel } from './components/FilterPanel';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
}

export function MapViewer({ source, onRouteRequest, onFilterChange }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  return (
    <GestureHandlerRootView testID="map-viewer" style={{ flex: 1 }}>
      {state.status === 'error' && (
        <Text testID="error-message">{state.error}</Text>
      )}
      {state.status === 'ready' && state.mapConfig && (
        <>
          <MapCanvas
            mapConfig={state.mapConfig}
            imageSize={state.imageSize}
            dispatch={dispatch}
            filteredPois={state.filteredPois}
            selectedPoiId={state.selectedPoiId}
            onRouteRequest={onRouteRequest}
            route={state.route}
          />
          <FilterPanel
            mapConfig={state.mapConfig}
            filterOptions={state.filterOptions}
            dispatch={dispatch}
            onFilterChange={onFilterChange}
          />
        </>
      )}
    </GestureHandlerRootView>
  );
}

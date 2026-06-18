import type { MapConfig, ViewerStatus, PoiFilterOptions } from '@resort-map/types';
import { useMapViewer } from './hooks/useMapViewer.ts';
import { MapCanvas } from './components/MapCanvas.tsx';
import { FilterPanel } from './components/FilterPanel.tsx';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
}

export function MapViewer({ source, onRouteRequest, onFilterChange }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  if (state.status === 'error') {
    return <div role="alert">{state.error}</div>;
  }

  if (state.status === 'ready' && state.mapConfig) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
      </div>
    );
  }

  return null;
}

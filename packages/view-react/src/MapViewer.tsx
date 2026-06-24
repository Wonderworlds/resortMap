import type { MapConfig, ViewerStatus, PoiFilterOptions } from '@resort-map/types';
import { useMapViewer } from './hooks/useMapViewer';
import { MapCanvas } from './components/MapCanvas';
import { FilterPanel } from './components/FilterPanel';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
  onRouteRequest?: (fromId: string, toId: string) => void;
  onFilterChange?: (options: PoiFilterOptions) => void;
  preview?: boolean;
}

export function MapViewer({ source, onRouteRequest, onFilterChange, preview }: MapViewerProps) {
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
          preview={preview}
        />
        {!preview && (
          <FilterPanel
            mapConfig={state.mapConfig}
            filterOptions={state.filterOptions}
            dispatch={dispatch}
            onFilterChange={onFilterChange}
          />
        )}
        {preview && (
          <div
            data-testid="preview-badge"
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 12,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            Preview
          </div>
        )}
      </div>
    );
  }

  return null;
}

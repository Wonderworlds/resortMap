import type { MapConfig, ViewerStatus } from '@resort-map/types';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import { useMapViewer } from './hooks/useMapViewer';
import { MapCanvas } from './components/MapCanvas';

export interface MapViewerProps {
  source: string | MapConfig;
  onStatusChange?: (status: ViewerStatus) => void;
}

export function MapViewer({ source }: MapViewerProps) {
  const { state, dispatch } = useMapViewer(source);

  return (
    <GestureHandlerRootView testID="map-viewer" style={{ flex: 1 }}>
      {state.status === 'error' && (
        <Text testID="error-message">{state.error}</Text>
      )}
      {state.status === 'ready' && state.mapConfig && (
        <MapCanvas
          mapConfig={state.mapConfig}
          imageSize={state.imageSize}
          dispatch={dispatch}
        />
      )}
    </GestureHandlerRootView>
  );
}

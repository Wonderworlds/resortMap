import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction, POI, Route } from '@resort-map/types';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'react-native';
import { Svg } from 'react-native-svg';
import { computeRoute } from '@resort-map/view-core';
import { useGestures } from '../hooks/useGestures';
import { PoiPin } from './PoiPin';
import { RoutePath } from './RoutePath';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
  filteredPois?: POI[];
  selectedPoiId?: string | null;
  onRouteRequest?: (fromId: string, toId: string) => void;
  route?: Route | null;
}

export function MapCanvas({
  mapConfig,
  imageSize,
  dispatch,
  filteredPois = [],
  selectedPoiId = null,
  onRouteRequest,
  route = null,
}: MapCanvasProps) {
  const { composedGesture, animatedStyle } = useGestures();

  const handleImageLoad = (e: { nativeEvent: { source: { width: number; height: number } } }) => {
    dispatch({
      type: 'IMAGE_LOADED',
      payload: { width: e.nativeEvent.source.width, height: e.nativeEvent.source.height },
    });
  };

  const handlePoiTap = useCallback((tappedPoiId: string) => {
    if (selectedPoiId !== null && selectedPoiId !== tappedPoiId) {
      const route = computeRoute(mapConfig, selectedPoiId, tappedPoiId);
      dispatch({ type: 'SELECT_POI', payload: tappedPoiId });
      dispatch({ type: 'SET_ROUTE', payload: route });
      onRouteRequest?.(selectedPoiId, tappedPoiId);
    } else {
      dispatch({ type: 'SELECT_POI', payload: tappedPoiId });
    }
  }, [selectedPoiId, mapConfig, dispatch, onRouteRequest]);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View testID="map-canvas" style={[{ flex: 1 }, animatedStyle] as object}>
        <Image
          testID="map-image"
          source={{ uri: mapConfig.map.backgroundImageUrl }}
          style={{ flex: 1 }}
          resizeMode="contain"
          onLoad={handleImageLoad}
        />
        <Svg
          testID="map-overlay"
          viewBox={imageSize ? `0 0 ${imageSize.width} ${imageSize.height}` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize?.width ?? 0,
            height: imageSize?.height ?? 0,
          }}
        >
          {filteredPois.map(poi => (
            <PoiPin
              key={poi.id}
              poi={poi}
              isSelected={selectedPoiId === poi.id}
              onTap={() => handlePoiTap(poi.id)}
            />
          ))}
          {route && <RoutePath route={route} />}
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

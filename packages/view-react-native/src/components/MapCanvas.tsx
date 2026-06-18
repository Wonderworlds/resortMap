import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction } from '@resort-map/types';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'react-native';
import { Svg } from 'react-native-svg';
import { useGestures } from '../hooks/useGestures';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
}

export function MapCanvas({ mapConfig, imageSize, dispatch }: MapCanvasProps) {
  const { composedGesture, animatedStyle } = useGestures();

  const handleImageLoad = (e: { nativeEvent: { source: { width: number; height: number } } }) => {
    dispatch({
      type: 'IMAGE_LOADED',
      payload: { width: e.nativeEvent.source.width, height: e.nativeEvent.source.height },
    });
  };

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
        />
      </Animated.View>
    </GestureDetector>
  );
}

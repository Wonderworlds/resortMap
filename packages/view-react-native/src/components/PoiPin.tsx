import type { POI } from '@resort-map/types';
import { G, Circle } from 'react-native-svg';

interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  onTap: () => void;
}

export function PoiPin({ poi, isSelected, onTap }: PoiPinProps) {
  return (
    <G testID={`poi-pin-${poi.id}`} onPress={onTap}>
      <Circle
        cx={poi.position.x}
        cy={poi.position.y}
        r={8}
        fill={isSelected ? '#ff4444' : '#3b82f6'}
        stroke="white"
        strokeWidth={2}
      />
    </G>
  );
}

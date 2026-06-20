import type { Route } from '@resort-map/types';
import { G, Polyline, Text as SvgText } from 'react-native-svg';

export interface RoutePathProps {
  route: Route;
}

export function RoutePath({ route }: RoutePathProps) {
  if (route.nodes.length === 0) return null;

  const points = route.nodes
    .map(n => `${n.position.x},${n.position.y}`)
    .join(' ');

  const minutes = Math.ceil(route.walkTimeSeconds / 60);
  const midNode = route.nodes[Math.floor(route.nodes.length / 2)];

  return (
    <G testID="route-path">
      <Polyline
        points={points}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {midNode && (
        <SvgText
          testID="route-label"
          x={midNode.position.x}
          y={midNode.position.y - 14}
          textAnchor="middle"
          fontSize={14}
          fill="#1a1a1a"
          stroke="white"
          strokeWidth={3}
        >
          {`~${minutes} min`}
        </SvgText>
      )}
    </G>
  );
}

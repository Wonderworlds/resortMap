import type { MapConfig, GraphNode, Position } from '@resort-map/types';
import { pixelDistance } from './pixelMath.ts';

export function buildAdjacencyList(config: MapConfig): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const node of config.graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of config.graph.edges) {
    const fromList = adj.get(edge.from);
    if (fromList) fromList.push(edge.to);

    if (!edge.oneway) {
      const toList = adj.get(edge.to);
      if (toList) toList.push(edge.from);
    }
  }

  return adj;
}

export function nearestNode(config: MapConfig, position: Position): GraphNode | null {
  if (config.graph.nodes.length === 0) return null;

  let nearest: GraphNode | null = null;
  let minDist = Infinity;

  for (const node of config.graph.nodes) {
    const dist = pixelDistance(node.position, position);
    if (dist < minDist) {
      minDist = dist;
      nearest = node;
    }
  }

  return nearest;
}

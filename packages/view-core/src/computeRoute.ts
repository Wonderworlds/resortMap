import type { MapConfig, Route, Position, GraphNode } from '@resort-map/types';
import { buildAdjacencyList, nearestNode } from './utils/graphUtils.ts';
import { pixelDistance, pixelsToMeters, estimateWalkTime } from './utils/pixelMath.ts';

function isPosition(v: string | Position): v is Position {
  return typeof v !== 'string';
}

function resolveNode(config: MapConfig, endpoint: string | Position): GraphNode | null {
  if (isPosition(endpoint)) {
    return nearestNode(config, endpoint);
  }
  const poi = config.pois.find((p) => p.id === endpoint);
  if (poi) {
    if (poi.nodeId) {
      const node = config.graph.nodes.find((n) => n.id === poi.nodeId);
      if (node) return node;
    }
    return nearestNode(config, poi.position);
  }
  return null;
}

function dijkstra(
  adj: Map<string, string[]>,
  nodeMap: Map<string, GraphNode>,
  startId: string,
  endId: string,
): string[] | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of adj.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startId, 0);

  while (true) {
    let minDist = Infinity;
    let u: string | null = null;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < minDist) {
        minDist = d;
        u = id;
      }
    }
    if (u === null || u === endId) break;
    visited.add(u);

    const uNode = nodeMap.get(u);
    if (!uNode) continue;

    for (const v of (adj.get(u) ?? [])) {
      if (visited.has(v)) continue;
      const vNode = nodeMap.get(v);
      if (!vNode) continue;

      const edgeDist = pixelDistance(uNode.position, vNode.position);
      const currentDist = dist.get(u) ?? Infinity;
      const alt = currentDist + edgeDist;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  const endDist = dist.get(endId);
  if (endDist === undefined || endDist === Infinity) return null;

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return path;
}

export function computeRoute(
  config: MapConfig,
  from: string | Position,
  to: string | Position,
): Route | null {
  const startNode = resolveNode(config, from);
  const endNode = resolveNode(config, to);

  if (!startNode || !endNode) return null;

  if (startNode.id === endNode.id) {
    return { nodes: [startNode], distanceMeters: 0, walkTimeSeconds: 0 };
  }

  const adj = buildAdjacencyList(config);
  const nodeMap = new Map<string, GraphNode>();
  for (const node of config.graph.nodes) {
    nodeMap.set(node.id, node);
  }

  const pathIds = dijkstra(adj, nodeMap, startNode.id, endNode.id);
  if (pathIds === null) return null;

  const nodes: GraphNode[] = pathIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => n !== undefined);

  let distancePixels = 0;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    if (prev && curr) {
      distancePixels += pixelDistance(prev.position, curr.position);
    }
  }

  const distanceMeters = pixelsToMeters(distancePixels, config.map.scale);
  return {
    nodes,
    distanceMeters,
    walkTimeSeconds: estimateWalkTime(distanceMeters),
  };
}

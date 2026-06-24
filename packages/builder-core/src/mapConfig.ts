import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge, Position } from '@resort-map/types';
import { generateId } from './utils/idGeneration';

export const POI_NODE_SNAP_RADIUS = 12;

export function createMapConfig(meta: MapMeta): MapConfig {
  return {
    version: '1.0',
    map: meta,
    pois: [],
    graph: { nodes: [], edges: [] },
  };
}

export function addPoi(
  config: MapConfig,
  poi: Omit<POI, 'id'>,
  snapRadius = POI_NODE_SNAP_RADIUS,
): MapConfig {
  // Find the closest existing node within snap radius
  let closestNode: GraphNode | undefined;
  let closestDist = Infinity;
  for (const node of config.graph.nodes) {
    const dx = node.position.x - poi.position.x;
    const dy = node.position.y - poi.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= snapRadius && dist < closestDist) {
      closestNode = node;
      closestDist = dist;
    }
  }

  let baseConfig = config;
  let nodeId: string;
  if (closestNode) {
    nodeId = closestNode.id;
  } else {
    baseConfig = addNode(config, { position: poi.position });
    nodeId = baseConfig.graph.nodes[baseConfig.graph.nodes.length - 1]!.id;
  }

  const newPoi: POI = { ...poi, id: generateId(), nodeId };
  return { ...baseConfig, pois: [...baseConfig.pois, newPoi] };
}

export function removePoi(config: MapConfig, poiId: string): MapConfig {
  return { ...config, pois: config.pois.filter(p => p.id !== poiId) };
}

export function updatePoi(
  config: MapConfig,
  poiId: string,
  patch: Partial<Omit<POI, 'id'>>,
): MapConfig {
  return {
    ...config,
    pois: config.pois.map(p => (p.id === poiId ? { ...p, ...patch } : p)),
  };
}

export function updateNode(
  config: MapConfig,
  nodeId: string,
  patch: Partial<Omit<GraphNode, 'id'>>,
): MapConfig {
  return {
    ...config,
    graph: {
      ...config.graph,
      nodes: config.graph.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    },
  };
}

export function updateNodePosition(config: MapConfig, nodeId: string, position: Position): MapConfig {
  return updateNode(config, nodeId, { position });
}

export function movePoiWithNode(config: MapConfig, poiId: string, position: Position): MapConfig {
  const poi = config.pois.find((p) => p.id === poiId);
  if (!poi) return config;
  let result = updatePoi(config, poiId, { position });
  if (poi.nodeId) result = updateNodePosition(result, poi.nodeId, position);
  return result;
}

export function addNode(config: MapConfig, node: Omit<GraphNode, 'id'>): MapConfig {
  const newNode: GraphNode = { ...node, id: generateId() };
  return {
    ...config,
    graph: { ...config.graph, nodes: [...config.graph.nodes, newNode] },
  };
}

export function addEdge(config: MapConfig, edge: GraphEdge): MapConfig {
  return {
    ...config,
    graph: { ...config.graph, edges: [...config.graph.edges, edge] },
  };
}

export function removeNode(config: MapConfig, nodeId: string): MapConfig {
  return {
    ...config,
    graph: {
      nodes: config.graph.nodes.filter(n => n.id !== nodeId),
      edges: config.graph.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    },
  };
}

export function removeEdge(config: MapConfig, from: string, to: string): MapConfig {
  return {
    ...config,
    graph: {
      ...config.graph,
      edges: config.graph.edges.filter(e => !(e.from === from && e.to === to)),
    },
  };
}

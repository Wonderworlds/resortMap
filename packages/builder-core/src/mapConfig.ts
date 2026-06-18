import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge } from '@resort-map/types';
import { generateId } from './utils/idGeneration';

export function createMapConfig(meta: MapMeta): MapConfig {
  return {
    version: '1.0',
    map: meta,
    pois: [],
    graph: { nodes: [], edges: [] },
  };
}

export function addPoi(config: MapConfig, poi: Omit<POI, 'id'>): MapConfig {
  const newPoi: POI = { ...poi, id: generateId() };
  return { ...config, pois: [...config.pois, newPoi] };
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

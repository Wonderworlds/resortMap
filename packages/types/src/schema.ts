export interface Position {
  x: number;
  y: number;
}

export interface MapMeta {
  backgroundImageUrl: string;
  center: Position;
  scale: number;
}

export interface POI {
  id: string;
  label: string;
  position: Position;
  tags: string[];
  icon?: string;
  nodeId?: string;
  locked?: boolean;
  meta?: Record<string, unknown>;
}

export interface GraphNode {
  id: string;
  position: Position;
  locked?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  oneway?: boolean;
}

export interface MapConfig {
  version: string;
  map: MapMeta;
  pois: POI[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}

export interface Route {
  nodes: GraphNode[];
  distanceMeters: number;
  walkTimeSeconds: number;
}

import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge, Position } from './schema';
import { ErrorCode } from './errors';

export function validateGwmap(raw: unknown): MapConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error('Invalid .gwmap: expected a JSON object'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }

  const obj = raw as Record<string, unknown>;

  // --- version ---
  if (typeof obj['version'] !== 'string') {
    throw Object.assign(
      new Error('Missing required field: version'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const majorVersion = obj['version'].split('.')[0];
  if (majorVersion !== '1') {
    throw Object.assign(
      new Error(`Unsupported .gwmap major version: "${obj['version']}". Expected major version 1.`),
      { code: ErrorCode.GWMAP_VERSION_MISMATCH }
    );
  }

  // --- map ---
  const map = validateMapMeta(obj['map']);

  // --- pois ---
  if (!Array.isArray(obj['pois'])) {
    throw Object.assign(
      new Error('Missing required field: pois'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const pois = (obj['pois'] as unknown[]).map((p, i) => validatePoi(p, i));
  const poiIds = pois.map(p => p.id);
  const uniquePoiIds = new Set(poiIds);
  if (uniquePoiIds.size !== poiIds.length) {
    throw Object.assign(
      new Error('Duplicate POI ids found in pois array'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }

  // --- graph ---
  if (typeof obj['graph'] !== 'object' || obj['graph'] === null || Array.isArray(obj['graph'])) {
    throw Object.assign(
      new Error('Missing required field: graph'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const graphRaw = obj['graph'] as Record<string, unknown>;

  if (!Array.isArray(graphRaw['nodes'])) {
    throw Object.assign(
      new Error('Missing required field: graph.nodes'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const nodes = (graphRaw['nodes'] as unknown[]).map((n, i) => validateGraphNode(n, i));
  const nodeIds = nodes.map(n => n.id);
  const uniqueNodeIds = new Set(nodeIds);
  if (uniqueNodeIds.size !== nodeIds.length) {
    throw Object.assign(
      new Error('Duplicate node ids found in graph.nodes'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const nodeIdSet = new Set(nodeIds);

  if (!Array.isArray(graphRaw['edges'])) {
    throw Object.assign(
      new Error('Missing required field: graph.edges'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const edges = (graphRaw['edges'] as unknown[]).map((e, i) => validateGraphEdge(e, i, nodeIdSet));

  // Validate poi.nodeId references
  for (const poi of pois) {
    if (poi.nodeId !== undefined && !nodeIdSet.has(poi.nodeId)) {
      throw Object.assign(
        new Error(`POI "${poi.id}" has nodeId "${poi.nodeId}" which does not exist in graph.nodes`),
        { code: ErrorCode.GWMAP_PARSE_ERROR }
      );
    }
  }

  // Return MapConfig with only known top-level fields (ADR-006 strip + preserve)
  return {
    version: obj['version'],
    map,
    pois,
    graph: { nodes, edges },
  };
}

function validatePosition(raw: unknown, fieldName: string): Position {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`Missing required field: ${fieldName}`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const pos = raw as Record<string, unknown>;
  if (typeof pos['x'] !== 'number' || typeof pos['y'] !== 'number') {
    throw Object.assign(
      new Error(`Missing required field: ${fieldName}.x or ${fieldName}.y`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (pos['x'] < 0 || pos['y'] < 0) {
    throw Object.assign(
      new Error(`Invalid ${fieldName}: x and y must be non-negative`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  return { x: pos['x'], y: pos['y'] };
}

function validateMapMeta(raw: unknown): MapMeta {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error('Missing required field: map'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj['backgroundImageUrl'] !== 'string') {
    throw Object.assign(
      new Error('Missing required field: map.backgroundImageUrl'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const center = validatePosition(obj['center'], 'map.center');
  if (typeof obj['scale'] !== 'number') {
    throw Object.assign(
      new Error('Missing required field: map.scale'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (obj['scale'] <= 0) {
    throw Object.assign(
      new Error('Invalid field: map.scale must be a positive number'),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  return {
    backgroundImageUrl: obj['backgroundImageUrl'],
    center,
    scale: obj['scale'],
  };
}

function validatePoi(raw: unknown, index: number): POI {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`pois[${index}] is not an object`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj['id'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: pois[${index}].id`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (typeof obj['label'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: pois[${index}].label`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const position = validatePosition(obj['position'], `pois[${index}].position`);
  if (!Array.isArray(obj['tags'])) {
    throw Object.assign(
      new Error(`Missing required field: pois[${index}].tags`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }

  const poi: POI = {
    id: obj['id'],
    label: obj['label'],
    position,
    tags: obj['tags'].filter((t): t is string => typeof t === 'string'),
  };

  if (typeof obj['icon'] === 'string') poi.icon = obj['icon'];
  if (typeof obj['nodeId'] === 'string') poi.nodeId = obj['nodeId'];
  if (typeof obj['locked'] === 'boolean') poi.locked = obj['locked'];
  // Preserve meta as-is (ADR-006: unknown fields inside POI.meta are preserved)
  if (typeof obj['meta'] === 'object' && obj['meta'] !== null && !Array.isArray(obj['meta'])) {
    poi.meta = obj['meta'] as Record<string, unknown>;
  }

  return poi;
}

function validateGraphNode(raw: unknown, index: number): GraphNode {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`graph.nodes[${index}] is not an object`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: graph.nodes[${index}].id`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const position = validatePosition(obj['position'], `graph.nodes[${index}].position`);
  const node: GraphNode = { id: obj['id'], position };
  if (typeof obj['locked'] === 'boolean') node.locked = obj['locked'];
  return node;
}

function validateGraphEdge(raw: unknown, index: number, nodeIdSet: Set<string>): GraphEdge {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw Object.assign(
      new Error(`graph.edges[${index}] is not an object`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['from'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: graph.edges[${index}].from`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (typeof obj['to'] !== 'string') {
    throw Object.assign(
      new Error(`Missing required field: graph.edges[${index}].to`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (!nodeIdSet.has(obj['from'])) {
    throw Object.assign(
      new Error(`graph.edges[${index}].from references unknown node "${obj['from']}"`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  if (!nodeIdSet.has(obj['to'])) {
    throw Object.assign(
      new Error(`graph.edges[${index}].to references unknown node "${obj['to']}"`),
      { code: ErrorCode.GWMAP_PARSE_ERROR }
    );
  }
  const edge: GraphEdge = { from: obj['from'], to: obj['to'] };
  if (typeof obj['oneway'] === 'boolean') edge.oneway = obj['oneway'];
  return edge;
}

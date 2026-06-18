import { useEffect, useRef, useState } from 'react';
import type { POI, GraphNode, GraphEdge } from '@resort-map/types';
import { updatePoi as coreUpdatePoi } from '@resort-map/builder-core';
import { useMapStore } from '../store/mapStore';
import { toSvgCoords } from '../utils/svgCoords';

interface DragState {
  poiId: string;
  pointerId: number;
}

export function MapCanvas(): JSX.Element {
  const mapConfig = useMapStore((s) => s.mapConfig);
  const activeTool = useMapStore((s) => s.activeTool);
  const selectedItemId = useMapStore((s) => s.selectedItemId);
  const addPoi = useMapStore((s) => s.addPoi);
  const removePoi = useMapStore((s) => s.removePoi);
  const addNode = useMapStore((s) => s.addNode);
  const removeNode = useMapStore((s) => s.removeNode);
  const addEdge = useMapStore((s) => s.addEdge);
  const removeEdge = useMapStore((s) => s.removeEdge);
  const setSelectedItemId = useMapStore((s) => s.setSelectedItemId);
  const setActiveTool = useMapStore((s) => s.setActiveTool);
  const updateMapMeta = useMapStore((s) => s.updateMapMeta);

  const svgRef = useRef<SVGSVGElement>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [edgeStartId, setEdgeStartId] = useState<string | null>(null);

  useEffect(() => {
    if (!mapConfig?.map.backgroundImageUrl) return;
    setImageSize(null);
    const img = new Image();
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImageSize(null);
    img.src = mapConfig.map.backgroundImageUrl;
  }, [mapConfig?.map.backgroundImageUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEdgeStartId(null);
        if (activeTool === 'setCenter') setActiveTool('select');
        return;
      }
      if (e.key !== 'Delete') return;
      if (!selectedItemId || !mapConfig) return;

      if (mapConfig.pois.some((p) => p.id === selectedItemId)) {
        removePoi(selectedItemId);
        return;
      }

      if (mapConfig.graph.nodes.some((n) => n.id === selectedItemId)) {
        removeNode(selectedItemId);
        return;
      }

      const colonIdx = selectedItemId.indexOf(':');
      if (colonIdx !== -1) {
        const from = selectedItemId.slice(0, colonIdx);
        const to = selectedItemId.slice(colonIdx + 1);
        if (mapConfig.graph.edges.some((edge) => edge.from === from && edge.to === to)) {
          removeEdge(from, to);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItemId, mapConfig, activeTool, removePoi, removeNode, removeEdge, setActiveTool]);

  function getSvgRect(): DOMRect | null {
    return svgRef.current?.getBoundingClientRect() ?? null;
  }

  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>): void {
    if (!imageSize) return;
    const rect = getSvgRect();
    if (!rect) return;
    const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);

    if (activeTool === 'placePoi') {
      addPoi({ label: 'New POI', position: pos, tags: [] });
      const newPois = useMapStore.getState().mapConfig!.pois;
      const newId = newPois[newPois.length - 1]!.id;
      setSelectedItemId(newId);
    } else if (activeTool === 'placeNode') {
      addNode({ position: pos });
      const nodes = useMapStore.getState().mapConfig!.graph.nodes;
      const newId = nodes[nodes.length - 1]!.id;
      setSelectedItemId(newId);
    } else if (activeTool === 'setCenter') {
      updateMapMeta({ center: pos });
      setActiveTool('select');
    }
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>): void {
    if (!dragState || !imageSize) return;
    const rect = getSvgRect();
    if (!rect) return;
    const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);
    const currentConfig = useMapStore.getState().mapConfig;
    if (!currentConfig) return;
    const newConfig = coreUpdatePoi(currentConfig, dragState.poiId, { position: pos });
    useMapStore.setState({ mapConfig: newConfig });
  }

  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>): void {
    if (!dragState || !imageSize) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    const rect = getSvgRect();
    if (rect) {
      const pos = toSvgCoords(e.clientX, e.clientY, rect, imageSize);
      useMapStore.getState().updatePoi(dragState.poiId, { position: pos });
    }
    setDragState(null);
  }

  function onPinPointerDown(e: React.PointerEvent<SVGGElement>, poiId: string): void {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedItemId(poiId);
      const pointerId = e.pointerId;
      setDragState({ poiId, pointerId });
      svgRef.current?.setPointerCapture(pointerId);
    }
  }

  function onNodePointerDown(e: React.PointerEvent<SVGGElement>, nodeId: string): void {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedItemId(nodeId);
    } else if (activeTool === 'drawEdge') {
      if (!edgeStartId) {
        setEdgeStartId(nodeId);
        setSelectedItemId(nodeId);
      } else if (edgeStartId === nodeId) {
        setEdgeStartId(null);
        setSelectedItemId(null);
      } else {
        addEdge({ from: edgeStartId, to: nodeId });
        setEdgeStartId(null);
      }
    }
  }

  function onEdgePointerDown(e: React.PointerEvent<SVGGElement>, from: string, to: string): void {
    e.stopPropagation();
    if (activeTool === 'select') {
      setSelectedItemId(`${from}:${to}`);
    }
  }

  if (!mapConfig) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        No map loaded. Set a background image URL to get started.
      </div>
    );
  }

  if (!imageSize) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px',
        }}
      >
        Loading map image…
      </div>
    );
  }

  function nodeById(id: string): GraphNode | undefined {
    return mapConfig!.graph.nodes.find((n) => n.id === id);
  }

  const cursor = (() => {
    if (activeTool === 'placePoi' || activeTool === 'placeNode' || activeTool === 'setCenter') return 'crosshair';
    if (activeTool === 'drawEdge') return edgeStartId ? 'crosshair' : 'copy';
    return 'default';
  })();

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${imageSize.w} ${imageSize.h}`}
      style={{ width: '100%', height: '100%', display: 'block', cursor }}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <image
        href={mapConfig.map.backgroundImageUrl}
        x={0}
        y={0}
        width={imageSize.w}
        height={imageSize.h}
      />
      <g style={{ pointerEvents: 'none' }}>
        <line
          x1={mapConfig.map.center.x - 14}
          y1={mapConfig.map.center.y}
          x2={mapConfig.map.center.x + 14}
          y2={mapConfig.map.center.y}
          stroke="#059669"
          strokeWidth={2}
        />
        <line
          x1={mapConfig.map.center.x}
          y1={mapConfig.map.center.y - 14}
          x2={mapConfig.map.center.x}
          y2={mapConfig.map.center.y + 14}
          stroke="#059669"
          strokeWidth={2}
        />
        <circle
          cx={mapConfig.map.center.x}
          cy={mapConfig.map.center.y}
          r={5}
          fill="none"
          stroke="#059669"
          strokeWidth={2}
        />
      </g>
      {mapConfig.graph.edges.map((edge) => {
        const fromNode = nodeById(edge.from);
        const toNode = nodeById(edge.to);
        if (!fromNode || !toNode) return null;
        const edgeKey = `${edge.from}:${edge.to}`;
        return (
          <RoadEdge
            key={edgeKey}
            edge={edge}
            fromNode={fromNode}
            toNode={toNode}
            isSelected={selectedItemId === edgeKey}
            onPointerDown={(e) => onEdgePointerDown(e, edge.from, edge.to)}
          />
        );
      })}
      {mapConfig.graph.nodes.map((node) => (
        <RoadNode
          key={node.id}
          node={node}
          isSelected={selectedItemId === node.id}
          isEdgeStart={edgeStartId === node.id}
          onPointerDown={(e) => onNodePointerDown(e, node.id)}
        />
      ))}
      {mapConfig.pois.map((poi) => (
        <PoiPin
          key={poi.id}
          poi={poi}
          isSelected={poi.id === selectedItemId}
          onPointerDown={(e) => onPinPointerDown(e, poi.id)}
        />
      ))}
    </svg>
  );
}

interface RoadEdgeProps {
  edge: GraphEdge;
  fromNode: GraphNode;
  toNode: GraphNode;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function RoadEdge({ edge, fromNode, toNode, isSelected, onPointerDown }: RoadEdgeProps): JSX.Element {
  const x1 = fromNode.position.x;
  const y1 = fromNode.position.y;
  const x2 = toNode.position.x;
  const y2 = toNode.position.y;
  return (
    <g data-edge-from={edge.from} data-edge-to={edge.to} onPointerDown={onPointerDown}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={20} strokeLinecap="round" />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        data-edge-from={edge.from}
        data-edge-to={edge.to}
        stroke={isSelected ? '#f59e0b' : '#6b7280'}
        strokeWidth={isSelected ? 4 : 2}
        strokeLinecap="round"
      />
    </g>
  );
}

interface RoadNodeProps {
  node: GraphNode;
  isSelected: boolean;
  isEdgeStart: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function RoadNode({ node, isSelected, isEdgeStart, onPointerDown }: RoadNodeProps): JSX.Element {
  const { x, y } = node.position;
  return (
    <g data-node-id={node.id} onPointerDown={onPointerDown} style={{ cursor: 'pointer' }}>
      {isEdgeStart && (
        <rect x={x - 10} y={y - 10} width={20} height={20} fill="none" stroke="#f59e0b" strokeWidth={3} rx={3} />
      )}
      <rect
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
        fill={isSelected ? '#f97316' : '#6b7280'}
        stroke={isSelected ? '#ea580c' : '#374151'}
        strokeWidth={2}
        rx={2}
      />
    </g>
  );
}

interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function PoiPin({ poi, isSelected, onPointerDown }: PoiPinProps): JSX.Element {
  return (
    <g data-poi-id={poi.id} onPointerDown={onPointerDown} style={{ cursor: 'pointer' }}>
      <circle
        cx={poi.position.x}
        cy={poi.position.y}
        r={10}
        fill={isSelected ? '#2563eb' : '#ef4444'}
        stroke={isSelected ? '#1d4ed8' : '#b91c1c'}
        strokeWidth={2}
      />
    </g>
  );
}

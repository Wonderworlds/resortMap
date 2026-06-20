import { useEffect, useRef, useState } from 'react';
import type { POI, GraphNode, GraphEdge } from '@resort-map/types';
import { updatePoi as coreUpdatePoi } from '@resort-map/builder-core';
import { useMapStore } from '../store/mapStore';
import { ScaleDialog } from './ScaleDialog';

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
  const [streetLastNodeId, setStreetLastNodeId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [scalePoint1, setScalePoint1] = useState<{ x: number; y: number } | null>(null);
  const [scalePoint2, setScalePoint2] = useState<{ x: number; y: number } | null>(null);
  const [showScaleDialog, setShowScaleDialog] = useState(false);

  useEffect(() => {
    if (!mapConfig?.map.backgroundImageUrl) return;
    setImageSize(null);
    const img = new Image();
    img.onload = () => setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImageSize(null);
    img.src = mapConfig.map.backgroundImageUrl;
  }, [mapConfig?.map.backgroundImageUrl]);

  useEffect(() => {
    if (activeTool !== 'drawStreet') setStreetLastNodeId(null);
    if (activeTool !== 'placePoi' && activeTool !== 'drawStreet' && activeTool !== 'setScale') setHoverPos(null);
    if (activeTool !== 'setScale') {
      setScalePoint1(null);
      setScalePoint2(null);
      setShowScaleDialog(false);
    }
  }, [activeTool]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setStreetLastNodeId(null);
        setScalePoint1(null);
        setScalePoint2(null);
        setShowScaleDialog(false);
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

  function clientToSvg(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  function onSvgPointerDown(e: React.PointerEvent<SVGSVGElement>): void {
    if (!imageSize) return;
    const pos = clientToSvg(e.clientX, e.clientY);
    if (!pos) return;

    if (activeTool === 'placePoi') {
      addPoi({ label: 'New POI', position: pos, tags: [] });
      const newPois = useMapStore.getState().mapConfig!.pois;
      const newId = newPois[newPois.length - 1]!.id;
      setSelectedItemId(newId);
    } else if (activeTool === 'drawStreet') {
      addNode({ position: pos });
      const nodes = useMapStore.getState().mapConfig!.graph.nodes;
      const newId = nodes[nodes.length - 1]!.id;
      const prevId = streetLastNodeId;
      setStreetLastNodeId(newId);
      setSelectedItemId(newId);
      if (prevId) addEdge({ from: prevId, to: newId });
    } else if (activeTool === 'setCenter') {
      updateMapMeta({ center: pos });
      setActiveTool('select');
    } else if (activeTool === 'setScale') {
      if (!scalePoint1) {
        setScalePoint1(pos);
      } else if (!showScaleDialog) {
        setScalePoint2(pos);
        setShowScaleDialog(true);
      }
    }
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>): void {
    const pos = clientToSvg(e.clientX, e.clientY);
    if (!pos) return;

    if (activeTool === 'placePoi' || activeTool === 'drawStreet' || activeTool === 'setCenter' || activeTool === 'setScale') {
      setHoverPos(pos);
    }

    if (dragState && imageSize) {
      const currentConfig = useMapStore.getState().mapConfig;
      if (!currentConfig) return;
      const newConfig = coreUpdatePoi(currentConfig, dragState.poiId, { position: pos });
      useMapStore.setState({ mapConfig: newConfig });
    }
  }

  function onSvgPointerLeave(): void {
    setHoverPos(null);
  }

  function onSvgPointerUp(e: React.PointerEvent<SVGSVGElement>): void {
    if (!dragState || !imageSize) return;
    svgRef.current?.releasePointerCapture(e.pointerId);
    const pos = clientToSvg(e.clientX, e.clientY);
    if (pos) {
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
    } else if (activeTool === 'drawStreet') {
      if (streetLastNodeId && streetLastNodeId !== nodeId) {
        addEdge({ from: streetLastNodeId, to: nodeId });
      }
      setStreetLastNodeId(nodeId);
      setSelectedItemId(nodeId);
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
    if (activeTool === 'placePoi' || activeTool === 'drawStreet' || activeTool === 'setCenter' || activeTool === 'setScale') return 'crosshair';
    return 'default';
  })();

  function onScaleConfirm(scale: number): void {
    updateMapMeta({ scale });
    setScalePoint1(null);
    setScalePoint2(null);
    setShowScaleDialog(false);
    setActiveTool('select');
  }

  function onScaleCancel(): void {
    setScalePoint1(null);
    setScalePoint2(null);
    setShowScaleDialog(false);
  }

  const scalePixelDist = scalePoint1 && scalePoint2
    ? Math.sqrt((scalePoint2.x - scalePoint1.x) ** 2 + (scalePoint2.y - scalePoint1.y) ** 2)
    : 0;

  return (
    <>
    <svg
      ref={svgRef}
      viewBox={`0 0 ${imageSize.w} ${imageSize.h}`}
      style={{ width: '100%', height: '100%', display: 'block', cursor }}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
      onPointerLeave={onSvgPointerLeave}
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
          isChainEnd={streetLastNodeId === node.id}
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
      {activeTool === 'drawStreet' && streetLastNodeId && hoverPos && (() => {
        const anchor = mapConfig.graph.nodes.find((n) => n.id === streetLastNodeId);
        if (!anchor) return null;
        return (
          <line
            x1={anchor.position.x} y1={anchor.position.y}
            x2={hoverPos.x} y2={hoverPos.y}
            stroke="#6b7280" strokeWidth={2} strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }}
          />
        );
      })()}
      {activeTool === 'placePoi' && hoverPos && (
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={hoverPos.x} cy={hoverPos.y} r={10} fill="#ef4444" stroke="#b91c1c" strokeWidth={2} opacity={0.5} />
          <text x={hoverPos.x + 14} y={hoverPos.y + 4} fontSize={12} fill="#ef4444" stroke="white" strokeWidth={3} paintOrder="stroke">
            {`(${hoverPos.x}, ${hoverPos.y})`}
          </text>
        </g>
      )}
      {activeTool === 'setScale' && (
        <g style={{ pointerEvents: 'none' }}>
          {scalePoint1 && <ScaleMarker pos={scalePoint1} />}
          {scalePoint1 && !scalePoint2 && hoverPos && (
            <line x1={scalePoint1.x} y1={scalePoint1.y} x2={hoverPos.x} y2={hoverPos.y}
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" />
          )}
          {scalePoint1 && scalePoint2 && (
            <>
              <line x1={scalePoint1.x} y1={scalePoint1.y} x2={scalePoint2.x} y2={scalePoint2.y}
                stroke="#f59e0b" strokeWidth={2} />
              <ScaleMarker pos={scalePoint2} />
            </>
          )}
        </g>
      )}
    </svg>
    {showScaleDialog && scalePoint1 && scalePoint2 && (
      <ScaleDialog
        pixelDistance={scalePixelDist}
        onConfirm={onScaleConfirm}
        onCancel={onScaleCancel}
      />
    )}
    </>
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
  isChainEnd: boolean;
  onPointerDown: (e: React.PointerEvent<SVGGElement>) => void;
}

function RoadNode({ node, isSelected, isChainEnd, onPointerDown }: RoadNodeProps): JSX.Element {
  const { x, y } = node.position;
  return (
    <g data-node-id={node.id} onPointerDown={onPointerDown} style={{ cursor: 'pointer' }}>
      {isChainEnd && (
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

function ScaleMarker({ pos }: { pos: { x: number; y: number } }): JSX.Element {
  return (
    <>
      <circle cx={pos.x} cy={pos.y} r={6} fill="#f59e0b" stroke="#d97706" strokeWidth={2} />
      <line x1={pos.x - 10} y1={pos.y} x2={pos.x + 10} y2={pos.y} stroke="#d97706" strokeWidth={1.5} />
      <line x1={pos.x} y1={pos.y - 10} x2={pos.x} y2={pos.y + 10} stroke="#d97706" strokeWidth={1.5} />
    </>
  );
}

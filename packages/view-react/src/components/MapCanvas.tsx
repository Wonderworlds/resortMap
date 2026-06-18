import { useState, useRef, useCallback } from 'react';
import type { Dispatch } from 'react';
import type { MapConfig, ViewerAction, POI, Route } from '@resort-map/types';
import { computeRoute } from '@resort-map/view-core';
import { RoutePath } from './RoutePath.tsx';

export interface MapCanvasProps {
  mapConfig: MapConfig;
  imageSize: { width: number; height: number } | null;
  dispatch: Dispatch<ViewerAction>;
  filteredPois?: POI[];
  selectedPoiId?: string | null;
  onRouteRequest?: (fromId: string, toId: string) => void;
  route?: Route | null;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

interface PoiPinProps {
  poi: POI;
  isSelected: boolean;
  onClick: () => void;
}

function PoiPin({ poi, isSelected, onClick }: PoiPinProps) {
  return (
    <g
      data-poi-id={poi.id}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
    >
      <circle
        cx={poi.position.x}
        cy={poi.position.y}
        r={8}
        fill={isSelected ? '#ff4444' : '#3b82f6'}
        stroke="white"
        strokeWidth={2}
      />
      {isSelected && (
        <text
          x={poi.position.x}
          y={poi.position.y - 14}
          textAnchor="middle"
          fontSize={12}
          fill="#1a1a1a"
          stroke="white"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {poi.label}
        </text>
      )}
    </g>
  );
}

export function MapCanvas({
  mapConfig,
  imageSize,
  dispatch,
  filteredPois = [],
  selectedPoiId = null,
  onRouteRequest,
  route = null,
}: MapCanvasProps) {
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // happy-dom may not support setPointerCapture
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setTransform(prev => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setTransform(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * zoomFactor));
      return {
        scale: newScale,
        tx: cx - (cx - prev.tx) * (newScale / prev.scale),
        ty: cy - (cy - prev.ty) * (newScale / prev.scale),
      };
    });
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    dispatch({
      type: 'IMAGE_LOADED',
      payload: { width: img.naturalWidth, height: img.naturalHeight },
    });
  }, [dispatch]);

  const handlePoiClick = useCallback((clickedPoiId: string) => {
    if (selectedPoiId !== null && selectedPoiId !== clickedPoiId) {
      const route = computeRoute(mapConfig, selectedPoiId, clickedPoiId);
      dispatch({ type: 'SELECT_POI', payload: clickedPoiId });
      dispatch({ type: 'SET_ROUTE', payload: route });
      onRouteRequest?.(selectedPoiId, clickedPoiId);
    } else {
      dispatch({ type: 'SELECT_POI', payload: clickedPoiId });
    }
  }, [selectedPoiId, mapConfig, dispatch, onRouteRequest]);

  const { tx, ty, scale } = transform;

  return (
    <div
      data-testid="map-canvas"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        cursor: 'grab',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        data-testid="map-transform"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
        }}
      >
        <img
          src={mapConfig.map.backgroundImageUrl}
          alt=""
          draggable={false}
          onLoad={handleImageLoad}
          style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
        <svg
          data-testid="map-overlay"
          viewBox={imageSize ? `0 0 ${imageSize.width} ${imageSize.height}` : undefined}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: imageSize?.width ?? 0,
            height: imageSize?.height ?? 0,
            overflow: 'visible',
          }}
        >
          {route && <RoutePath route={route} />}
          {filteredPois.map(poi => (
            <PoiPin
              key={poi.id}
              poi={poi}
              isSelected={selectedPoiId === poi.id}
              onClick={() => handlePoiClick(poi.id)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

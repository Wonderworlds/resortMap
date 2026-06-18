import type { Position } from '@resort-map/types';

export function pixelDistance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pixelsToMeters(pixels: number, scale: number): number {
  return pixels * scale;
}

export function estimateWalkTime(distanceMeters: number): number {
  return Math.round(distanceMeters / 1.4);
}

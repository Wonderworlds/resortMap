import type { MapConfig, POI, PoiFilterOptions } from '@resort-map/types';
import { ErrorCode } from '@resort-map/types';
import { pixelDistance, pixelsToMeters } from './utils/pixelMath.ts';

export function filterPois(config: MapConfig, options: PoiFilterOptions): POI[] {
  if (options.maxDistanceMeters !== undefined && options.origin === undefined) {
    throw Object.assign(
      new Error('filterPois: maxDistanceMeters requires origin'),
      { code: ErrorCode.INVALID_POSITION },
    );
  }

  return config.pois.filter((poi) => {
    const { tags, maxDistanceMeters, origin } = options;

    if (tags !== undefined && tags.length > 0) {
      if (!tags.some((t) => poi.tags.includes(t))) return false;
    }

    if (maxDistanceMeters !== undefined && origin !== undefined) {
      const distMeters = pixelsToMeters(
        pixelDistance(poi.position, origin),
        config.map.scale,
      );
      if (distMeters > maxDistanceMeters) return false;
    }

    return true;
  });
}

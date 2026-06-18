import type { MapConfig, POI, Route, Position } from './schema';

export type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PoiFilterOptions {
  tags?: string[];
  maxDistanceMeters?: number;
  origin?: Position;
}

export interface ViewerState {
  status: ViewerStatus;
  mapConfig: MapConfig | null;
  route: Route | null;
  filteredPois: POI[];
  selectedPoiId: string | null;
  imageSize: { width: number; height: number } | null;
  filterOptions: PoiFilterOptions;
  error?: string;
}

export type ViewerAction =
  | { type: 'MAP_LOADED'; payload: MapConfig }
  | { type: 'SELECT_POI'; payload: string }
  | { type: 'SET_ROUTE'; payload: Route | null }
  | { type: 'SET_FILTER'; payload: PoiFilterOptions }
  | { type: 'IMAGE_LOADED'; payload: { width: number; height: number } }
  | { type: 'SET_ERROR'; payload: string };

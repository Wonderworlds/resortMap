import type { ViewerState, ViewerAction } from '@resort-map/types';
import { filterPois } from './filterPois.ts';

export const initialViewerState: ViewerState = {
  status: 'idle',
  mapConfig: null,
  route: null,
  filteredPois: [],
  selectedPoiId: null,
  imageSize: null,
  filterOptions: {},
};

export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'MAP_LOADED':
      return {
        ...state,
        status: 'ready',
        mapConfig: action.payload,
        filteredPois: action.payload.pois,
      };
    case 'SELECT_POI':
      return { ...state, selectedPoiId: action.payload };
    case 'SET_ROUTE':
      return { ...state, route: action.payload };
    case 'SET_FILTER': {
      const newOptions = action.payload;
      const newFilteredPois = state.mapConfig
        ? filterPois(state.mapConfig, newOptions)
        : [];
      return { ...state, filterOptions: newOptions, filteredPois: newFilteredPois };
    }
    case 'IMAGE_LOADED':
      return { ...state, imageSize: action.payload };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
  }
}

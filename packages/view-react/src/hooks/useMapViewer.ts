import { useReducer, useEffect } from 'react';
import type { MapConfig } from '@resort-map/types';
import { viewerReducer, initialViewerState, parseGwmap } from '@resort-map/view-core';

export function useMapViewer(source: string | MapConfig) {
  const [state, dispatch] = useReducer(viewerReducer, initialViewerState);

  useEffect(() => {
    if (typeof source === 'string') {
      try {
        const config = parseGwmap(source);
        dispatch({ type: 'MAP_LOADED', payload: config });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load map';
        dispatch({ type: 'SET_ERROR', payload: message });
      }
    } else {
      dispatch({ type: 'MAP_LOADED', payload: source });
    }
  }, []); // mount-only: source reactivity is post-v1

  return { state, dispatch };
}

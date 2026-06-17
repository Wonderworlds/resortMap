import { create } from 'zustand';
import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge } from '@resort-map/types';
import {
  createMapConfig,
  addPoi as coreAddPoi,
  removePoi as coreRemovePoi,
  updatePoi as coreUpdatePoi,
  addNode as coreAddNode,
  removeNode as coreRemoveNode,
  addEdge as coreAddEdge,
  removeEdge as coreRemoveEdge,
} from '@resort-map/builder-core';

export type ActiveTool = 'select' | 'placePoi' | 'placeNode' | 'drawEdge';

const MAX_UNDO = 50;

function pushUndo(stack: MapConfig[], config: MapConfig): MapConfig[] {
  return [...stack.slice(-(MAX_UNDO - 1)), config];
}

interface MapStore {
  mapConfig: MapConfig | null;
  activeTool: ActiveTool;
  selectedItemId: string | null;
  undoStack: MapConfig[];

  setActiveTool: (tool: ActiveTool) => void;
  setSelectedItemId: (id: string | null) => void;
  undo: () => void;
  initMap: (meta: MapMeta) => void;
  addPoi: (poi: Omit<POI, 'id'>) => void;
  removePoi: (poiId: string) => void;
  updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
  addNode: (node: Omit<GraphNode, 'id'>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (from: string, to: string) => void;
}

export const useMapStore = create<MapStore>()((set) => ({
  mapConfig: null,
  activeTool: 'select',
  selectedItemId: null,
  undoStack: [],

  setActiveTool: (tool) => set({ activeTool: tool }),

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const prev = state.undoStack[state.undoStack.length - 1]!;
      return { mapConfig: prev, undoStack: state.undoStack.slice(0, -1) };
    }),

  initMap: (meta) =>
    set({ mapConfig: createMapConfig(meta), undoStack: [], selectedItemId: null }),

  addPoi: (poi) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddPoi(state.mapConfig, poi),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  removePoi: (poiId) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreRemovePoi(state.mapConfig, poiId),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        selectedItemId: state.selectedItemId === poiId ? null : state.selectedItemId,
      };
    }),

  updatePoi: (poiId, patch) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreUpdatePoi(state.mapConfig, poiId, patch),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  addNode: (node) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddNode(state.mapConfig, node),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  removeNode: (nodeId) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreRemoveNode(state.mapConfig, nodeId),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        selectedItemId: state.selectedItemId === nodeId ? null : state.selectedItemId,
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddEdge(state.mapConfig, edge),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
      };
    }),

  removeEdge: (from, to) =>
    set((state) => {
      if (!state.mapConfig) return {};
      const edgeKey = `${from}:${to}`;
      return {
        mapConfig: coreRemoveEdge(state.mapConfig, from, to),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        selectedItemId: state.selectedItemId === edgeKey ? null : state.selectedItemId,
      };
    }),
}));

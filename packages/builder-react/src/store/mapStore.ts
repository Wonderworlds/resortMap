import { create } from 'zustand';
import type { MapConfig, MapMeta, POI, GraphNode, GraphEdge, Position } from '@resort-map/types';
import {
  createMapConfig,
  addPoi as coreAddPoi,
  removePoi as coreRemovePoi,
  updatePoi as coreUpdatePoi,
  movePoiWithNode as coreMovePoiWithNode,
  addNode as coreAddNode,
  updateNode as coreUpdateNode,
  updateNodePosition as coreUpdateNodePosition,
  removeNode as coreRemoveNode,
  addEdge as coreAddEdge,
  removeEdge as coreRemoveEdge,
} from '@resort-map/builder-core';

export type ActiveTool = 'select' | 'placePoi' | 'drawStreet' | 'setCenter' | 'setScale' | 'pan';

const MAX_UNDO = 50;

function pushUndo(stack: MapConfig[], config: MapConfig): MapConfig[] {
  return [...stack.slice(-(MAX_UNDO - 1)), config];
}

interface MapStore {
  mapConfig: MapConfig | null;
  activeTool: ActiveTool;
  selectedItemId: string | null;
  undoStack: MapConfig[];
  redoStack: MapConfig[];

  setActiveTool: (tool: ActiveTool) => void;
  setSelectedItemId: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  initMap: (meta: MapMeta) => void;
  addPoi: (poi: Omit<POI, 'id'>) => void;
  removePoi: (poiId: string) => void;
  updatePoi: (poiId: string, patch: Partial<Omit<POI, 'id'>>) => void;
  movePoi: (poiId: string, position: Position) => void;
  addNode: (node: Omit<GraphNode, 'id'>) => void;
  updateNode: (nodeId: string, patch: Partial<Omit<GraphNode, 'id'>>) => void;
  moveNode: (nodeId: string, position: Position) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (from: string, to: string) => void;
  updateMapMeta: (patch: Partial<MapMeta>) => void;
  savedMapConfig: MapConfig | null;
  setSavedMapConfig: (config: MapConfig | null) => void;
}

export const useMapStore = create<MapStore>()((set) => ({
  mapConfig: null,
  activeTool: 'select',
  selectedItemId: null,
  undoStack: [],
  redoStack: [],
  savedMapConfig: null,

  setActiveTool: (tool) => set({ activeTool: tool }),

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const prev = state.undoStack[state.undoStack.length - 1]!;
      return {
        mapConfig: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: state.mapConfig !== null
          ? [...state.redoStack.slice(-(MAX_UNDO - 1)), state.mapConfig]
          : state.redoStack,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return {};
      const next = state.redoStack[state.redoStack.length - 1]!;
      return {
        mapConfig: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: state.mapConfig !== null
          ? pushUndo(state.undoStack, state.mapConfig)
          : state.undoStack,
      };
    }),

  initMap: (meta) =>
    set({ mapConfig: createMapConfig(meta), undoStack: [], redoStack: [], selectedItemId: null }),

  addPoi: (poi) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddPoi(state.mapConfig, poi),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  removePoi: (poiId) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreRemovePoi(state.mapConfig, poiId),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
        selectedItemId: state.selectedItemId === poiId ? null : state.selectedItemId,
      };
    }),

  updatePoi: (poiId, patch) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreUpdatePoi(state.mapConfig, poiId, patch),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  movePoi: (poiId, position) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreMovePoiWithNode(state.mapConfig, poiId, position),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  addNode: (node) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddNode(state.mapConfig, node),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  updateNode: (nodeId, patch) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreUpdateNode(state.mapConfig, nodeId, patch),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  moveNode: (nodeId, position) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreUpdateNodePosition(state.mapConfig, nodeId, position),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  removeNode: (nodeId) =>
    set((state) => {
      if (!state.mapConfig) return {};
      const current = state.selectedItemId;
      let shouldClearSelection = current === nodeId;
      if (!shouldClearSelection && current !== null) {
        const colonIdx = current.indexOf(':');
        if (colonIdx !== -1) {
          const edgeFrom = current.slice(0, colonIdx);
          const edgeTo = current.slice(colonIdx + 1);
          shouldClearSelection = edgeFrom === nodeId || edgeTo === nodeId;
        }
      }
      return {
        mapConfig: coreRemoveNode(state.mapConfig, nodeId),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
        selectedItemId: shouldClearSelection ? null : current,
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: coreAddEdge(state.mapConfig, edge),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  removeEdge: (from, to) =>
    set((state) => {
      if (!state.mapConfig) return {};
      const edgeKey = `${from}:${to}`;
      return {
        mapConfig: coreRemoveEdge(state.mapConfig, from, to),
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
        selectedItemId: state.selectedItemId === edgeKey ? null : state.selectedItemId,
      };
    }),

  updateMapMeta: (patch) =>
    set((state) => {
      if (!state.mapConfig) return {};
      return {
        mapConfig: { ...state.mapConfig, map: { ...state.mapConfig.map, ...patch } },
        undoStack: pushUndo(state.undoStack, state.mapConfig),
        redoStack: [],
      };
    }),

  setSavedMapConfig: (config) => set({ savedMapConfig: config }),
}));

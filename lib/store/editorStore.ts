/**
 * Editor Store
 *
 * Zustand store for managing floor plan editor state.
 * Uses React Context pattern for easy testing and SSR compatibility.
 */

import { create } from 'zustand';
import type { EditorStore, EditorState } from './types';

/**
 * Default wall thickness (200mm = standard interior wall)
 */
const DEFAULT_WALL_THICKNESS = 200;

/**
 * Default opening widths
 */
const DEFAULT_DOOR_WIDTH = 900;
const DEFAULT_WINDOW_WIDTH = 1200;

/**
 * Initial editor state
 */
const initialState: EditorState = {
  project: null,
  currentTool: 'select',
  selectedElement: null,
  drawingStartPoint: null,
  wallThickness: DEFAULT_WALL_THICKNESS,
  openingWidth: DEFAULT_DOOR_WIDTH,
  nextOpeningType: 'door',
};

/**
 * Create editor store with Zustand
 */
export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  // Project management
  setProject: (project) => set({ project, selectedElement: null, drawingStartPoint: null }),

  updateProject: (updater) =>
    set((state) => {
      if (!state.project) return state;
      return { project: updater(state.project) };
    }),

  // Tool management
  setCurrentTool: (currentTool) =>
    set({
      currentTool,
      drawingStartPoint: null, // Clear drawing state when switching tools
      selectedElement: currentTool !== 'select' ? null : undefined, // Keep selection if switching to select tool
    }),

  // Selection management
  selectElement: (selectedElement) => set({ selectedElement }),

  clearSelection: () => set({ selectedElement: null }),

  // Drawing state
  setDrawingStartPoint: (drawingStartPoint) => set({ drawingStartPoint }),

  // Settings
  setWallThickness: (wallThickness) => set({ wallThickness }),

  setOpeningWidth: (openingWidth) => set({ openingWidth }),

  setNextOpeningType: (nextOpeningType) =>
    set({
      nextOpeningType,
      openingWidth: nextOpeningType === 'door' ? DEFAULT_DOOR_WIDTH : DEFAULT_WINDOW_WIDTH,
    }),

  // Reset
  reset: () => set(initialState),
}));

/**
 * Utility hooks for common state selections
 */

export const useCurrentTool = () => useEditorStore((state) => state.currentTool);
export const useSelectedElement = () => useEditorStore((state) => state.selectedElement);
export const useProject = () => useEditorStore((state) => state.project);
export const useDrawingStartPoint = () => useEditorStore((state) => state.drawingStartPoint);
export const useWallThickness = () => useEditorStore((state) => state.wallThickness);
export const useOpeningWidth = () => useEditorStore((state) => state.openingWidth);
export const useNextOpeningType = () => useEditorStore((state) => state.nextOpeningType);

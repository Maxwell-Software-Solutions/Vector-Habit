/**
 * Editor Store
 *
 * Zustand store for managing floor plan editor state.
 * Uses React Context pattern for easy testing and SSR compatibility.
 */

import { create } from 'zustand';
import { createId } from '@paralleldrive/cuid2';
import type { EditorStore, EditorState } from './types';
import type { Wall, Opening } from '@/lib/ir/schema';

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
  clipboard: null,
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

  // Clipboard operations
  copySelected: () =>
    set((state) => {
      if (!state.project || !state.selectedElement) return state;

      const level = state.project.levels[state.selectedElement.levelIndex];
      if (!level) return state;

      if (state.selectedElement.type === 'wall') {
        const wall = level.walls.find((w) => w.id === state.selectedElement!.id);
        if (wall) {
          return { clipboard: { type: 'wall', data: { ...wall } } };
        }
      } else if (state.selectedElement.type === 'opening') {
        const opening = level.openings.find((o) => o.id === state.selectedElement!.id);
        if (opening) {
          return { clipboard: { type: 'opening', data: { ...opening } } };
        }
      }

      return state;
    }),

  pasteFromClipboard: () =>
    set((state) => {
      if (!state.project || !state.clipboard) return state;

      const level = state.project.levels[0];
      if (!level) return state;

      if (state.clipboard.type === 'wall') {
        const newWall: Wall = {
          ...state.clipboard.data,
          id: createId(),
          // Offset by 1000mm (1m) so it's visible
          a: { x: state.clipboard.data.a.x + 1000, y: state.clipboard.data.a.y + 1000 },
          b: { x: state.clipboard.data.b.x + 1000, y: state.clipboard.data.b.y + 1000 },
        };
        level.walls.push(newWall);
        return {
          project: { ...state.project },
          selectedElement: { type: 'wall', id: newWall.id, levelIndex: 0 },
        };
      } else if (state.clipboard.type === 'opening') {
        const newOpening: Opening = {
          ...state.clipboard.data,
          id: createId(),
        };
        level.openings.push(newOpening);
        return {
          project: { ...state.project },
          selectedElement: { type: 'opening', id: newOpening.id, levelIndex: 0 },
        };
      }

      return state;
    }),

  duplicateSelected: () =>
    set((state) => {
      if (!state.project || !state.selectedElement) return state;

      const level = state.project.levels[state.selectedElement.levelIndex];
      if (!level) return state;

      if (state.selectedElement.type === 'wall') {
        const wall = level.walls.find((w) => w.id === state.selectedElement!.id);
        if (wall) {
          const newWall: Wall = {
            ...wall,
            id: createId(),
            a: { x: wall.a.x + 1000, y: wall.a.y + 1000 },
            b: { x: wall.b.x + 1000, y: wall.b.y + 1000 },
          };
          level.walls.push(newWall);
          return {
            project: { ...state.project },
            selectedElement: { type: 'wall', id: newWall.id, levelIndex: state.selectedElement.levelIndex },
          };
        }
      } else if (state.selectedElement.type === 'opening') {
        const opening = level.openings.find((o) => o.id === state.selectedElement!.id);
        if (opening) {
          const newOpening: Opening = {
            ...opening,
            id: createId(),
          };
          level.openings.push(newOpening);
          return {
            project: { ...state.project },
            selectedElement: { type: 'opening', id: newOpening.id, levelIndex: state.selectedElement.levelIndex },
          };
        }
      }

      return state;
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

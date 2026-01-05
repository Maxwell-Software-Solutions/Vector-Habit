/**
 * Editor State Types
 *
 * Central type definitions for the floor plan editor state management.
 */

import type { Project, Wall, Opening } from '@/lib/ir/schema';

/**
 * Available editor tools
 */
export type EditorTool = 'select' | 'draw-wall' | 'add-door' | 'add-window';

/**
 * Type of element that can be selected
 */
export type SelectableElementType = 'wall' | 'opening';

/**
 * Selected element reference
 */
export interface SelectedElement {
  type: SelectableElementType;
  id: string;
  levelIndex: number;
}

/**
 * Temporary point while drawing
 */
export interface DrawingPoint {
  x: number;
  y: number;
}

/**
 * Editor state for the floor plan editor
 */
export interface EditorState {
  // Current project (mutable for editing)
  project: Project | null;

  // Current active tool
  currentTool: EditorTool;

  // Selected element (wall or opening)
  selectedElement: SelectedElement | null;

  // Drawing state for wall tool
  drawingStartPoint: DrawingPoint | null;

  // Wall thickness setting (in mm)
  wallThickness: number;

  // Opening width setting (in mm)
  openingWidth: number;

  // Opening type for next placement
  nextOpeningType: 'door' | 'window';
}

/**
 * Editor actions
 */
export interface EditorActions {
  // Project management
  setProject: (project: Project | null) => void;
  updateProject: (updater: (project: Project) => Project) => void;

  // Tool management
  setCurrentTool: (tool: EditorTool) => void;

  // Selection management
  selectElement: (element: SelectedElement | null) => void;
  clearSelection: () => void;

  // Drawing state
  setDrawingStartPoint: (point: DrawingPoint | null) => void;

  // Settings
  setWallThickness: (thickness: number) => void;
  setOpeningWidth: (width: number) => void;
  setNextOpeningType: (type: 'door' | 'window') => void;

  // Reset
  reset: () => void;
}

/**
 * Complete editor store (state + actions)
 */
export type EditorStore = EditorState & EditorActions;

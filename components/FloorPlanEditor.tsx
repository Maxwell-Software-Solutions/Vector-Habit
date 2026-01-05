/**
 * FloorPlanEditor
 *
 * Interactive floor plan editor with drawing, selection, and editing capabilities.
 * Extends FloorPlanViewer with user interaction features.
 */

'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { createId } from '@paralleldrive/cuid2';

import type { Project, Wall, Opening, Point } from '@/lib/ir/schema';
import { deriveWallGeometry } from '@/lib/geometry/wallGeometry';
import { deriveOpeningGeometry } from '@/lib/geometry/openingGeometry';
import { useEditorStore } from '@/lib/store/editorStore';
import {
  commandHistory,
  AddWallCommand,
  AddOpeningCommand,
  RemoveWallCommand,
  RemoveOpeningCommand,
} from '@/lib/commands';
import { snapToGrid, pointToLineDistance, canvasToWorld } from '@/lib/utils/geometry';

interface FloorPlanEditorProps {
  project: Project;
  width?: number;
  height?: number;
  onProjectChange?: (project: Project) => void;
}

const GRID_SIZE = 1000; // 1m grid
const WALL_HOVER_THRESHOLD = 50; // 50mm threshold for wall click detection
const ZOOM_SPEED = 0.0005;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2.0;

export function FloorPlanEditor({
  project: initialProject,
  width = 1000,
  height = 700,
  onProjectChange,
}: FloorPlanEditorProps) {
  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState(0.1);
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);

  // Editor store
  const {
    project,
    currentTool,
    selectedElement,
    drawingStartPoint,
    wallThickness,
    openingWidth,
    nextOpeningType,
    setProject,
    selectElement,
    setDrawingStartPoint,
    updateProject,
  } = useEditorStore();

  // Initialize project in store
  useEffect(() => {
    setProject(initialProject);
  }, [initialProject, setProject]);

  // Notify parent of changes
  useEffect(() => {
    if (project && onProjectChange) {
      onProjectChange(project);
    }
  }, [project, onProjectChange]);

  // Derive geometry (before hooks that use it)
  const level = project?.levels[0];
  const walls = level?.walls || [];
  const openings = level?.openings || [];
  const wallGeometries = walls.map((wall) => ({
    wall,
    geometry: deriveWallGeometry(wall),
  }));
  const openingGeometries = openings
    .map((opening) => {
      const parentWall = walls.find((w) => w.id === opening.wallId);
      if (!parentWall) return null;
      return {
        opening,
        geometry: deriveOpeningGeometry(opening, parentWall),
      };
    })
    .filter(Boolean);

  // Zoom handler
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, oldScale * (1 + direction * ZOOM_SPEED * Math.abs(e.evt.deltaY)))
      );

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setPosition(newPos);
    },
    [scale, position]
  );

  // Pan handlers
  const handleDragStart = useCallback(() => {
    if (currentTool === 'select') {
      setIsDragging(true);
    }
  }, [currentTool]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (isDragging) {
        setPosition(e.target.position());
      }
    },
    [isDragging]
  );

  // Mouse move handler (for preview and hover)
  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldPos = canvasToWorld(pointer.x, pointer.y, scale, position);
      setCursorPosition(worldPos);

      // Check for wall hover
      if (currentTool === 'select' || currentTool === 'add-door' || currentTool === 'add-window') {
        let foundHover = false;
        for (const { wall } of wallGeometries) {
          const distance = pointToLineDistance(worldPos, wall.a, wall.b);
          if (distance < WALL_HOVER_THRESHOLD) {
            setHoveredWallId(wall.id);
            foundHover = true;
            break;
          }
        }
        if (!foundHover) {
          setHoveredWallId(null);
        }
      }
    },
    [scale, position, currentTool, wallGeometries]
  );

  // Click handler
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldPos = canvasToWorld(pointer.x, pointer.y, scale, position);
      const snappedPos = snapToGrid(worldPos, GRID_SIZE);

      // Handle different tools
      if (currentTool === 'draw-wall') {
        if (!drawingStartPoint) {
          // Start drawing wall
          setDrawingStartPoint(snappedPos);
        } else {
          // Finish drawing wall
          const newWall: Wall = {
            id: `w${Date.now()}`,
            a: { x: drawingStartPoint.x, y: drawingStartPoint.y },
            b: { x: snappedPos.x, y: snappedPos.y },
            thicknessMm: wallThickness,
            heightMm: 2700,
          };

          if (!project) return;
          const command = new AddWallCommand(newWall, project, 0);
          commandHistory.execute(command);
          updateProject((p) => ({ ...p })); // Trigger re-render

          // Reset drawing state
          setDrawingStartPoint(null);
        }
      } else if (currentTool === 'add-door' || currentTool === 'add-window') {
        // Find clicked wall
        const clickedWall = wallGeometries.find(({ wall }) => {
          const distance = pointToLineDistance(worldPos, wall.a, wall.b);
          return distance < WALL_HOVER_THRESHOLD;
        });

        if (clickedWall) {
          // Calculate offset along wall
          const wall = clickedWall.wall;
          const dx = wall.b.x - wall.a.x;
          const dy = wall.b.y - wall.a.y;
          const wallLength = Math.sqrt(dx * dx + dy * dy);

          // Project click point onto wall
          const vx = worldPos.x - wall.a.x;
          const vy = worldPos.y - wall.a.y;
          const dot = (vx * dx + vy * dy) / (wallLength * wallLength);
          const offsetMm = Math.max(0, Math.min(wallLength, dot * wallLength));

          const newOpening: Opening = {
            id: `o${Date.now()}`,
            type: currentTool === 'add-door' ? 'door' : 'window',
            wallId: wall.id,
            offsetMm,
            widthMm: openingWidth,
            heightMm: currentTool === 'add-door' ? 2100 : 1200,
            sillHeightMm: currentTool === 'add-door' ? 0 : 900,
          };

          if (!project) return;
          const command = new AddOpeningCommand(newOpening, project, 0);
          commandHistory.execute(command);
          updateProject((p) => ({ ...p })); // Trigger re-render
        }
      } else if (currentTool === 'select') {
        // Selection logic
        let selectedSomething = false;

        // Check wall selection
        for (const { wall } of wallGeometries) {
          const distance = pointToLineDistance(worldPos, wall.a, wall.b);
          if (distance < WALL_HOVER_THRESHOLD) {
            selectElement({ type: 'wall', id: wall.id, levelIndex: 0 });
            selectedSomething = true;
            break;
          }
        }

        // Check opening selection (if nothing else selected)
        if (!selectedSomething) {
          for (const item of openingGeometries) {
            if (!item) continue;
            const { opening, geometry } = item;
            const rect = geometry.rectangle;

            // Simple point-in-rect test (using bounding box)
            const minX = Math.min(rect.topLeft.x, rect.bottomRight.x);
            const maxX = Math.max(rect.topLeft.x, rect.bottomRight.x);
            const minY = Math.min(rect.topLeft.y, rect.bottomRight.y);
            const maxY = Math.max(rect.topLeft.y, rect.bottomRight.y);

            if (
              worldPos.x >= minX &&
              worldPos.x <= maxX &&
              worldPos.y >= minY &&
              worldPos.y <= maxY
            ) {
              selectElement({ type: 'opening', id: opening.id, levelIndex: 0 });
              selectedSomething = true;
              break;
            }
          }
        }

        // Clear selection if clicked empty space
        if (!selectedSomething) {
          selectElement(null);
        }
      }
    },
    [
      scale,
      position,
      currentTool,
      drawingStartPoint,
      wallThickness,
      openingWidth,
      project,
      wallGeometries,
      openingGeometries,
      setDrawingStartPoint,
      updateProject,
      selectElement,
    ]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          commandHistory.redo();
        } else {
          commandHistory.undo();
        }
        updateProject((p) => ({ ...p })); // Trigger re-render
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        commandHistory.redo();
        updateProject((p) => ({ ...p })); // Trigger re-render
      }
      // Cancel drawing
      else if (e.key === 'Escape') {
        setDrawingStartPoint(null);
      }
      // Delete selected element
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        e.preventDefault();
        if (!project) return;
        if (selectedElement.type === 'wall') {
          const command = new RemoveWallCommand(
            selectedElement.id,
            project,
            selectedElement.levelIndex
          );
          commandHistory.execute(command);
        } else if (selectedElement.type === 'opening') {
          const command = new RemoveOpeningCommand(
            selectedElement.id,
            project,
            selectedElement.levelIndex
          );
          commandHistory.execute(command);
        }
        selectElement(null);
        updateProject((p) => ({ ...p })); // Trigger re-render
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, project, updateProject, selectElement, setDrawingStartPoint]);

  // Early return check AFTER all hooks
  if (!project || !level) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-100">
        <p className="text-gray-500">No project loaded</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={currentTool === 'select'}
        onWheel={handleWheel}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        className="border border-gray-300 bg-white cursor-crosshair"
      >
        {/* Grid Layer */}
        <Layer>
          {Array.from({ length: 21 }).map((_, i) => {
            const pos = (i - 10) * GRID_SIZE;
            return (
              <React.Fragment key={`grid-${i}`}>
                <Line
                  points={[pos, -10 * GRID_SIZE, pos, 10 * GRID_SIZE]}
                  stroke="#e5e7eb"
                  strokeWidth={1 / scale}
                />
                <Line
                  points={[-10 * GRID_SIZE, pos, 10 * GRID_SIZE, pos]}
                  stroke="#e5e7eb"
                  strokeWidth={1 / scale}
                />
              </React.Fragment>
            );
          })}
        </Layer>

        {/* Walls Layer */}
        <Layer>
          {wallGeometries.map(({ wall, geometry }) => {
            const isSelected = selectedElement?.type === 'wall' && selectedElement.id === wall.id;
            const isHovered = hoveredWallId === wall.id;

            return (
              <Line
                key={wall.id}
                points={geometry.outline.points.flatMap((p: Point) => [p.x, p.y])}
                closed
                fill={isSelected ? '#3b82f6' : isHovered ? '#93c5fd' : '#d1d5db'}
                stroke={isSelected ? '#1d4ed8' : '#6b7280'}
                strokeWidth={2 / scale}
              />
            );
          })}
        </Layer>

        {/* Openings Layer */}
        <Layer>
          {openingGeometries.map((item) => {
            if (!item) return null;
            const { opening, geometry } = item;
            const isSelected =
              selectedElement?.type === 'opening' && selectedElement.id === opening.id;
            const rect = geometry.rectangle;

            // Calculate bounding box from rectangle points
            const minX = Math.min(rect.topLeft.x, rect.bottomRight.x);
            const minY = Math.min(rect.topLeft.y, rect.bottomRight.y);
            const width = Math.abs(rect.topRight.x - rect.topLeft.x);
            const height = Math.abs(rect.bottomLeft.y - rect.topLeft.y);

            return (
              <Rect
                key={opening.id}
                x={minX}
                y={minY}
                width={width}
                height={height}
                fill={
                  opening.type === 'door'
                    ? isSelected
                      ? '#fbbf24'
                      : '#fef3c7'
                    : isSelected
                      ? '#60a5fa'
                      : '#dbeafe'
                }
                stroke={isSelected ? '#1d4ed8' : '#6b7280'}
                strokeWidth={2 / scale}
              />
            );
          })}
        </Layer>

        {/* Drawing Preview Layer */}
        {currentTool === 'draw-wall' && drawingStartPoint && cursorPosition && (
          <Layer>
            <Line
              points={[
                drawingStartPoint.x,
                drawingStartPoint.y,
                cursorPosition.x,
                cursorPosition.y,
              ]}
              stroke="#3b82f6"
              strokeWidth={2 / scale}
              dash={[10 / scale, 5 / scale]}
            />
            <Circle
              x={drawingStartPoint.x}
              y={drawingStartPoint.y}
              radius={5 / scale}
              fill="#3b82f6"
            />
          </Layer>
        )}
      </Stage>

      {/* Controls Overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg text-sm">
        <p className="font-medium mb-1">Controls:</p>
        <ul className="space-y-0.5 text-gray-700">
          <li>• Mouse wheel: Zoom</li>
          {currentTool === 'select' && <li>• Click-drag: Pan</li>}
          {currentTool === 'draw-wall' && <li>• Click twice: Draw wall</li>}
          {(currentTool === 'add-door' || currentTool === 'add-window') && (
            <li>• Click wall: Add opening</li>
          )}
          <li>• Ctrl+Z: Undo</li>
          <li>• Ctrl+Shift+Z: Redo</li>
          {selectedElement && <li>• Delete/Backspace: Remove</li>}
        </ul>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow text-sm font-medium">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}

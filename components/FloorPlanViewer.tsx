'use client';

/**
 * FloorForge Floor Plan Viewer
 *
 * Read-only canvas component for visualizing floor plans.
 * Uses Konva.js for performant 2D rendering with pan/zoom controls.
 */

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Group, Text } from 'react-konva';
import type { Project, Level } from '@/lib/ir/schema';
import { deriveWallsGeometry, deriveOpeningsGeometry } from '@/lib/geometry';
import type { WallGeometry, OpeningGeometry } from '@/lib/geometry';

interface FloorPlanViewerProps {
  project: Project;
  width?: number;
  height?: number;
  levelId?: string; // Which level to display (defaults to first)
}

export function FloorPlanViewer({
  project,
  width = 800,
  height = 600,
  levelId,
}: FloorPlanViewerProps) {
  const [scale, setScale] = useState(0.1); // Zoom level (0.1 = 10% = 10mm per pixel)
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const stageRef = useRef<any>(null);

  // Get active level
  const level: Level = levelId
    ? project.levels.find((l) => l.id === levelId) || project.levels[0]
    : project.levels[0];

  // Derive geometry from IR
  const wallGeometries = deriveWallsGeometry(level.walls);
  const openingGeometries = deriveOpeningsGeometry(level.openings, level.walls);

  // Handle zoom with mouse wheel
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;

    // Limit zoom range
    const clampedScale = Math.max(0.05, Math.min(newScale, 0.5));
    setScale(clampedScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setPosition(newPos);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onWheel={handleWheel}
        onDragEnd={(e) => {
          setPosition({
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
      >
        <Layer>
          {/* Grid background */}
          <GridLayer width={width / scale} height={height / scale} gridSize={1000} />

          {/* Walls */}
          {wallGeometries.map((wallGeo) => (
            <WallShape key={wallGeo.wallId} geometry={wallGeo} />
          ))}

          {/* Openings */}
          {openingGeometries.map((openingGeo) => (
            <OpeningShape key={openingGeo.openingId} geometry={openingGeo} />
          ))}
        </Layer>
      </Stage>

      {/* Controls overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg text-sm">
        <div className="text-gray-700">
          <div>
            <strong>Zoom:</strong> Mouse wheel
          </div>
          <div>
            <strong>Pan:</strong> Click and drag
          </div>
          <div className="mt-2 text-xs text-gray-500">Scale: {(scale * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid background for spatial reference
 */
function GridLayer({
  width,
  height,
  gridSize,
}: {
  width: number;
  height: number;
  gridSize: number;
}) {
  const lines = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <Line key={`v-${x}`} points={[x, 0, x, height]} stroke="#e5e7eb" strokeWidth={10} />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(<Line key={`h-${y}`} points={[0, y, width, y]} stroke="#e5e7eb" strokeWidth={10} />);
  }

  return <>{lines}</>;
}

/**
 * Wall renderer - draws thick polygon with outline
 */
function WallShape({ geometry }: { geometry: WallGeometry }) {
  const { points } = geometry.outline;

  // Flatten points array for Konva (expects [x1, y1, x2, y2, ...])
  const flatPoints = points.flatMap((p) => [p.x, p.y]);

  return (
    <Line
      points={flatPoints}
      closed
      fill="#d1d5db" // Gray fill
      stroke="#6b7280" // Darker gray outline
      strokeWidth={15}
    />
  );
}

/**
 * Opening renderer - draws cutout with type-specific styling
 */
function OpeningShape({ geometry }: { geometry: OpeningGeometry }) {
  const { rectangle, type } = geometry;

  // Flatten rectangle points
  const points = [
    rectangle.topLeft,
    rectangle.topRight,
    rectangle.bottomRight,
    rectangle.bottomLeft,
  ];
  const flatPoints = points.flatMap((p) => [p.x, p.y]);

  // Type-specific colors
  const fillColor = type === 'door' ? '#fef3c7' : '#dbeafe'; // Yellow for doors, blue for windows
  const strokeColor = type === 'door' ? '#f59e0b' : '#3b82f6';

  return (
    <Group>
      <Line points={flatPoints} closed fill={fillColor} stroke={strokeColor} strokeWidth={15} />
      {/* Label */}
      <Text
        x={geometry.position.x - 50}
        y={geometry.position.y - 10}
        text={type === 'door' ? 'D' : 'W'}
        fontSize={200}
        fill={strokeColor}
        fontStyle="bold"
      />
    </Group>
  );
}

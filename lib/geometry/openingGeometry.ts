/**
 * FloorForge Geometry Derivation - Opening Geometry
 *
 * Converts IR openings (offset + width on wall) into renderable rectangles.
 * Calculates position along wall and creates cutout geometry for rendering.
 *
 * @see docs/ARCHITECTURE.md - ADR-003: Framework-agnostic core
 */

import type { Opening, Wall, Point } from '../ir/schema';

/**
 * Opening geometry with position and dimensions
 */
export interface OpeningGeometry {
  openingId: string;
  wallId: string;
  type: 'door' | 'window';
  rectangle: {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  };
  width: number;
  position: Point; // Center point of opening
}

/**
 * Calculate point along wall at given distance from start
 */
function getPointAlongWall(wall: Wall, distanceMm: number): Point {
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return { ...wall.a };

  const t = distanceMm / length; // Parametric position (0 = start, 1 = end)

  return {
    x: wall.a.x + dx * t,
    y: wall.a.y + dy * t,
  };
}

/**
 * Calculate perpendicular vector to wall direction
 */
function getPerpendicular(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return { x: 0, y: 0 };

  // Perpendicular vector (rotate 90° clockwise)
  const perpX = -dy / length;
  const perpY = dx / length;

  return {
    x: perpX * distance,
    y: perpY * distance,
  };
}

/**
 * Derive opening geometry from IR opening definition
 *
 * Calculates the physical rectangle representing the opening on the wall.
 * Opening is positioned at offsetMm from wall.a and extends widthMm along wall.
 *
 * @param opening - IR opening definition
 * @param wall - Parent wall (needed for positioning)
 * @returns Opening geometry with rectangle corners
 */
export function deriveOpeningGeometry(opening: Opening, wall: Wall): OpeningGeometry {
  const halfThickness = wall.thicknessMm / 2;

  // Calculate opening center position along wall
  const centerOffset = opening.offsetMm + opening.widthMm / 2;
  const centerPoint = getPointAlongWall(wall, centerOffset);

  // Calculate opening start/end points along wall centerline
  const startPoint = getPointAlongWall(wall, opening.offsetMm);
  const endPoint = getPointAlongWall(wall, opening.offsetMm + opening.widthMm);

  // Calculate perpendicular offset for wall thickness
  const perpOffset = getPerpendicular(wall.a, wall.b, halfThickness);

  // Opening corners (cut through wall thickness)
  const topLeft: Point = {
    x: startPoint.x + perpOffset.x,
    y: startPoint.y + perpOffset.y,
  };

  const topRight: Point = {
    x: endPoint.x + perpOffset.x,
    y: endPoint.y + perpOffset.y,
  };

  const bottomRight: Point = {
    x: endPoint.x - perpOffset.x,
    y: endPoint.y - perpOffset.y,
  };

  const bottomLeft: Point = {
    x: startPoint.x - perpOffset.x,
    y: startPoint.y - perpOffset.y,
  };

  return {
    openingId: opening.id,
    wallId: opening.wallId,
    type: opening.type,
    rectangle: {
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    },
    width: opening.widthMm,
    position: centerPoint,
  };
}

/**
 * Derive geometry for all openings in a level
 *
 * @param openings - Array of IR openings
 * @param walls - Array of IR walls (for positioning reference)
 * @returns Array of opening geometries
 */
export function deriveOpeningsGeometry(openings: Opening[], walls: Wall[]): OpeningGeometry[] {
  return openings.map((opening) => {
    const wall = walls.find((w) => w.id === opening.wallId);
    if (!wall) {
      throw new Error(`Opening ${opening.id} references non-existent wall ${opening.wallId}`);
    }
    return deriveOpeningGeometry(opening, wall);
  });
}

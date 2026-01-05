/**
 * FloorForge Geometry Derivation - Wall Geometry
 *
 * Converts IR walls (centerline + thickness) into renderable polygons.
 * Handles wall joins, caps, and generates outlines for canvas rendering.
 *
 * @see docs/ARCHITECTURE.md - ADR-003: Framework-agnostic core
 */

import type { Wall, Point } from '../ir/schema';

/**
 * A polygon defined by an array of points
 */
export interface Polygon {
  points: Point[];
}

/**
 * Wall geometry with outline and fill polygons
 */
export interface WallGeometry {
  wallId: string;
  outline: Polygon; // Outer perimeter of wall
  centerline: { start: Point; end: Point }; // Original wall definition
  thickness: number;
}

/**
 * Calculate perpendicular vector to wall direction
 * Used for offsetting centerline to create wall thickness
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
 * Generate wall geometry from IR wall definition
 *
 * Creates a rectangle representing the wall's physical extent.
 * Uses the wall's centerline (a → b) and thickness to compute corners.
 *
 * @param wall - IR wall definition
 * @returns Wall geometry with outline polygon
 */
export function deriveWallGeometry(wall: Wall): WallGeometry {
  const halfThickness = wall.thicknessMm / 2;

  // Calculate perpendicular offset vectors
  const offset = getPerpendicular(wall.a, wall.b, halfThickness);

  // Wall corners (clockwise from top-left)
  const topLeft: Point = {
    x: wall.a.x + offset.x,
    y: wall.a.y + offset.y,
  };

  const topRight: Point = {
    x: wall.b.x + offset.x,
    y: wall.b.y + offset.y,
  };

  const bottomRight: Point = {
    x: wall.b.x - offset.x,
    y: wall.b.y - offset.y,
  };

  const bottomLeft: Point = {
    x: wall.a.x - offset.x,
    y: wall.a.y - offset.y,
  };

  return {
    wallId: wall.id,
    outline: {
      points: [topLeft, topRight, bottomRight, bottomLeft],
    },
    centerline: {
      start: wall.a,
      end: wall.b,
    },
    thickness: wall.thicknessMm,
  };
}

/**
 * Derive geometry for multiple walls
 *
 * @param walls - Array of IR walls
 * @returns Array of wall geometries
 */
export function deriveWallsGeometry(walls: Wall[]): WallGeometry[] {
  return walls.map(deriveWallGeometry);
}

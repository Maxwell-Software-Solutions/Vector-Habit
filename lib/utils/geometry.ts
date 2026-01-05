/**
 * Geometry Utilities
 *
 * Helper functions for canvas interactions and geometric calculations.
 */

import type { Point } from '@/lib/ir/schema';
import type { DrawingPoint } from '@/lib/store/types';

/**
 * Snap a point to grid
 *
 * @param point - Point to snap
 * @param gridSize - Grid size in mm (default: 1000mm = 1m)
 * @returns Snapped point
 */
export function snapToGrid(point: DrawingPoint, gridSize: number = 1000): DrawingPoint {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Calculate distance from point to line segment
 *
 * Used for detecting clicks on walls.
 *
 * @param point - Point to measure from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns Perpendicular distance to line
 */
export function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance between two points
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find point at distance along line segment
 *
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @param distance - Distance from start
 * @returns Point at distance, or null if distance exceeds line length
 */
export function getPointAlongLine(
  lineStart: Point,
  lineEnd: Point,
  distance: number
): Point | null {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (distance > length || distance < 0) {
    return null;
  }

  const t = distance / length;
  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
}

/**
 * Convert canvas coordinates to world coordinates
 *
 * Takes into account zoom and pan.
 *
 * @param canvasX - Canvas X coordinate
 * @param canvasY - Canvas Y coordinate
 * @param scale - Current zoom scale
 * @param offset - Current pan offset
 * @returns World coordinates
 */
export function canvasToWorld(
  canvasX: number,
  canvasY: number,
  scale: number,
  offset: { x: number; y: number }
): DrawingPoint {
  return {
    x: (canvasX - offset.x) / scale,
    y: (canvasY - offset.y) / scale,
  };
}

/**
 * Convert world coordinates to canvas coordinates
 *
 * Takes into account zoom and pan.
 *
 * @param worldX - World X coordinate
 * @param worldY - World Y coordinate
 * @param scale - Current zoom scale
 * @param offset - Current pan offset
 * @returns Canvas coordinates
 */
export function worldToCanvas(
  worldX: number,
  worldY: number,
  scale: number,
  offset: { x: number; y: number }
): DrawingPoint {
  return {
    x: worldX * scale + offset.x,
    y: worldY * scale + offset.y,
  };
}

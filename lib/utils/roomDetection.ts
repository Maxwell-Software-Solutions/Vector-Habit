/**
 * Room Detection Utilities
 * 
 * Functions to detect and calculate room properties from walls.
 */

import type { Wall, Point } from '@/lib/ir/schema';

export interface Room {
  id: string;
  label: string;
  center: Point;
  area: number; // in square meters
  walls: Wall[];
}

/**
 * Calculate the center point (centroid) of a polygon
 */
export function calculateCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

/**
 * Calculate area of a polygon using Shoelace formula
 * Result in square millimeters
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Detect simple rectangular rooms from walls
 * This is a simplified version - a full implementation would need 
 * more sophisticated polygon detection
 */
export function detectRooms(walls: Wall[]): Room[] {
  const rooms: Room[] = [];

  // Simple heuristic: group walls that form enclosed spaces
  // For now, we'll create a room from the bounding box of all walls
  if (walls.length === 0) return rooms;

  const allPoints = walls.flatMap((w) => [w.a, w.b]);
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const minY = Math.min(...allPoints.map((p) => p.y));
  const maxY = Math.max(...allPoints.map((p) => p.y));

  const boundingBox: Point[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  const center = calculateCentroid(boundingBox);
  const area = calculatePolygonArea(boundingBox);
  const areaM2 = area / 1_000_000; // Convert mm² to m²

  rooms.push({
    id: 'room-1',
    label: 'Room',
    center,
    area: areaM2,
    walls,
  });

  return rooms;
}

/**
 * Format area for display
 */
export function formatArea(areaM2: number): string {
  return `${areaM2.toFixed(2)} m²`;
}

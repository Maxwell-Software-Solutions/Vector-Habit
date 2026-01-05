import { deriveWallGeometry, deriveWallsGeometry } from './wallGeometry';
import type { Wall } from '../ir/schema';

describe('Wall Geometry', () => {
  describe('deriveWallGeometry', () => {
    it('should derive geometry for horizontal wall', () => {
      const wall: Wall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      };

      const geometry = deriveWallGeometry(wall);

      expect(geometry.wallId).toBe('w1');
      expect(geometry.thickness).toBe(200);
      expect(geometry.centerline.start).toEqual({ x: 0, y: 0 });
      expect(geometry.centerline.end).toEqual({ x: 5000, y: 0 });

      // Wall should extend 100mm perpendicular on each side
      // Perpendicular offset is counter-clockwise (upward for horizontal right wall)
      expect(geometry.outline.points).toHaveLength(4);
      expect(geometry.outline.points[0]).toEqual({ x: 0, y: 100 }); // Top left (offset up)
      expect(geometry.outline.points[1]).toEqual({ x: 5000, y: 100 }); // Top right (offset up)
      expect(geometry.outline.points[2]).toEqual({ x: 5000, y: -100 }); // Bottom right (offset down)
      expect(geometry.outline.points[3]).toEqual({ x: 0, y: -100 }); // Bottom left (offset down)
    });

    it('should derive geometry for vertical wall', () => {
      const wall: Wall = {
        id: 'w2',
        a: { x: 0, y: 0 },
        b: { x: 0, y: 4000 },
        thicknessMm: 200,
        heightMm: 2700,
      };

      const geometry = deriveWallGeometry(wall);

      expect(geometry.wallId).toBe('w2');
      expect(geometry.outline.points).toHaveLength(4);
      // For vertical wall going down, perpendicular is to the left
      expect(geometry.outline.points[0]).toEqual({ x: -100, y: 0 }); // Top left
      expect(geometry.outline.points[1]).toEqual({ x: -100, y: 4000 }); // Top right (bottom of wall, still left side)
      expect(geometry.outline.points[2]).toEqual({ x: 100, y: 4000 }); // Bottom right
      expect(geometry.outline.points[3]).toEqual({ x: 100, y: 0 }); // Bottom left
    });

    it('should derive geometry for diagonal wall', () => {
      const wall: Wall = {
        id: 'w3',
        a: { x: 0, y: 0 },
        b: { x: 3000, y: 4000 }, // 3-4-5 triangle
        thicknessMm: 200,
        heightMm: 2700,
      };

      const geometry = deriveWallGeometry(wall);

      expect(geometry.wallId).toBe('w3');
      expect(geometry.outline.points).toHaveLength(4);
      // Perpendicular offset should be calculated correctly for diagonal
      // For 3-4-5 triangle (3000, 4000), perpendicular is (-4/5, 3/5)
      // With distance 100: (-80, 60)
      expect(geometry.outline.points[0].x).toBeCloseTo(-80, 0);
      expect(geometry.outline.points[0].y).toBeCloseTo(60, 0);
    });

    it('should handle different wall thicknesses', () => {
      const thinWall: Wall = {
        id: 'w4',
        a: { x: 0, y: 0 },
        b: { x: 1000, y: 0 },
        thicknessMm: 100,
        heightMm: 2700,
      };

      const thickWall: Wall = {
        id: 'w5',
        a: { x: 0, y: 0 },
        b: { x: 1000, y: 0 },
        thicknessMm: 300,
        heightMm: 2700,
      };

      const thinGeometry = deriveWallGeometry(thinWall);
      const thickGeometry = deriveWallGeometry(thickWall);

      expect(thinGeometry.thickness).toBe(100);
      expect(thickGeometry.thickness).toBe(300);

      // Thin wall offset = 50mm, thick wall offset = 150mm
      expect(Math.abs(thinGeometry.outline.points[0].y)).toBe(50);
      expect(Math.abs(thickGeometry.outline.points[0].y)).toBe(150);
    });
  });

  describe('deriveWallsGeometry', () => {
    it('should derive geometry for multiple walls', () => {
      const walls: Wall[] = [
        {
          id: 'w1',
          a: { x: 0, y: 0 },
          b: { x: 5000, y: 0 },
          thicknessMm: 200,
          heightMm: 2700,
        },
        {
          id: 'w2',
          a: { x: 5000, y: 0 },
          b: { x: 5000, y: 4000 },
          thicknessMm: 200,
          heightMm: 2700,
        },
      ];

      const geometries = deriveWallsGeometry(walls);

      expect(geometries).toHaveLength(2);
      expect(geometries[0].wallId).toBe('w1');
      expect(geometries[1].wallId).toBe('w2');
    });

    it('should return empty array for no walls', () => {
      const geometries = deriveWallsGeometry([]);
      expect(geometries).toEqual([]);
    });
  });
});

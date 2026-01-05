import { deriveOpeningGeometry, deriveOpeningsGeometry } from './openingGeometry';
import type { Opening, Wall } from '../ir/schema';

describe('Opening Geometry', () => {
  const horizontalWall: Wall = {
    id: 'w1',
    a: { x: 0, y: 0 },
    b: { x: 5000, y: 0 },
    thicknessMm: 200,
    heightMm: 2700,
  };

  const verticalWall: Wall = {
    id: 'w2',
    a: { x: 0, y: 0 },
    b: { x: 0, y: 4000 },
    thicknessMm: 200,
    heightMm: 2700,
  };

  describe('deriveOpeningGeometry', () => {
    it('should derive geometry for door on horizontal wall', () => {
      const door: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 2000,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const geometry = deriveOpeningGeometry(door, horizontalWall);

      expect(geometry.openingId).toBe('o1');
      expect(geometry.wallId).toBe('w1');
      expect(geometry.type).toBe('door');
      expect(geometry.width).toBe(900);

      // Position should be at offset + half width
      expect(geometry.position).toEqual({ x: 2450, y: 0 });

      // Rectangle should span from offset to offset + width
      expect(geometry.rectangle.topLeft.x).toBe(2000);
      expect(geometry.rectangle.topRight.x).toBe(2900);
    });

    it('should derive geometry for window on horizontal wall', () => {
      const window: Opening = {
        id: 'o2',
        wallId: 'w1',
        type: 'window',
        offsetMm: 1000,
        widthMm: 1200,
        heightMm: 1200,
        sillHeightMm: 900,
      };

      const geometry = deriveOpeningGeometry(window, horizontalWall);

      expect(geometry.openingId).toBe('o2');
      expect(geometry.type).toBe('window');
      expect(geometry.width).toBe(1200);
      expect(geometry.position).toEqual({ x: 1600, y: 0 });
    });

    it('should derive geometry for opening on vertical wall', () => {
      const door: Opening = {
        id: 'o3',
        wallId: 'w2',
        type: 'door',
        offsetMm: 1500,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const geometry = deriveOpeningGeometry(door, verticalWall);

      expect(geometry.openingId).toBe('o3');
      expect(geometry.wallId).toBe('w2');

      // Position should be along vertical wall
      expect(geometry.position).toEqual({ x: 0, y: 1950 });

      // Rectangle should span vertically
      expect(geometry.rectangle.topLeft.y).toBe(1500);
      expect(geometry.rectangle.topRight.y).toBe(2400);
    });

    it('should handle opening at wall start', () => {
      const door: Opening = {
        id: 'o4',
        wallId: 'w1',
        type: 'door',
        offsetMm: 0,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const geometry = deriveOpeningGeometry(door, horizontalWall);

      expect(geometry.position).toEqual({ x: 450, y: 0 });
      expect(geometry.rectangle.topLeft.x).toBe(0);
      expect(geometry.rectangle.topRight.x).toBe(900);
    });

    it('should handle opening near wall end', () => {
      const door: Opening = {
        id: 'o5',
        wallId: 'w1',
        type: 'door',
        offsetMm: 4100,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const geometry = deriveOpeningGeometry(door, horizontalWall);

      expect(geometry.position).toEqual({ x: 4550, y: 0 });
      expect(geometry.rectangle.topLeft.x).toBe(4100);
      expect(geometry.rectangle.topRight.x).toBe(5000);
    });
  });

  describe('deriveOpeningsGeometry', () => {
    it('should derive geometry for multiple openings', () => {
      const openings: Opening[] = [
        {
          id: 'o1',
          wallId: 'w1',
          type: 'door',
          offsetMm: 2000,
          widthMm: 900,
          heightMm: 2100,
          sillHeightMm: 0,
        },
        {
          id: 'o2',
          wallId: 'w1',
          type: 'window',
          offsetMm: 3500,
          widthMm: 1200,
          heightMm: 1200,
          sillHeightMm: 900,
        },
      ];

      const geometries = deriveOpeningsGeometry(openings, [horizontalWall]);

      expect(geometries).toHaveLength(2);
      expect(geometries[0].openingId).toBe('o1');
      expect(geometries[1].openingId).toBe('o2');
    });

    it('should throw error if wall not found', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w999',
        type: 'door',
        offsetMm: 0,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      expect(() => {
        deriveOpeningsGeometry([opening], [horizontalWall]);
      }).toThrow('Opening o1 references non-existent wall w999');
    });

    it('should return empty array for no openings', () => {
      const geometries = deriveOpeningsGeometry([], [horizontalWall]);
      expect(geometries).toEqual([]);
    });
  });
});

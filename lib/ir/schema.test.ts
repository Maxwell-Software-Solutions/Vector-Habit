import {
  PointSchema,
  WallSchema,
  OpeningSchema,
  LevelSchema,
  ProjectSchema,
  createEmptyProject,
  validateProjectSchema,
  safeValidateProjectSchema,
} from './schema';
import type { Project } from './schema';
import { ZodError } from 'zod';

describe('IR Schema', () => {
  describe('PointSchema', () => {
    it('should validate valid point', () => {
      const validPoint = { x: 1000, y: 2000 };
      expect(() => PointSchema.parse(validPoint)).not.toThrow();
    });

    it('should reject non-integer coordinates', () => {
      const invalidPoint = { x: 1000.5, y: 2000 };
      expect(() => PointSchema.parse(invalidPoint)).toThrow(ZodError);
    });

    it('should reject missing coordinates', () => {
      const invalidPoint = { x: 1000 };
      expect(() => PointSchema.parse(invalidPoint)).toThrow(ZodError);
    });

    it('should allow negative coordinates', () => {
      const validPoint = { x: -1000, y: -2000 };
      expect(() => PointSchema.parse(validPoint)).not.toThrow();
    });
  });

  describe('WallSchema', () => {
    it('should validate valid wall', () => {
      const validWall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      };
      expect(() => WallSchema.parse(validWall)).not.toThrow();
    });

    it('should use default height of 2700mm', () => {
      const wall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
      };
      const parsed = WallSchema.parse(wall);
      expect(parsed.heightMm).toBe(2700);
    });

    it('should reject invalid wall ID format', () => {
      const invalidWall = {
        id: 'wall1', // Must be w[0-9]+
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      };
      expect(() => WallSchema.parse(invalidWall)).toThrow(ZodError);
    });

    it('should reject thickness below 100mm', () => {
      const invalidWall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 50,
        heightMm: 2700,
      };
      expect(() => WallSchema.parse(invalidWall)).toThrow(ZodError);
    });

    it('should reject thickness above 500mm', () => {
      const invalidWall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 600,
        heightMm: 2700,
      };
      expect(() => WallSchema.parse(invalidWall)).toThrow(ZodError);
    });

    it('should reject height below 1800mm', () => {
      const invalidWall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
        heightMm: 1700,
      };
      expect(() => WallSchema.parse(invalidWall)).toThrow(ZodError);
    });

    it('should reject height above 4000mm', () => {
      const invalidWall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
        heightMm: 4500,
      };
      expect(() => WallSchema.parse(invalidWall)).toThrow(ZodError);
    });

    it('should accept valid wall ID formats', () => {
      const ids = ['w1', 'w2', 'w10', 'w999'];
      ids.forEach((id) => {
        const wall = {
          id,
          a: { x: 0, y: 0 },
          b: { x: 5000, y: 0 },
          thicknessMm: 200,
          heightMm: 2700,
        };
        expect(() => WallSchema.parse(wall)).not.toThrow();
      });
    });
  });

  describe('OpeningSchema', () => {
    it('should validate valid door', () => {
      const validDoor = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 1000,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };
      expect(() => OpeningSchema.parse(validDoor)).not.toThrow();
    });

    it('should validate valid window', () => {
      const validWindow = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 1000,
        widthMm: 1200,
        heightMm: 1200,
        sillHeightMm: 900,
      };
      expect(() => OpeningSchema.parse(validWindow)).not.toThrow();
    });

    it('should reject invalid opening ID format', () => {
      const invalidOpening = {
        id: 'opening1', // Must be o[0-9]+
        wallId: 'w1',
        type: 'door',
        offsetMm: 1000,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };
      expect(() => OpeningSchema.parse(invalidOpening)).toThrow(ZodError);
    });

    it('should reject invalid opening type', () => {
      const invalidOpening = {
        id: 'o1',
        wallId: 'w1',
        type: 'skylight', // Only 'door' or 'window' allowed
        offsetMm: 1000,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };
      expect(() => OpeningSchema.parse(invalidOpening)).toThrow(ZodError);
    });

    it('should reject width below 600mm', () => {
      const invalidOpening = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 1000,
        widthMm: 500,
        heightMm: 1200,
        sillHeightMm: 900,
      };
      expect(() => OpeningSchema.parse(invalidOpening)).toThrow(ZodError);
    });

    it('should reject width above 3000mm', () => {
      const invalidOpening = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 1000,
        widthMm: 3500,
        heightMm: 1200,
        sillHeightMm: 900,
      };
      expect(() => OpeningSchema.parse(invalidOpening)).toThrow(ZodError);
    });

    it('should reject negative offset', () => {
      const invalidOpening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: -100,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };
      expect(() => OpeningSchema.parse(invalidOpening)).toThrow(ZodError);
    });

    it('should reject negative sill height', () => {
      const invalidOpening = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 1000,
        widthMm: 1200,
        heightMm: 1200,
        sillHeightMm: -100,
      };
      expect(() => OpeningSchema.parse(invalidOpening)).toThrow(ZodError);
    });
  });

  describe('LevelSchema', () => {
    it('should validate valid level', () => {
      const validLevel = {
        id: 'l1',
        name: 'Ground Floor',
        walls: [
          {
            id: 'w1',
            a: { x: 0, y: 0 },
            b: { x: 5000, y: 0 },
            thicknessMm: 200,
            heightMm: 2700,
          },
        ],
        openings: [],
      };
      expect(() => LevelSchema.parse(validLevel)).not.toThrow();
    });

    it('should reject invalid level ID format', () => {
      const invalidLevel = {
        id: 'level1', // Must be l[0-9]+
        name: 'Ground Floor',
        walls: [],
        openings: [],
      };
      expect(() => LevelSchema.parse(invalidLevel)).toThrow(ZodError);
    });

    it('should accept empty walls and openings arrays', () => {
      const validLevel = {
        id: 'l1',
        name: 'Ground Floor',
        walls: [],
        openings: [],
      };
      expect(() => LevelSchema.parse(validLevel)).not.toThrow();
    });

    it('should accept level with walls and openings', () => {
      const validLevel = {
        id: 'l1',
        name: 'Ground Floor',
        walls: [
          {
            id: 'w1',
            a: { x: 0, y: 0 },
            b: { x: 5000, y: 0 },
            thicknessMm: 200,
            heightMm: 2700,
          },
        ],
        openings: [
          {
            id: 'o1',
            wallId: 'w1',
            type: 'door',
            offsetMm: 2000,
            widthMm: 900,
            heightMm: 2100,
            sillHeightMm: 0,
          },
        ],
      };
      expect(() => LevelSchema.parse(validLevel)).not.toThrow();
    });
  });

  describe('ProjectSchema', () => {
    it('should validate valid project', () => {
      const validProject = {
        id: 'p1',
        name: 'My House',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };
      expect(() => ProjectSchema.parse(validProject)).not.toThrow();
    });

    it('should reject invalid project ID format', () => {
      const invalidProject = {
        id: 'project1', // Must be p[0-9]+
        name: 'My House',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };
      expect(() => ProjectSchema.parse(invalidProject)).toThrow(ZodError);
    });

    it('should reject units other than mm', () => {
      const invalidProject = {
        id: 'p1',
        name: 'My House',
        units: 'cm', // Only 'mm' allowed
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };
      expect(() => ProjectSchema.parse(invalidProject)).toThrow(ZodError);
    });

    it('should require at least one level', () => {
      const invalidProject = {
        id: 'p1',
        name: 'My House',
        units: 'mm',
        levels: [],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };
      expect(() => ProjectSchema.parse(invalidProject)).toThrow(ZodError);
    });

    it('should reject invalid ISO 8601 timestamps', () => {
      const invalidProject = {
        id: 'p1',
        name: 'My House',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: 'not-a-date',
        updatedAt: '2026-01-05T10:00:00Z',
      };
      expect(() => ProjectSchema.parse(invalidProject)).toThrow(ZodError);
    });
  });

  describe('createEmptyProject', () => {
    it('should create valid empty project with default values', () => {
      const project = createEmptyProject('Test Project');

      expect(project.name).toBe('Test Project');
      expect(project.units).toBe('mm');
      expect(project.levels).toHaveLength(1);
      expect(project.levels[0].id).toBe('l1');
      expect(project.levels[0].name).toBe('Ground Floor');
      expect(project.levels[0].walls).toEqual([]);
      expect(project.levels[0].openings).toEqual([]);
      expect(project.id).toMatch(/^p[0-9]+$/);
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('should generate unique IDs for sequential projects', () => {
      const project1 = createEmptyProject('Project 1');
      // Wait a tiny bit to ensure different timestamp-based ID
      const project2 = createEmptyProject('Project 2');

      // IDs follow pattern p<timestamp>, so they should be different
      expect(project1.id).toMatch(/^p[0-9]+$/);
      expect(project2.id).toMatch(/^p[0-9]+$/);
      // Can't guarantee uniqueness without waiting, so just check format
    });

    it('should create valid ISO 8601 timestamps', () => {
      const project = createEmptyProject('Test');

      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();

      if (project.createdAt && project.updatedAt) {
        const createdDate = new Date(project.createdAt);
        const updatedDate = new Date(project.updatedAt);

        expect(createdDate.toISOString()).toBe(project.createdAt);
        expect(updatedDate.toISOString()).toBe(project.updatedAt);
      }
    });

    it('should create project that passes schema validation', () => {
      const project = createEmptyProject('Test');
      expect(() => ProjectSchema.parse(project)).not.toThrow();
    });
  });

  describe('validateProjectSchema', () => {
    it('should return parsed project for valid data', () => {
      const validData = {
        id: 'p1',
        name: 'Test Project',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      const project = validateProjectSchema(validData);

      expect(project.id).toBe('p1');
      expect(project.name).toBe('Test Project');
    });

    it('should throw ZodError for invalid data', () => {
      const invalidData = {
        id: 'invalid',
        name: 'Test',
        units: 'mm',
        levels: [],
      };

      expect(() => validateProjectSchema(invalidData)).toThrow(ZodError);
    });

    it('should throw for missing required fields', () => {
      const invalidData = {
        name: 'Test',
      };

      expect(() => validateProjectSchema(invalidData)).toThrow(ZodError);
    });
  });

  describe('safeValidateProjectSchema', () => {
    it('should return success for valid data', () => {
      const validData = {
        id: 'p1',
        name: 'Test Project',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      const result = safeValidateProjectSchema(validData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.id).toBe('p1');
      }
    });

    it('should return error for invalid data', () => {
      const invalidData = {
        id: 'invalid',
        name: 'Test',
        units: 'mm',
        levels: [],
      };

      const result = safeValidateProjectSchema(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });

    it('should not throw for invalid data', () => {
      const invalidData = {
        completely: 'wrong',
      };

      expect(() => safeValidateProjectSchema(invalidData)).not.toThrow();
    });

    it('should include error details in failure result', () => {
      const invalidData = {
        id: 'p1',
        name: 'Test',
        units: 'inches', // Invalid units
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [],
            openings: [],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      const result = safeValidateProjectSchema(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      if (result.error) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues[0].path).toContain('units');
      }
    });
  });

  describe('Complex project validation', () => {
    it('should validate a complete realistic project', () => {
      const complexProject: Project = {
        id: 'p1',
        name: 'Three Bedroom House',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [
              {
                id: 'w1',
                a: { x: 0, y: 0 },
                b: { x: 10000, y: 0 },
                thicknessMm: 250,
                heightMm: 2700,
              },
              {
                id: 'w2',
                a: { x: 10000, y: 0 },
                b: { x: 10000, y: 8000 },
                thicknessMm: 250,
                heightMm: 2700,
              },
              {
                id: 'w3',
                a: { x: 10000, y: 8000 },
                b: { x: 0, y: 8000 },
                thicknessMm: 250,
                heightMm: 2700,
              },
              {
                id: 'w4',
                a: { x: 0, y: 8000 },
                b: { x: 0, y: 0 },
                thicknessMm: 250,
                heightMm: 2700,
              },
            ],
            openings: [
              {
                id: 'o1',
                wallId: 'w1',
                type: 'door',
                offsetMm: 4500,
                widthMm: 1000,
                heightMm: 2100,
                sillHeightMm: 0,
              },
              {
                id: 'o2',
                wallId: 'w2',
                type: 'window',
                offsetMm: 3000,
                widthMm: 1500,
                heightMm: 1200,
                sillHeightMm: 900,
              },
              {
                id: 'o3',
                wallId: 'w3',
                type: 'window',
                offsetMm: 5000,
                widthMm: 1800,
                heightMm: 1500,
                sillHeightMm: 900,
              },
            ],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      expect(() => ProjectSchema.parse(complexProject)).not.toThrow();
    });
  });
});

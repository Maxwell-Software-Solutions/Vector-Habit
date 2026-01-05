import {
  validateWallLength,
  validateOpeningFitsWall,
  validateOpeningDimensions,
  validateUniqueIds,
  validateLevelHasWalls,
  validateOpeningsNoOverlap,
  validateProject,
  hasErrors,
  getErrors,
  getWarnings,
  ValidationIssue,
} from './rules';
import type { Wall, Opening, Level, Project } from '@/lib/ir/schema';
import { createEmptyProject } from '@/lib/ir/schema';

describe('Validator Rules', () => {
  describe('validateWallLength', () => {
    it('should return error for wall shorter than 100mm', () => {
      const wall: Wall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 50, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      };

      const issues = validateWallLength(wall);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('WALL_TOO_SHORT');
      expect(issues[0].message).toContain('50mm');
      expect(issues[0].entityId).toBe('w1');
    });

    it('should return warning for wall shorter than 500mm', () => {
      const wall: Wall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 300, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      };

      const issues = validateWallLength(wall);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].code).toBe('WALL_UNUSUALLY_SHORT');
      expect(issues[0].message).toContain('300mm');
    });

    it('should return no issues for wall >= 500mm', () => {
      const wall: Wall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 5000, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      };

      const issues = validateWallLength(wall);

      expect(issues).toHaveLength(0);
    });

    it('should calculate length correctly for diagonal walls', () => {
      const wall: Wall = {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 300, y: 400 }, // 3-4-5 triangle = 500mm hypotenuse
        thicknessMm: 200,
        heightMm: 2700,
      };

      const issues = validateWallLength(wall);

      expect(issues).toHaveLength(0); // Exactly 500mm should pass
    });
  });

  describe('validateOpeningFitsWall', () => {
    const walls: Wall[] = [
      {
        id: 'w1',
        a: { x: 0, y: 0 },
        b: { x: 2000, y: 0 },
        thicknessMm: 200,
        heightMm: 2700,
      },
    ];

    it('should return error when opening exceeds wall length', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 1500,
        widthMm: 1200, // 1500 + 1200 = 2700 > 2000
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const issues = validateOpeningFitsWall(opening, walls);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('OPENING_EXCEEDS_WALL');
      expect(issues[0].message).toContain('2700mm');
      expect(issues[0].message).toContain('2000mm');
    });

    it('should return no issues when opening fits within wall', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 500,
        widthMm: 900, // 500 + 900 = 1400 < 2000
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const issues = validateOpeningFitsWall(opening, walls);

      expect(issues).toHaveLength(0);
    });

    it('should return error when wall not found', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w999',
        type: 'door',
        offsetMm: 0,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const issues = validateOpeningFitsWall(opening, walls);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('WALL_NOT_FOUND');
    });

    it('should handle opening at exact wall end', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 800,
        widthMm: 1200, // 800 + 1200 = 2000 (exact)
        heightMm: 1200,
        sillHeightMm: 900,
      };

      const issues = validateOpeningFitsWall(opening, walls);

      expect(issues).toHaveLength(0); // Should fit exactly
    });
  });

  describe('validateOpeningDimensions', () => {
    it('should return error for door narrower than 700mm', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 0,
        widthMm: 600,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const issues = validateOpeningDimensions(opening);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('DOOR_TOO_NARROW');
      expect(issues[0].suggestedFix.widthMm).toBe(700);
    });

    it('should return error for door shorter than 1800mm', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 0,
        widthMm: 900,
        heightMm: 1700,
        sillHeightMm: 0,
      };

      const issues = validateOpeningDimensions(opening);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('DOOR_TOO_SHORT');
      expect(issues[0].suggestedFix.heightMm).toBe(1800);
    });

    it('should return error for door with non-zero sill height', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 0,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 100,
      };

      const issues = validateOpeningDimensions(opening);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('DOOR_INVALID_SILL');
      expect(issues[0].suggestedFix.sillHeightMm).toBe(0);
    });

    it('should return error for window sill lower than 600mm', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 0,
        widthMm: 1200,
        heightMm: 1200,
        sillHeightMm: 500,
      };

      const issues = validateOpeningDimensions(opening);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('WINDOW_SILL_TOO_LOW');
      expect(issues[0].suggestedFix.sillHeightMm).toBe(600);
    });

    it('should return no issues for valid door', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'door',
        offsetMm: 0,
        widthMm: 900,
        heightMm: 2100,
        sillHeightMm: 0,
      };

      const issues = validateOpeningDimensions(opening);

      expect(issues).toHaveLength(0);
    });

    it('should return no issues for valid window', () => {
      const opening: Opening = {
        id: 'o1',
        wallId: 'w1',
        type: 'window',
        offsetMm: 0,
        widthMm: 1500,
        heightMm: 1200,
        sillHeightMm: 900,
      };

      const issues = validateOpeningDimensions(opening);

      expect(issues).toHaveLength(0);
    });
  });

  describe('validateUniqueIds', () => {
    it('should return error for duplicate level IDs', () => {
      const project: Project = {
        ...createEmptyProject('Test'),
        levels: [
          {
            id: 'l1',
            name: 'Level 1',
            walls: [],
            openings: [],
          },
          {
            id: 'l1',
            name: 'Level 1 Duplicate',
            walls: [],
            openings: [],
          },
        ],
      };

      const issues = validateUniqueIds(project);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === 'DUPLICATE_LEVEL_ID')).toBe(true);
    });

    it('should return error for duplicate wall IDs', () => {
      const project: Project = {
        ...createEmptyProject('Test'),
        levels: [
          {
            id: 'l1',
            name: 'Level 1',
            walls: [
              {
                id: 'w1',
                a: { x: 0, y: 0 },
                b: { x: 1000, y: 0 },
                thicknessMm: 200,
                heightMm: 2700,
              },
              {
                id: 'w1',
                a: { x: 1000, y: 0 },
                b: { x: 1000, y: 1000 },
                thicknessMm: 200,
                heightMm: 2700,
              },
            ],
            openings: [],
          },
        ],
      };

      const issues = validateUniqueIds(project);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === 'DUPLICATE_WALL_ID')).toBe(true);
    });

    it('should return error for duplicate opening IDs', () => {
      const project: Project = {
        ...createEmptyProject('Test'),
        levels: [
          {
            id: 'l1',
            name: 'Level 1',
            walls: [
              {
                id: 'w1',
                a: { x: 0, y: 0 },
                b: { x: 3000, y: 0 },
                thicknessMm: 200,
                heightMm: 2700,
              },
            ],
            openings: [
              {
                id: 'o1',
                wallId: 'w1',
                type: 'door',
                offsetMm: 500,
                widthMm: 900,
                heightMm: 2100,
                sillHeightMm: 0,
              },
              {
                id: 'o1',
                wallId: 'w1',
                type: 'window',
                offsetMm: 2000,
                widthMm: 1200,
                heightMm: 1200,
                sillHeightMm: 900,
              },
            ],
          },
        ],
      };

      const issues = validateUniqueIds(project);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === 'DUPLICATE_OPENING_ID')).toBe(true);
    });

    it('should return no issues for unique IDs', () => {
      const project: Project = {
        ...createEmptyProject('Test'),
        levels: [
          {
            id: 'l1',
            name: 'Level 1',
            walls: [
              {
                id: 'w1',
                a: { x: 0, y: 0 },
                b: { x: 1000, y: 0 },
                thicknessMm: 200,
                heightMm: 2700,
              },
              {
                id: 'w2',
                a: { x: 1000, y: 0 },
                b: { x: 1000, y: 1000 },
                thicknessMm: 200,
                heightMm: 2700,
              },
            ],
            openings: [],
          },
        ],
      };

      const issues = validateUniqueIds(project);

      expect(issues).toHaveLength(0);
    });
  });

  describe('validateLevelHasWalls', () => {
    it('should return warning for empty level', () => {
      const level: Level = {
        id: 'l1',
        name: 'Empty Level',
        walls: [],
        openings: [],
      };

      const issues = validateLevelHasWalls(level);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('warning');
      expect(issues[0].code).toBe('EMPTY_LEVEL');
    });

    it('should return no issues for level with walls', () => {
      const level: Level = {
        id: 'l1',
        name: 'Level 1',
        walls: [
          {
            id: 'w1',
            a: { x: 0, y: 0 },
            b: { x: 1000, y: 0 },
            thicknessMm: 200,
            heightMm: 2700,
          },
        ],
        openings: [],
      };

      const issues = validateLevelHasWalls(level);

      expect(issues).toHaveLength(0);
    });
  });

  describe('validateOpeningsNoOverlap', () => {
    it('should return error when openings overlap on same wall', () => {
      const level: Level = {
        id: 'l1',
        name: 'Level 1',
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
            offsetMm: 1000,
            widthMm: 900,
            heightMm: 2100,
            sillHeightMm: 0,
          },
          {
            id: 'o2',
            wallId: 'w1',
            type: 'window',
            offsetMm: 1500, // 1500 < 1000 + 900 = overlap
            widthMm: 1200,
            heightMm: 1200,
            sillHeightMm: 900,
          },
        ],
      };

      const issues = validateOpeningsNoOverlap(level);

      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].code).toBe('OPENINGS_OVERLAP');
      expect(issues[0].message).toContain('o1');
      expect(issues[0].message).toContain('o2');
    });

    it('should return no issues when openings do not overlap', () => {
      const level: Level = {
        id: 'l1',
        name: 'Level 1',
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
            offsetMm: 500,
            widthMm: 900,
            heightMm: 2100,
            sillHeightMm: 0,
          },
          {
            id: 'o2',
            wallId: 'w1',
            type: 'window',
            offsetMm: 2000,
            widthMm: 1200,
            heightMm: 1200,
            sillHeightMm: 900,
          },
        ],
      };

      const issues = validateOpeningsNoOverlap(level);

      expect(issues).toHaveLength(0);
    });

    it('should handle adjacent openings (touching but not overlapping)', () => {
      const level: Level = {
        id: 'l1',
        name: 'Level 1',
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
            offsetMm: 500,
            widthMm: 900,
            heightMm: 2100,
            sillHeightMm: 0,
          },
          {
            id: 'o2',
            wallId: 'w1',
            type: 'window',
            offsetMm: 1400, // 500 + 900 = 1400 (exact adjacent)
            widthMm: 1200,
            heightMm: 1200,
            sillHeightMm: 900,
          },
        ],
      };

      const issues = validateOpeningsNoOverlap(level);

      expect(issues).toHaveLength(0); // Adjacent is OK
    });

    it('should allow openings on different walls', () => {
      const level: Level = {
        id: 'l1',
        name: 'Level 1',
        walls: [
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
        ],
        openings: [
          {
            id: 'o1',
            wallId: 'w1',
            type: 'door',
            offsetMm: 1000,
            widthMm: 900,
            heightMm: 2100,
            sillHeightMm: 0,
          },
          {
            id: 'o2',
            wallId: 'w2',
            type: 'door',
            offsetMm: 1000,
            widthMm: 900,
            heightMm: 2100,
            sillHeightMm: 0,
          },
        ],
      };

      const issues = validateOpeningsNoOverlap(level);

      expect(issues).toHaveLength(0); // Different walls is OK
    });
  });

  describe('validateProject', () => {
    it('should validate a valid project with no issues', () => {
      const project: Project = {
        ...createEmptyProject('Valid Project'),
        levels: [
          {
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
              {
                id: 'w2',
                a: { x: 5000, y: 0 },
                b: { x: 5000, y: 4000 },
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
          },
        ],
      };

      const issues = validateProject(project);

      expect(issues).toHaveLength(0);
    });

    it('should accumulate multiple issues from different validators', () => {
      const project: Project = {
        ...createEmptyProject('Invalid Project'),
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [
              {
                id: 'w1',
                a: { x: 0, y: 0 },
                b: { x: 50, y: 0 }, // TOO SHORT (< 100mm)
                thicknessMm: 200,
                heightMm: 2700,
              },
            ],
            openings: [
              {
                id: 'o1',
                wallId: 'w1',
                type: 'door',
                offsetMm: 0,
                widthMm: 600, // TOO NARROW (< 700mm)
                heightMm: 2100,
                sillHeightMm: 0,
              },
              {
                id: 'o1', // DUPLICATE ID
                wallId: 'w1',
                type: 'window',
                offsetMm: 0,
                widthMm: 1200,
                heightMm: 1200,
                sillHeightMm: 900,
              },
            ],
          },
        ],
      };

      const issues = validateProject(project);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === 'WALL_TOO_SHORT')).toBe(true);
      expect(issues.some((i) => i.code === 'DOOR_TOO_NARROW')).toBe(true);
      expect(issues.some((i) => i.code === 'DUPLICATE_OPENING_ID')).toBe(true);
    });

    it('should validate empty level warning', () => {
      const project: Project = {
        ...createEmptyProject('Empty Project'),
        levels: [
          {
            id: 'l1',
            name: 'Empty Level',
            walls: [],
            openings: [],
          },
        ],
      };

      const issues = validateProject(project);

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe('EMPTY_LEVEL');
      expect(issues[0].severity).toBe('warning');
    });
  });

  describe('Helper functions', () => {
    describe('hasErrors', () => {
      it('should return true when errors present', () => {
        const issues: ValidationIssue[] = [
          {
            code: 'TEST_ERROR',
            severity: 'error',
            message: 'Test error',
            entityId: 'e1',
          },
          {
            code: 'TEST_WARNING',
            severity: 'warning',
            message: 'Test warning',
            entityId: 'e1',
          },
        ];

        expect(hasErrors(issues)).toBe(true);
      });

      it('should return false when only warnings present', () => {
        const issues: ValidationIssue[] = [
          {
            code: 'TEST_WARNING',
            severity: 'warning',
            message: 'Test warning',
            entityId: 'e1',
          },
        ];

        expect(hasErrors(issues)).toBe(false);
      });

      it('should return false for empty array', () => {
        expect(hasErrors([])).toBe(false);
      });
    });

    describe('getErrors', () => {
      it('should return only errors', () => {
        const issues: ValidationIssue[] = [
          {
            code: 'TEST_ERROR',
            severity: 'error',
            message: 'Test error',
            entityId: 'e1',
          },
          {
            code: 'TEST_WARNING',
            severity: 'warning',
            message: 'Test warning',
            entityId: 'e1',
          },
        ];

        const errors = getErrors(issues);

        expect(errors).toHaveLength(1);
        expect(errors[0].severity).toBe('error');
      });
    });

    describe('getWarnings', () => {
      it('should return only warnings', () => {
        const issues: ValidationIssue[] = [
          {
            code: 'TEST_ERROR',
            severity: 'error',
            message: 'Test error',
            entityId: 'e1',
          },
          {
            code: 'TEST_WARNING',
            severity: 'warning',
            message: 'Test warning',
            entityId: 'e1',
          },
        ];

        const warnings = getWarnings(issues);

        expect(warnings).toHaveLength(1);
        expect(warnings[0].severity).toBe('warning');
      });
    });
  });

  describe('Integration tests with example fixtures', () => {
    it('should validate simple-room.json as valid', async () => {
      const simpleRoom: Project = {
        id: 'p1',
        name: 'Simple Rectangular Room',
        units: 'mm',
        levels: [
          {
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
              {
                id: 'w2',
                a: { x: 5000, y: 0 },
                b: { x: 5000, y: 4000 },
                thicknessMm: 200,
                heightMm: 2700,
              },
              {
                id: 'w3',
                a: { x: 5000, y: 4000 },
                b: { x: 0, y: 4000 },
                thicknessMm: 200,
                heightMm: 2700,
              },
              {
                id: 'w4',
                a: { x: 0, y: 4000 },
                b: { x: 0, y: 0 },
                thicknessMm: 200,
                heightMm: 2700,
              },
            ],
            openings: [
              {
                id: 'o1',
                wallId: 'w1',
                type: 'door',
                offsetMm: 2500,
                widthMm: 900,
                heightMm: 2100,
                sillHeightMm: 0,
              },
              {
                id: 'o2',
                wallId: 'w2',
                type: 'window',
                offsetMm: 2000,
                widthMm: 1200,
                heightMm: 1200,
                sillHeightMm: 900,
              },
            ],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      const issues = validateProject(simpleRoom);

      expect(issues).toHaveLength(0);
    });

    it('should detect errors in invalid-plan.json', () => {
      const invalidPlan: Project = {
        id: 'p2',
        name: 'Invalid Plan (Opening Exceeds Wall)',
        units: 'mm',
        levels: [
          {
            id: 'l1',
            name: 'Ground Floor',
            walls: [
              {
                id: 'w1',
                a: { x: 0, y: 0 },
                b: { x: 2000, y: 0 },
                thicknessMm: 200,
                heightMm: 2700,
              },
            ],
            openings: [
              {
                id: 'o1',
                wallId: 'w1',
                type: 'door',
                offsetMm: 1500,
                widthMm: 1200,
                heightMm: 2100,
                sillHeightMm: 0,
              },
            ],
          },
        ],
        createdAt: '2026-01-05T10:00:00Z',
        updatedAt: '2026-01-05T10:00:00Z',
      };

      const issues = validateProject(invalidPlan);

      expect(issues.length).toBeGreaterThan(0);
      expect(hasErrors(issues)).toBe(true);
      expect(issues.some((i) => i.code === 'OPENING_EXCEEDS_WALL')).toBe(true);
    });
  });
});

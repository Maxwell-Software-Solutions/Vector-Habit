/**
 * FloorForge Validation Engine
 *
 * Pure validation functions that run on every IR change.
 * These validators catch common architectural/geometric errors.
 *
 * Design Principles:
 * - Pure functions (no side effects)
 * - Return structured issues (code, severity, message, entityId)
 * - Enable AI self-repair (suggestedFix field)
 * - Testable with golden fixtures
 *
 * @see docs/ARCHITECTURE.md - ADR-002: Validation as Hard Gate
 */

import { Project, Level, Wall, Opening } from '../ir/schema';

/**
 * Severity levels for validation issues
 */
export type IssueSeverity = 'error' | 'warning';

/**
 * Structured validation issue
 * Used for both UI display and AI self-repair
 */
export interface ValidationIssue {
  code: string; // Machine-readable error code
  severity: IssueSeverity;
  message: string; // Human-readable message
  entityId: string; // ID of the entity with the issue
  suggestedFix?: any; // Optional: Auto-fix suggestion for AI
}

/**
 * Calculate distance between two points
 */
function calculateDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Validator: Wall must have non-zero length (minimum 100mm)
 */
export function validateWallLength(wall: Wall): ValidationIssue[] {
  const length = calculateDistance(wall.a, wall.b);

  if (length < 100) {
    return [
      {
        code: 'WALL_TOO_SHORT',
        severity: 'error',
        message: `Wall ${wall.id} length ${length.toFixed(0)}mm is below minimum 100mm`,
        entityId: wall.id,
        suggestedFix: {
          action: 'delete',
          reason: 'Wall too short to be structurally valid',
        },
      },
    ];
  }

  // Warning for walls shorter than 500mm (unusual but possible)
  if (length < 500) {
    return [
      {
        code: 'WALL_UNUSUALLY_SHORT',
        severity: 'warning',
        message: `Wall ${wall.id} length ${length.toFixed(0)}mm is unusually short`,
        entityId: wall.id,
      },
    ];
  }

  return [];
}

/**
 * Validator: Opening must fit within its wall segment
 */
export function validateOpeningFitsWall(opening: Opening, walls: Wall[]): ValidationIssue[] {
  const wall = walls.find((w) => w.id === opening.wallId);

  // Opening references non-existent wall
  if (!wall) {
    return [
      {
        code: 'WALL_NOT_FOUND',
        severity: 'error',
        message: `Opening ${opening.id} references non-existent wall ${opening.wallId}`,
        entityId: opening.id,
        suggestedFix: {
          action: 'delete',
          reason: 'Wall does not exist',
        },
      },
    ];
  }

  const wallLength = calculateDistance(wall.a, wall.b);
  const openingEnd = opening.offsetMm + opening.widthMm;

  // Opening extends beyond wall
  if (openingEnd > wallLength) {
    return [
      {
        code: 'OPENING_EXCEEDS_WALL',
        severity: 'error',
        message: `Opening ${opening.id} end position ${openingEnd}mm exceeds wall ${wall.id} length ${wallLength.toFixed(0)}mm`,
        entityId: opening.id,
        suggestedFix: {
          offsetMm: wallLength - opening.widthMm,
        },
      },
    ];
  }

  return [];
}

/**
 * Validator: Opening dimensions must be reasonable for type
 */
export function validateOpeningDimensions(opening: Opening): ValidationIssue[] {
  // Door-specific validations
  if (opening.type === 'door') {
    if (opening.widthMm < 700) {
      return [
        {
          code: 'DOOR_TOO_NARROW',
          severity: 'error',
          message: `Door ${opening.id} width ${opening.widthMm}mm is below minimum 700mm`,
          entityId: opening.id,
          suggestedFix: { widthMm: 700 },
        },
      ];
    }

    if (opening.heightMm < 1800) {
      return [
        {
          code: 'DOOR_TOO_SHORT',
          severity: 'error',
          message: `Door ${opening.id} height ${opening.heightMm}mm is below minimum 1800mm`,
          entityId: opening.id,
          suggestedFix: { heightMm: 1800 },
        },
      ];
    }

    if (opening.sillHeightMm !== 0) {
      return [
        {
          code: 'DOOR_INVALID_SILL',
          severity: 'error',
          message: `Door ${opening.id} must have sill height of 0mm (currently ${opening.sillHeightMm}mm)`,
          entityId: opening.id,
          suggestedFix: { sillHeightMm: 0 },
        },
      ];
    }
  }

  // Window-specific validations
  if (opening.type === 'window') {
    if (opening.sillHeightMm < 600) {
      return [
        {
          code: 'WINDOW_SILL_TOO_LOW',
          severity: 'error',
          message: `Window ${opening.id} sill height ${opening.sillHeightMm}mm is below minimum 600mm`,
          entityId: opening.id,
          suggestedFix: { sillHeightMm: 600 },
        },
      ];
    }
  }

  return [];
}

/**
 * Validator: No duplicate IDs in project
 */
export function validateUniqueIds(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const levelIds = new Set<string>();
  const wallIds = new Set<string>();
  const openingIds = new Set<string>();

  // Check level IDs
  project.levels.forEach((level) => {
    if (levelIds.has(level.id)) {
      issues.push({
        code: 'DUPLICATE_LEVEL_ID',
        severity: 'error',
        message: `Duplicate level ID: ${level.id}`,
        entityId: level.id,
      });
    }
    levelIds.add(level.id);

    // Check wall IDs
    level.walls.forEach((wall) => {
      if (wallIds.has(wall.id)) {
        issues.push({
          code: 'DUPLICATE_WALL_ID',
          severity: 'error',
          message: `Duplicate wall ID: ${wall.id}`,
          entityId: wall.id,
        });
      }
      wallIds.add(wall.id);
    });

    // Check opening IDs
    level.openings.forEach((opening) => {
      if (openingIds.has(opening.id)) {
        issues.push({
          code: 'DUPLICATE_OPENING_ID',
          severity: 'error',
          message: `Duplicate opening ID: ${opening.id}`,
          entityId: opening.id,
        });
      }
      openingIds.add(opening.id);
    });
  });

  return issues;
}

/**
 * Validator: Level must have at least one wall (warning)
 */
export function validateLevelHasWalls(level: Level): ValidationIssue[] {
  if (level.walls.length === 0) {
    return [
      {
        code: 'EMPTY_LEVEL',
        severity: 'warning',
        message: `Level ${level.id} has no walls`,
        entityId: level.id,
      },
    ];
  }

  return [];
}

/**
 * Validator: Openings must not overlap on the same wall
 */
export function validateOpeningsNoOverlap(level: Level): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Group openings by wall
  const openingsByWall = new Map<string, Opening[]>();
  level.openings.forEach((opening) => {
    const wallOpenings = openingsByWall.get(opening.wallId) || [];
    wallOpenings.push(opening);
    openingsByWall.set(opening.wallId, wallOpenings);
  });

  // Check each wall for overlapping openings
  openingsByWall.forEach((openings, wallId) => {
    if (openings.length < 2) return; // No overlap possible

    // Sort by offset
    const sorted = [...openings].sort((a, b) => a.offsetMm - b.offsetMm);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentEnd = current.offsetMm + current.widthMm;
      const nextStart = next.offsetMm;

      if (currentEnd > nextStart) {
        issues.push({
          code: 'OPENINGS_OVERLAP',
          severity: 'error',
          message: `Openings ${current.id} and ${next.id} overlap on wall ${wallId}`,
          entityId: current.id,
        });
      }
    }
  });

  return issues;
}

/**
 * Main validator function (runs all validation rules)
 *
 * This is the primary entry point for validation.
 * Returns array of all issues found (empty array = valid).
 *
 * @param project - Project to validate
 * @returns Array of validation issues (empty if valid)
 */
export function validateProject(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Schema validation is implicit (Zod throws if schema invalid)
  // This validator assumes schema is already valid

  // Unique IDs validation
  issues.push(...validateUniqueIds(project));

  // Level and entity validations
  project.levels.forEach((level) => {
    // Level validations
    issues.push(...validateLevelHasWalls(level));

    // Wall validations
    level.walls.forEach((wall) => {
      issues.push(...validateWallLength(wall));
    });

    // Opening validations
    level.openings.forEach((opening) => {
      issues.push(...validateOpeningFitsWall(opening, level.walls));
      issues.push(...validateOpeningDimensions(opening));
    });

    // Opening overlap validations
    issues.push(...validateOpeningsNoOverlap(level));
  });

  return issues;
}

/**
 * Check if project has any errors (severity = 'error')
 */
export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

/**
 * Get only errors from issues array
 */
export function getErrors(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}

/**
 * Get only warnings from issues array
 */
export function getWarnings(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.severity === 'warning');
}

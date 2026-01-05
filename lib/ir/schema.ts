/**
 * FloorForge Intermediate Representation (IR) Schema
 *
 * This is the single source of truth for all floor plan data.
 * All geometry is derived from this IR at render time.
 *
 * Design Principles:
 * - All dimensions in millimeters (mm baseline)
 * - IDs everywhere for diff/undo support
 * - Store intent (e.g., "door on wall at offset"), not derived geometry
 * - Strict Zod validation catches AI hallucinations
 *
 * @see docs/ARCHITECTURE.md - ADR-001: IR as Single Source of Truth
 */

import { z } from 'zod';

/**
 * Coordinate in millimeters (mm baseline)
 * Origin (0, 0) is typically top-left of lot
 */
export const PointSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
});

export type Point = z.infer<typeof PointSchema>;

/**
 * Wall defined by two endpoints + thickness
 * Walls are the primary structural element
 */
export const WallSchema = z.object({
  id: z.string().regex(/^w[0-9]+$/, 'Wall ID must be in format w1, w2, etc.'),
  a: PointSchema,
  b: PointSchema,
  thicknessMm: z.number().int().min(100).max(500), // 100-500mm typical range
  heightMm: z.number().int().min(1800).max(4000).default(2700), // Standard ceiling height
});

export type Wall = z.infer<typeof WallSchema>;

/**
 * Opening type (door or window)
 */
export const OpeningTypeSchema = z.enum(['door', 'window']);

export type OpeningType = z.infer<typeof OpeningTypeSchema>;

/**
 * Opening (door/window) positioned on a wall
 *
 * Positioning:
 * - offsetMm: distance from wall.a to opening CENTER along wall
 * - widthMm: opening width
 * - Opening must fit within wall segment (validated by validator)
 */
export const OpeningSchema = z.object({
  id: z.string().regex(/^o[0-9]+$/, 'Opening ID must be in format o1, o2, etc.'),
  wallId: z.string(), // References wall.id
  type: OpeningTypeSchema,
  offsetMm: z.number().int().min(0), // Distance from wall.a to opening center
  widthMm: z.number().int().min(600).max(3000), // 600-3000mm typical range
  heightMm: z.number().int().min(600).max(2400), // Opening height
  sillHeightMm: z.number().int().min(0).max(1500).default(0), // 0 for doors, ~900mm for windows
});

export type Opening = z.infer<typeof OpeningSchema>;

/**
 * Level (single floor of a building)
 * MVP: Single level only, but structure supports multiple
 */
export const LevelSchema = z.object({
  id: z.string().regex(/^l[0-9]+$/, 'Level ID must be in format l1, l2, etc.'),
  name: z.string().min(1).default('Ground Floor'),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
});

export type Level = z.infer<typeof LevelSchema>;

/**
 * Units type (only mm for MVP - strict)
 */
export const UnitsSchema = z.literal('mm');

export type Units = z.infer<typeof UnitsSchema>;

/**
 * Project (top-level container)
 * Represents a complete floor plan
 */
export const ProjectSchema = z.object({
  id: z.string().regex(/^p[0-9]+$/, 'Project ID must be in format p1, p2, etc.'),
  name: z.string().min(1),
  units: UnitsSchema, // Only mm for MVP
  levels: z.array(LevelSchema).min(1), // At least one level required
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Helper function to create a new empty project
 */
export function createEmptyProject(name: string): Project {
  return {
    id: 'p1',
    name,
    units: 'mm',
    levels: [
      {
        id: 'l1',
        name: 'Ground Floor',
        walls: [],
        openings: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validate a project against the schema
 * Returns parsed project if valid, throws ZodError if invalid
 */
export function validateProjectSchema(data: unknown): Project {
  return ProjectSchema.parse(data);
}

/**
 * Safe validation that returns success/error instead of throwing
 */
export function safeValidateProjectSchema(data: unknown): {
  success: boolean;
  data?: Project;
  error?: z.ZodError;
} {
  const result = ProjectSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

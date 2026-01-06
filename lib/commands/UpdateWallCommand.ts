/**
 * UpdateWallCommand
 * 
 * Command to update wall properties (endpoints, thickness, etc.)
 */

import type { Project, Wall, Point } from '@/lib/ir/schema';
import { BaseCommand } from './Command';

export class UpdateWallCommand extends BaseCommand {
  private wallId: string;
  private project: Project;
  private levelIndex: number;
  private oldProperties: Partial<Wall>;
  private newProperties: Partial<Wall>;

  constructor(
    wallId: string,
    newProperties: Partial<Wall>,
    project: Project,
    levelIndex: number
  ) {
    super();
    this.wallId = wallId;
    this.newProperties = newProperties;
    this.project = project;
    this.levelIndex = levelIndex;

    const wall = project.levels[levelIndex]?.walls.find((w) => w.id === wallId);
    if (!wall) {
      throw new Error(`Wall ${wallId} not found`);
    }

    // Store old values for undo
    this.oldProperties = {};
    if ('a' in newProperties) this.oldProperties.a = { ...wall.a };
    if ('b' in newProperties) this.oldProperties.b = { ...wall.b };
    if ('thicknessMm' in newProperties) this.oldProperties.thicknessMm = wall.thicknessMm;
  }

  execute(): void {
    const level = this.project.levels[this.levelIndex];
    const wall = level?.walls.find((w: Wall) => w.id === this.wallId);
    if (wall) {
      Object.assign(wall, this.newProperties);
    }
  }

  undo(): void {
    const level = this.project.levels[this.levelIndex];
    const wall = level?.walls.find((w: Wall) => w.id === this.wallId);
    if (wall) {
      Object.assign(wall, this.oldProperties);
    }
  }

  get description(): string {
    return `Update wall ${this.wallId} properties`;
  }
}

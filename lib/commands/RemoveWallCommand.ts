/**
 * RemoveWallCommand
 *
 * Command to remove a wall from the floor plan.
 * Supports undo/redo operations.
 */

import { BaseCommand } from './Command';
import type { Project, Wall } from '@/lib/ir/schema';

export class RemoveWallCommand extends BaseCommand {
  private wall: Wall;
  private project: Project;
  private levelIndex: number;
  private originalIndex: number = -1;

  constructor(wallId: string, project: Project, levelIndex: number = 0) {
    super();
    this.project = project;
    this.levelIndex = levelIndex;

    // Find and store the wall
    const walls = project.levels[levelIndex].walls;
    const index = walls.findIndex((w) => w.id === wallId);

    if (index === -1) {
      throw new Error(`Wall with id ${wallId} not found`);
    }

    this.wall = walls[index];
    this.originalIndex = index;
  }

  execute(): void {
    const walls = this.project.levels[this.levelIndex].walls;
    const index = walls.findIndex((w) => w.id === this.wall.id);
    if (index !== -1) {
      walls.splice(index, 1);
    }
  }

  undo(): void {
    // Re-insert at original position if possible
    const walls = this.project.levels[this.levelIndex].walls;
    if (this.originalIndex <= walls.length) {
      walls.splice(this.originalIndex, 0, this.wall);
    } else {
      walls.push(this.wall);
    }
  }

  get description(): string {
    return `Remove Wall ${this.wall.id}`;
  }
}

/**
 * AddWallCommand
 *
 * Command to add a new wall to the floor plan.
 * Supports undo/redo operations.
 */

import { BaseCommand } from './Command';
import type { Project, Wall } from '@/lib/ir/schema';

export class AddWallCommand extends BaseCommand {
  private wall: Wall;
  private project: Project;
  private levelIndex: number;

  constructor(wall: Wall, project: Project, levelIndex: number = 0) {
    super();
    this.wall = wall;
    this.project = project;
    this.levelIndex = levelIndex;
  }

  execute(): void {
    this.project.levels[this.levelIndex].walls.push(this.wall);
  }

  undo(): void {
    const walls = this.project.levels[this.levelIndex].walls;
    const index = walls.findIndex((w) => w.id === this.wall.id);
    if (index !== -1) {
      walls.splice(index, 1);
    }
  }

  get description(): string {
    return `Add Wall ${this.wall.id}`;
  }
}

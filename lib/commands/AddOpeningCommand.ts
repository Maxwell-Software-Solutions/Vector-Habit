/**
 * AddOpeningCommand
 *
 * Command to add a new opening (door/window) to a wall.
 * Supports undo/redo operations.
 */

import { BaseCommand } from './Command';
import type { Project, Opening } from '@/lib/ir/schema';

export class AddOpeningCommand extends BaseCommand {
  private opening: Opening;
  private project: Project;
  private levelIndex: number;

  constructor(opening: Opening, project: Project, levelIndex: number = 0) {
    super();
    this.opening = opening;
    this.project = project;
    this.levelIndex = levelIndex;
  }

  execute(): void {
    this.project.levels[this.levelIndex].openings.push(this.opening);
  }

  undo(): void {
    const openings = this.project.levels[this.levelIndex].openings;
    const index = openings.findIndex((o) => o.id === this.opening.id);
    if (index !== -1) {
      openings.splice(index, 1);
    }
  }

  get description(): string {
    return `Add ${this.opening.type === 'door' ? 'Door' : 'Window'} ${this.opening.id}`;
  }
}

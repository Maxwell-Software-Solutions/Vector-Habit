/**
 * RemoveOpeningCommand
 *
 * Command to remove an opening from the floor plan.
 * Supports undo/redo operations.
 */

import { BaseCommand } from './Command';
import type { Project, Opening } from '@/lib/ir/schema';

export class RemoveOpeningCommand extends BaseCommand {
  private opening: Opening;
  private project: Project;
  private levelIndex: number;
  private originalIndex: number = -1;

  constructor(openingId: string, project: Project, levelIndex: number = 0) {
    super();
    this.project = project;
    this.levelIndex = levelIndex;

    // Find and store the opening
    const openings = project.levels[levelIndex].openings;
    const index = openings.findIndex((o) => o.id === openingId);

    if (index === -1) {
      throw new Error(`Opening with id ${openingId} not found`);
    }

    this.opening = openings[index];
    this.originalIndex = index;
  }

  execute(): void {
    const openings = this.project.levels[this.levelIndex].openings;
    const index = openings.findIndex((o) => o.id === this.opening.id);
    if (index !== -1) {
      openings.splice(index, 1);
    }
  }

  undo(): void {
    // Re-insert at original position if possible
    const openings = this.project.levels[this.levelIndex].openings;
    if (this.originalIndex <= openings.length) {
      openings.splice(this.originalIndex, 0, this.opening);
    } else {
      openings.push(this.opening);
    }
  }

  get description(): string {
    return `Remove ${this.opening.type === 'door' ? 'Door' : 'Window'} ${this.opening.id}`;
  }
}

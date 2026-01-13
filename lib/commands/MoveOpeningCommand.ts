/**
 * MoveOpeningCommand
 *
 * Command to move an opening along its parent wall by changing its offset.
 */

import type { Project, Opening } from '@/lib/ir/schema';
import { BaseCommand } from './Command';

export class MoveOpeningCommand extends BaseCommand {
  private openingId: string;
  private project: Project;
  private levelIndex: number;
  private oldOffset: number;
  private newOffset: number;

  constructor(openingId: string, newOffset: number, project: Project, levelIndex: number) {
    super();
    this.openingId = openingId;
    this.newOffset = newOffset;
    this.project = project;
    this.levelIndex = levelIndex;

    const opening = project.levels[levelIndex]?.openings.find((o) => o.id === openingId);
    if (!opening) {
      throw new Error(`Opening ${openingId} not found`);
    }
    this.oldOffset = opening.offsetMm;
  }

  execute(): void {
    const level = this.project.levels[this.levelIndex];
    const opening = level?.openings.find((o: Opening) => o.id === this.openingId);
    if (opening) {
      opening.offsetMm = this.newOffset;
    }
  }

  undo(): void {
    const level = this.project.levels[this.levelIndex];
    const opening = level?.openings.find((o: Opening) => o.id === this.openingId);
    if (opening) {
      opening.offsetMm = this.oldOffset;
    }
  }

  get description(): string {
    return `Move opening ${this.openingId} to offset ${this.newOffset}mm`;
  }
}

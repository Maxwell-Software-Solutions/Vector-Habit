/**
 * UpdateOpeningCommand
 * 
 * Command to update opening properties (width, type, etc.)
 */

import type { Project, Opening } from '@/lib/ir/schema';
import { BaseCommand } from './Command';

export class UpdateOpeningCommand extends BaseCommand {
  private openingId: string;
  private project: Project;
  private levelIndex: number;
  private oldProperties: Partial<Opening>;
  private newProperties: Partial<Opening>;

  constructor(
    openingId: string,
    newProperties: Partial<Opening>,
    project: Project,
    levelIndex: number
  ) {
    super();
    this.openingId = openingId;
    this.newProperties = newProperties;
    this.project = project;
    this.levelIndex = levelIndex;

    const opening = project.levels[levelIndex]?.openings.find((o) => o.id === openingId);
    if (!opening) {
      throw new Error(`Opening ${openingId} not found`);
    }

    // Store old values for undo
    this.oldProperties = {};
    if ('widthMm' in newProperties) this.oldProperties.widthMm = opening.widthMm;
    if ('type' in newProperties) this.oldProperties.type = opening.type;
  }

  execute(): void {
    const level = this.project.levels[this.levelIndex];
    const opening = level?.openings.find((o: Opening) => o.id === this.openingId);
    if (opening) {
      Object.assign(opening, this.newProperties);
    }
  }

  undo(): void {
    const level = this.project.levels[this.levelIndex];
    const opening = level?.openings.find((o: Opening) => o.id === this.openingId);
    if (opening) {
      Object.assign(opening, this.oldProperties);
    }
  }

  get description(): string {
    return `Update opening ${this.openingId} properties`;
  }
}

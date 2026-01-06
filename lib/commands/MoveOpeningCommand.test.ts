/**
 * Tests for MoveOpeningCommand
 */

import { MoveOpeningCommand } from './MoveOpeningCommand';
import type { Project } from '@/lib/ir/schema';

describe('MoveOpeningCommand', () => {
  let project: Project;

  beforeEach(() => {
    project = {
      id: 'test-project',
      name: 'Test Project',
      units: 'mm' as const,
      levels: [
        {
          id: 'level-0',
          name: 'Ground Floor',
          walls: [
            {
              id: 'wall-1',
              a: { x: 0, y: 0 },
              b: { x: 5000, y: 0 },
              thicknessMm: 200,
              heightMm: 2700,
            },
          ],
          openings: [
            {
              id: 'door-1',
              type: 'door',
              wallId: 'wall-1',
              offsetMm: 1000,
              widthMm: 900,              heightMm: 2100,
              sillHeightMm: 0,            },
          ],
        },
      ],
    };
  });

  it('should move opening along wall', () => {
    const command = new MoveOpeningCommand('door-1', 2000, project, 0);

    command.execute();

    expect(project.levels[0].openings[0].offsetMm).toBe(2000);
  });

  it('should undo opening movement', () => {
    const command = new MoveOpeningCommand('door-1', 2000, project, 0);

    command.execute();
    expect(project.levels[0].openings[0].offsetMm).toBe(2000);

    command.undo();
    expect(project.levels[0].openings[0].offsetMm).toBe(1000);
  });

  it('should throw error if opening not found', () => {
    expect(() => {
      new MoveOpeningCommand('non-existent', 2000, project, 0);
    }).toThrow('Opening non-existent not found');
  });

  it('should have a descriptive message', () => {
    const command = new MoveOpeningCommand('door-1', 2000, project, 0);

    expect(command.description).toBe('Move opening door-1 to offset 2000mm');
  });

  it('should handle multiple execute/undo cycles', () => {
    const command = new MoveOpeningCommand('door-1', 2000, project, 0);

    command.execute();
    expect(project.levels[0].openings[0].offsetMm).toBe(2000);

    command.undo();
    expect(project.levels[0].openings[0].offsetMm).toBe(1000);

    command.execute();
    expect(project.levels[0].openings[0].offsetMm).toBe(2000);
  });
});

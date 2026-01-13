/**
 * Tests for UpdateOpeningCommand
 */

import { UpdateOpeningCommand } from './UpdateOpeningCommand';
import type { Project } from '@/lib/ir/schema';

describe('UpdateOpeningCommand', () => {
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
              widthMm: 900,
              heightMm: 2100,
              sillHeightMm: 0,
            },
          ],
        },
      ],
    };
  });

  it('should update opening width', () => {
    const command = new UpdateOpeningCommand('door-1', { widthMm: 1200 }, project, 0);

    command.execute();

    expect(project.levels[0].openings[0].widthMm).toBe(1200);
  });

  it('should update opening type', () => {
    const command = new UpdateOpeningCommand('door-1', { type: 'window' }, project, 0);

    command.execute();

    expect(project.levels[0].openings[0].type).toBe('window');
  });

  it('should undo opening width change', () => {
    const command = new UpdateOpeningCommand('door-1', { widthMm: 1200 }, project, 0);

    command.execute();
    expect(project.levels[0].openings[0].widthMm).toBe(1200);

    command.undo();
    expect(project.levels[0].openings[0].widthMm).toBe(900);
  });

  it('should undo opening type change', () => {
    const command = new UpdateOpeningCommand('door-1', { type: 'window' }, project, 0);

    command.execute();
    expect(project.levels[0].openings[0].type).toBe('window');

    command.undo();
    expect(project.levels[0].openings[0].type).toBe('door');
  });

  it('should throw error if opening not found', () => {
    expect(() => {
      new UpdateOpeningCommand('non-existent', { widthMm: 1200 }, project, 0);
    }).toThrow('Opening non-existent not found');
  });

  it('should have a descriptive message', () => {
    const command = new UpdateOpeningCommand('door-1', { widthMm: 1200 }, project, 0);

    expect(command.description).toBe('Update opening door-1 properties');
  });
});

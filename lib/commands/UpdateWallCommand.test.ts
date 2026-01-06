/**
 * Tests for UpdateWallCommand
 */

import { UpdateWallCommand } from './UpdateWallCommand';
import type { Project } from '@/lib/ir/schema';

describe('UpdateWallCommand', () => {
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
          openings: [],
        },
      ],
    };
  });

  it('should update wall thickness', () => {
    const command = new UpdateWallCommand('wall-1', { thicknessMm: 300 }, project, 0);

    command.execute();

    expect(project.levels[0].walls[0].thicknessMm).toBe(300);
  });

  it('should update wall endpoint A', () => {
    const command = new UpdateWallCommand('wall-1', { a: { x: 1000, y: 1000 } }, project, 0);

    command.execute();

    expect(project.levels[0].walls[0].a).toEqual({ x: 1000, y: 1000 });
    expect(project.levels[0].walls[0].b).toEqual({ x: 5000, y: 0 }); // B unchanged
  });

  it('should update wall endpoint B', () => {
    const command = new UpdateWallCommand('wall-1', { b: { x: 6000, y: 1000 } }, project, 0);

    command.execute();

    expect(project.levels[0].walls[0].a).toEqual({ x: 0, y: 0 }); // A unchanged
    expect(project.levels[0].walls[0].b).toEqual({ x: 6000, y: 1000 });
  });

  it('should undo wall thickness change', () => {
    const command = new UpdateWallCommand('wall-1', { thicknessMm: 300 }, project, 0);

    command.execute();
    expect(project.levels[0].walls[0].thicknessMm).toBe(300);

    command.undo();
    expect(project.levels[0].walls[0].thicknessMm).toBe(200);
  });

  it('should undo wall endpoint change', () => {
    const command = new UpdateWallCommand('wall-1', { a: { x: 1000, y: 1000 } }, project, 0);

    command.execute();
    expect(project.levels[0].walls[0].a).toEqual({ x: 1000, y: 1000 });

    command.undo();
    expect(project.levels[0].walls[0].a).toEqual({ x: 0, y: 0 });
  });

  it('should throw error if wall not found', () => {
    expect(() => {
      new UpdateWallCommand('non-existent', { thicknessMm: 300 }, project, 0);
    }).toThrow('Wall non-existent not found');
  });

  it('should have a descriptive message', () => {
    const command = new UpdateWallCommand('wall-1', { thicknessMm: 300 }, project, 0);

    expect(command.description).toBe('Update wall wall-1 properties');
  });
});

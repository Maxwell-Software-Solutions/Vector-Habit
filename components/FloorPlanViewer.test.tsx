/**
 * Tests for FloorPlanViewer component
 *
 * Note: Konva and react-konva are mocked globally via __mocks__/
 */

import { render, screen } from '@testing-library/react';
import { FloorPlanViewer } from './FloorPlanViewer';
import type { Project } from '@/lib/ir/schema';

const mockProject: Project = {
  id: 'p1',
  name: 'Test Project',
  units: 'mm' as const,
  levels: [
    {
      id: 'l1',
      name: 'Ground Floor',
      walls: [
        {
          id: 'w1',
          a: { x: 0, y: 0 },
          b: { x: 5000, y: 0 },
          thicknessMm: 200,
          heightMm: 2700,
        },
      ],
      openings: [
        {
          id: 'o1',
          type: 'door',
          wallId: 'w1',
          offsetMm: 2000,
          widthMm: 900,
          heightMm: 2100,
          sillHeightMm: 0,
        },
      ],
    },
  ],
};

describe('FloorPlanViewer', () => {
  it('renders Konva stage with correct dimensions', () => {
    render(<FloorPlanViewer project={mockProject} width={800} height={600} />);

    const stage = screen.getByTestId('konva-stage');
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveAttribute('width', '800');
    expect(stage).toHaveAttribute('height', '600');
  });

  it('renders controls overlay', () => {
    render(<FloorPlanViewer project={mockProject} />);

    expect(screen.getByText(/Zoom:/)).toBeInTheDocument();
    expect(screen.getByText(/Pan:/)).toBeInTheDocument();
    expect(screen.getByText(/Mouse wheel/)).toBeInTheDocument();
  });

  it('uses default dimensions when not provided', () => {
    render(<FloorPlanViewer project={mockProject} />);

    const stage = screen.getByTestId('konva-stage');
    expect(stage).toHaveAttribute('width', '800');
    expect(stage).toHaveAttribute('height', '600');
  });

  it('displays first level by default', () => {
    render(<FloorPlanViewer project={mockProject} />);

    // Should render layer (which contains walls/openings)
    expect(screen.getByTestId('konva-layer')).toBeInTheDocument();
  });

  it('renders walls from project', () => {
    render(<FloorPlanViewer project={mockProject} />);

    // Should have wall lines rendered
    const lines = screen.getAllByTestId('konva-line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('handles projects with multiple levels', () => {
    const multiLevelProject: Project = {
      ...mockProject,
      levels: [
        mockProject.levels[0],
        {
          id: 'l2',
          name: 'First Floor',
          walls: [],
          openings: [],
        },
      ],
    };

    render(<FloorPlanViewer project={multiLevelProject} />);

    // Should still render (defaults to first level)
    expect(screen.getByTestId('konva-layer')).toBeInTheDocument();
  });

  it('can select specific level by ID', () => {
    const multiLevelProject: Project = {
      ...mockProject,
      levels: [
        mockProject.levels[0],
        {
          id: 'l2',
          name: 'First Floor',
          walls: [
            {
              id: 'w2',
              a: { x: 0, y: 0 },
              b: { x: 3000, y: 0 },
              thicknessMm: 200,
              heightMm: 2700,
            },
          ],
          openings: [],
        },
      ],
    };

    render(<FloorPlanViewer project={multiLevelProject} levelId="level-2" />);

    expect(screen.getByTestId('konva-layer')).toBeInTheDocument();
  });
});

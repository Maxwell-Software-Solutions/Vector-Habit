import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Page />);
    const heading = screen.getByText(/FloorForge/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders the logo', () => {
    render(<Page />);
    const logo = screen.getByAltText(/FloorForge Logo/i);
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/vercel-triangle.svg');
  });

  it('renders the subtitle', () => {
    render(<Page />);
    expect(screen.getByText(/AI-Driven Floor Plan Design Tool/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 2: Canvas Viewer Prototype/i)).toBeInTheDocument();
  });

  it('renders the FloorPlanViewer canvas', () => {
    render(<Page />);
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
  });

  it('renders the Project section', () => {
    render(<Page />);
    expect(screen.getByText(/📐 Project/i)).toBeInTheDocument();
    expect(screen.getByText(/Simple Rectangular Room/i)).toBeInTheDocument();
    expect(screen.getByText(/Levels:/i)).toBeInTheDocument();
    expect(screen.getByText(/Walls:/i)).toBeInTheDocument();
  });

  it('renders the Stage 1 Complete section', () => {
    render(<Page />);
    expect(screen.getByText(/✅ Stage 1 Complete/i)).toBeInTheDocument();
    expect(screen.getByText(/IR Schema/i)).toBeInTheDocument();
    expect(screen.getByText(/Validation Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Test Coverage/i)).toBeInTheDocument();
  });

  it('renders the Stage 2 Features section', () => {
    render(<Page />);
    expect(screen.getByText(/🎨 Stage 2 Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Konva.js Canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/Geometry Derivation/i)).toBeInTheDocument();
    expect(screen.getByText(/Pan\/Zoom Controls/i)).toBeInTheDocument();
  });

  it('applies gradient-border class to feature cards', () => {
    const { container } = render(<Page />);
    const featureCards = container.querySelectorAll('.gradient-border');
    expect(featureCards).toHaveLength(3);
  });
});

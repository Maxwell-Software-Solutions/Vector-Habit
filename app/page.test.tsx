import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Page />);
    const heading = screen.getByText(/Vercel Spine/i);
    expect(heading).toBeInTheDocument();
  });

  it('renders the Vercel triangle', () => {
    render(<Page />);
    const triangle = screen.getByAltText(/Vercel Triangle/i);
    expect(triangle).toBeInTheDocument();
    expect(triangle).toHaveAttribute('src', '/vercel-triangle.svg');
  });

  it('renders the subtitle', () => {
    render(<Page />);
    expect(screen.getByText(/Next.js Full-Stack Template/i)).toBeInTheDocument();
  });

  it('renders the Features section', () => {
    render(<Page />);
    expect(screen.getByText(/🚀 Features/i)).toBeInTheDocument();
    expect(screen.getByText(/Next.js 14 App Router/i)).toBeInTheDocument();
    expect(screen.getByText(/TypeScript/i)).toBeInTheDocument();
    expect(screen.getByText(/Tailwind CSS/i)).toBeInTheDocument();
    expect(screen.getByText(/GraphQL with Apollo/i)).toBeInTheDocument();
  });

  it('renders the Testing section', () => {
    render(<Page />);
    expect(screen.getByText(/✅ Testing/i)).toBeInTheDocument();
    expect(screen.getByText(/Jest \(95% coverage\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Playwright E2E/i)).toBeInTheDocument();
    expect(screen.getByText(/Lighthouse CI/i)).toBeInTheDocument();
    expect(screen.getByText(/Unified test command/i)).toBeInTheDocument();
  });

  it('renders the Tools section', () => {
    render(<Page />);
    expect(screen.getByText(/🛠️ Tools/i)).toBeInTheDocument();
    expect(screen.getByText(/Prisma ORM/i)).toBeInTheDocument();
    expect(screen.getByText(/NextAuth.js/i)).toBeInTheDocument();
    expect(screen.getByText(/Plop.js generators/i)).toBeInTheDocument();
    expect(screen.getByText(/TurboRepo/i)).toBeInTheDocument();
  });

  it('applies gradient-border class to feature cards', () => {
    const { container } = render(<Page />);
    const featureCards = container.querySelectorAll('.gradient-border');
    expect(featureCards).toHaveLength(3);
  });
});

import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2023 Maxwell Software Solutions MB/i)).toBeInTheDocument();
  });

  it('has proper accessibility role', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('has centered text styling', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('text-center');
  });

  it('has correct font size styling', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('text-sm');
  });

  it('is accessible via testid', () => {
    render(<Footer />);
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});

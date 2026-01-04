/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders card correctly', () => {
      const { container } = render(<Card>Card Content</Card>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<Card ref={ref as any}>Content</Card>);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('CardHeader', () => {
    it('renders card header correctly', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CardHeader className="custom">Header</CardHeader>);
      expect(container.firstChild).toHaveClass('custom');
    });
  });

  describe('CardTitle', () => {
    it('renders card title correctly', () => {
      render(<CardTitle>Title Text</CardTitle>);
      expect(screen.getByText('Title Text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CardTitle className="custom">Title</CardTitle>);
      expect(container.firstChild).toHaveClass('custom');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<CardTitle ref={ref as any}>Title</CardTitle>);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('CardDescription', () => {
    it('renders card description correctly', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CardDescription className="custom">Description</CardDescription>
      );
      expect(container.firstChild).toHaveClass('custom');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<CardDescription ref={ref as any}>Description</CardDescription>);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('CardContent', () => {
    it('renders card content correctly', () => {
      render(<CardContent>Content text</CardContent>);
      expect(screen.getByText('Content text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CardContent className="custom">Content</CardContent>);
      expect(container.firstChild).toHaveClass('custom');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<CardContent ref={ref as any}>Content</CardContent>);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('CardFooter', () => {
    it('renders card footer correctly', () => {
      render(<CardFooter>Footer text</CardFooter>);
      expect(screen.getByText('Footer text')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CardFooter className="custom">Footer</CardFooter>);
      expect(container.firstChild).toHaveClass('custom');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };
      render(<CardFooter ref={ref as any}>Footer</CardFooter>);
      expect(ref.current).toBeTruthy();
    });
  });

  describe('Complete Card', () => {
    it('renders complete card with all sections', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });
  });
});

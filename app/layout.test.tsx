import { render } from '@testing-library/react';
import RootLayout, { metadata, viewport } from './layout';

describe('RootLayout', () => {
  it('renders children correctly', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(container.querySelector('html')).toBeInTheDocument();
    expect(container.querySelector('body')).toBeInTheDocument();
    expect(container.textContent).toContain('Test Content');
    expect(container.textContent).toContain('© 2023 Maxwell Software Solutions MB');
  });

  it('applies Inter font class to body', () => {
    const { container } = render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>
    );

    const body = container.querySelector('body');
    expect(body).toHaveAttribute('class');
    expect(body?.className).toBeTruthy();
  });

  it('has correct html lang attribute', () => {
    const { container } = render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>
    );

    const html = container.querySelector('html');
    expect(html).toHaveAttribute('lang', 'en');
  });
});

describe('Metadata', () => {
  it('exports correct metadata', () => {
    expect(metadata).toEqual({
      title: 'Vercel Spine - Next.js Full-Stack Template',
      description:
        'Enterprise-ready Next.js template with GraphQL, Prisma, and comprehensive testing',
      manifest: '/manifest.json',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Vercel Spine',
      },
    });
  });
});

describe('Viewport', () => {
  it('exports correct viewport config', () => {
    expect(viewport).toEqual({
      width: 'device-width',
      initialScale: 1,
      maximumScale: 5,
      themeColor: '#000000',
    });
  });
});

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AiInlineRequest from '@/components/AiInlineRequest';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  variable: '--font-inter',
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: 'Vercel Spine - Next.js Full-Stack Template',
  description: 'Enterprise-ready Next.js template with GraphQL, Prisma, and comprehensive testing',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vercel Spine',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Only show inline AI editor when explicitly enabled
  const showInlineAI = process.env.NEXT_PUBLIC_INLINE_AI === '1';

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <div className="flex-1">
          {children}
        </div>
        <Footer />
        {showInlineAI && <AiInlineRequest />}
      </body>
    </html>
  );
}

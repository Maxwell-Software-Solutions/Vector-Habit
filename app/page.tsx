import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image 
            src="/vercel-triangle.svg" 
            alt="Vercel Triangle" 
            width={40}
            height={40}
            className="flex-shrink-0"
            priority
          />
          <h1 
            data-ai-id="hero-heading" 
            className="text-4xl font-bold gradient-text"
          >
            Vercel Spine
          </h1>
        </div>
        <p data-ai-id="hero-description" className="text-center text-lg mb-4">
          Next.js Full-Stack Template with GraphQL, Prisma, and Comprehensive Testing
        </p>
        <div data-ai-id="features-section" className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div data-ai-id="feature-card-features" className="p-6 gradient-border">
            <h2 className="text-xl font-semibold mb-2">🚀 Features</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Next.js 14 App Router</li>
              <li>TypeScript</li>
              <li>Tailwind CSS</li>
              <li>GraphQL with Apollo</li>
            </ul>
          </div>
          <div data-ai-id="feature-card-testing" className="p-6 gradient-border">
            <h2 className="text-xl font-semibold mb-2">✅ Testing</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Jest (95% coverage)</li>
              <li>Playwright E2E</li>
              <li>Lighthouse CI</li>
              <li>Unified test command</li>
            </ul>
          </div>
          <div data-ai-id="feature-card-tools" className="p-6 gradient-border">
            <h2 className="text-xl font-semibold mb-2">🛠️ Tools</h2>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Prisma ORM</li>
              <li>NextAuth.js</li>
              <li>Plop.js generators</li>
              <li>TurboRepo</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

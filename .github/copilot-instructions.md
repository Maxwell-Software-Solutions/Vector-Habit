# Vercel Spine - AI Coding Agent Instructions

## Project Overview

Enterprise Next.js 14 full-stack template with GraphQL (Apollo), Prisma ORM, and comprehensive testing infrastructure. Uses pnpm workspaces + TurboRepo for monorepo-ready architecture.

## Architecture & Data Flow

### GraphQL-First API Layer
- **Endpoint**: `app/api/graphql/route.ts` - Apollo Server integrated with Next.js App Router
- **Schema**: `lib/graphql/typeDefs.ts` - GraphQL SDL type definitions
- **Resolvers**: `lib/graphql/resolvers.ts` - Direct Prisma integration, no separate data layer
- **Client**: `lib/apolloClient.ts` - SSR-compatible Apollo Client using `@apollo/experimental-nextjs-app-support/rsc`

**Data flow**: Client → Apollo Client → `/api/graphql` → Resolvers → Prisma → PostgreSQL

### Database Layer
- **Singleton pattern**: `lib/db.ts` exports global Prisma instance to prevent connection exhaustion in dev
- **Schema**: `prisma/schema.prisma` - User/Message models with cuid() IDs
- **Critical**: Always run `pnpm prisma generate` after schema changes before build/dev

### Component Architecture
- **Server-first**: Components are Server Components by default (no 'use client')
- **Client boundaries**: Only add 'use client' for interactivity (hooks, event handlers)
- **UI library**: shadcn/ui components in `components/ui/` - import via `@/components/ui/button`
- **Styling**: Tailwind with `cn()` utility (`lib/utils.ts`) for conditional classes

## Critical Development Workflows

### Code Generation (Mandatory for Consistency)
Always use Plop generators instead of manual file creation:

```powershell
pnpm generate:component  # React component + test (prompts for server/client)
pnpm generate:api        # API route + test
pnpm generate:resolver   # GraphQL resolver with typeDefs + test
pnpm generate:e2e        # Playwright test
```

**Why**: Ensures consistent patterns, automatic test creation, and proper TypeScript types.

### Testing Strategy (Enforced Thresholds)

**Jest (Unit)** - 85% coverage minimum enforced at build time:
```powershell
pnpm test:unit          # Run with coverage
pnpm test:unit:watch    # TDD mode
```
- Coverage scope: `app/`, `components/`, `lib/` (see `jest.config.ts` collectCoverageFrom)
- **Exclusions**: `components/Providers.tsx`, `lib/apolloClient.ts` (client wrappers tested via integration)
- **Build fails** if coverage < 85% on statements/branches/functions/lines

**Playwright (E2E)** - Full-stack integration:
```powershell
pnpm test:e2e         # Headless (CI mode)
pnpm test:e2e:ui      # Interactive mode for debugging
```
- Auto-starts dev server via `webServer` config
- Tests in `tests/e2e/` run against chromium/firefox/webkit

**Lighthouse CI (Performance)** - 90+ score requirement:
```powershell
pnpm test:perf
```
- Thresholds: FCP < 2s, LCP < 2.5s, CLS < 0.1, TBT < 300ms
- Config in `lighthouserc.json`

### Build & Deploy
```powershell
pnpm build  # Runs prisma generate → next build
pnpm start  # Production server
```

**Build process**:
1. Prisma client generation (required before Next.js build)
2. TypeScript compilation with strict mode
3. Next.js optimizations (SWC minify, tree-shaking)
4. Security headers injection (CSP, X-Frame-Options - see `next.config.js`)

## Coding Principles

### KISS (Keep It Simple, Stupid)
- Prefer straightforward solutions over clever abstractions
- Server Components by default - only add `'use client'` when needed
- Direct Prisma calls in resolvers - no repository layer unless complexity demands it

### DRY (Don't Repeat Yourself)
- Use Plop generators for repetitive code patterns (components, resolvers, tests)
- Shared utilities in `lib/utils.ts` (e.g., `cn()` for class merging)
- Reusable shadcn/ui components instead of duplicating styles

### SOLID Principles (Apply When Beneficial)
- **Single Responsibility**: Each resolver handles one query/mutation, components focus on one concern
- **Open/Closed**: shadcn/ui components are customizable via props (variant, size) without modifying source
- **Dependency Inversion**: GraphQL resolvers depend on Prisma abstraction, not direct DB queries
- **Don't over-engineer**: Avoid premature abstraction - start simple, refactor when patterns emerge

**Practical examples**:
- ✅ Direct Prisma in resolvers (KISS) - no need for service layer in this template size
- ✅ `cn()` utility consolidates class merging logic (DRY)
- ✅ Button variants via CVA instead of multiple button components (Open/Closed)
- ❌ Don't create interfaces for single-use types - TypeScript infers well enough

## Project-Specific Conventions

### Import Paths
- **Always use `@/` alias**: `import { cn } from '@/lib/utils'` (never relative paths across directories)
- **Configured in**: `tsconfig.json` paths mapping

### Database Queries
- **Always include relations**: `prisma.message.findMany({ include: { author: true } })`
- **Resolver pattern**: Direct Prisma calls in resolvers, no repository layer
- **Error handling**: Prisma throws, let GraphQL handle with formatError

### Component Patterns
```tsx
// Server Component (default)
export default async function Page() {
  const client = getClient(); // Apollo SSR
  const { data } = await client.query({ query: GET_MESSAGES });
  return <MessageList messages={data.messages} />;
}

// Client Component (explicit)
'use client';
export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Styling Pattern
```tsx
import { cn } from '@/lib/utils';

// Conditional classes via cn() - never string concatenation
<div className={cn("base-class", condition && "conditional-class", className)} />
```

### shadcn/ui Integration
- **Install components**: `npx shadcx@latest add button` (updates `components/ui/`)
- **Theming**: CSS variables in `app/globals.css` (--primary, --secondary, etc.)
- **Customization**: Modify `components/ui/` directly, don't override via Tailwind

## Testing Requirements

### Unit Test Pattern (Jest + React Testing Library)
```tsx
// button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders with variant prop', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

### E2E Test Pattern (Playwright)
```typescript
// home.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Vercel Spine/i })).toBeVisible();
});
```

### GraphQL Resolver Test Pattern
```typescript
// resolvers.test.ts
import { resolvers } from './resolvers';
import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({ prisma: { message: { findMany: jest.fn() } } }));

test('messages query returns all messages', async () => {
  (prisma.message.findMany as jest.Mock).mockResolvedValue([{ id: '1', text: 'test' }]);
  const result = await resolvers.Query.messages();
  expect(result).toHaveLength(1);
});
```

## Environment & Configuration

### Required Environment Variables
```env
DATABASE_URL="postgresql://..." # Prisma connection string
NEXT_PUBLIC_GRAPHQL_URL="http://localhost:3000/api/graphql" # Apollo endpoint
NEXT_PUBLIC_INLINE_AI="1" # (Optional) Enable AI inline editor
```

### Package Manager
- **pnpm 8+ required** (enforced in `package.json` engines)
- **Never use npm/yarn** - causes lockfile conflicts
- **Install deps**: `pnpm install` (reads `pnpm-lock.yaml`)

## Security & Performance

### Security Headers (next.config.js)
- CSP with strict defaults (modify only if adding external resources)
- X-Frame-Options: DENY (prevents clickjacking)
- Console logs removed in production via SWC compiler

### Performance Optimizations
- **Font loading**: Inter font with preload + fallback (see `app/layout.tsx`)
- **Module splitting**: Modular imports for @apollo/client
- **Image optimization**: Next.js Image component (not raw <img>)

## AI-Specific Features

### Inline AI Editor (Experimental)
- **Component**: `components/AiInlineRequest.tsx` - Visual element picker + screenshot capture
- **API**: `app/api/ai-change-request/route.ts` - Processes AI change requests
- **Enable**: Set `NEXT_PUBLIC_INLINE_AI=1` in `.env` (shows UI in layout)
- **Purpose**: Allows AI to target specific DOM elements for changes

### AI Context Documentation
- **Location**: `.ai-context/` directory
- **Files**: getting-started.md, testing-guide.md, plop-usage-guide.md, project-structure.md
- **Keep updated** when making architectural changes

## Common Pitfalls

1. **Forgetting `prisma generate`** after schema changes → build fails with "Cannot find module '@prisma/client'"
2. **Using `'use client'` unnecessarily** → increases bundle size, breaks SSR optimizations
3. **Skipping coverage threshold** → CI fails, must be at 85%+ before merge
4. **Relative imports across directories** → Use `@/` alias (e.g., `@/lib/db` not `../../lib/db`)
5. **Modifying `pnpm-lock.yaml`** manually → Always use `pnpm install/update` commands
6. **Testing without dev server** → Playwright auto-starts via webServer config, don't run manually

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `pnpm dev` |
| Run all tests | `pnpm test:all` (unit → e2e → perf) |
| Generate component | `pnpm generate:component` |
| Update dependencies | `pnpm update:interactive` |
| Format code | `pnpm format` |
| Check types | `pnpm type-check` |
| Reset database | `pnpm prisma migrate reset` |

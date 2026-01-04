# Project Structure

## Root Directory

```text
vercel-spine/
├── .ai-context/          # AI-friendly documentation
├── app/                   # Next.js App Router
│   ├── api/              # API routes
│   │   └── graphql/      # GraphQL endpoint
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
├── lib/                  # Utility libraries
│   ├── db.ts            # Prisma client
│   └── graphql/         # GraphQL schema & resolvers
├── prisma/              # Prisma schema
├── tests/               # Test files
│   └── e2e/            # Playwright E2E tests
├── plop-templates/      # Code generation templates
└── plopfile.js         # Plop configuration
```

## Key Files

- `package.json` - Dependencies and scripts
- `turbo.json` - TurboRepo configuration
- `jest.config.ts` - Jest test configuration (95% coverage)
- `playwright.config.ts` - Playwright E2E configuration
- `lighthouserc.json` - Lighthouse CI performance budgets
- `.env.example` - Environment variable template

## Component Organization

- Server components in `app/` directory
- Client components use `'use client'` directive
- Shared UI components in `components/`
- Use Plop to generate new components

## GraphQL Structure

- Schema: `lib/graphql/typeDefs.ts`
- Resolvers: `lib/graphql/resolvers.ts`
- API route: `app/api/graphql/route.ts`
- Client: `lib/apolloClient.ts`

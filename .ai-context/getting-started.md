# Getting Started with Vercel Spine

## Quick Start

```powershell
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your actual database credentials

# Generate Prisma client
pnpm prisma generate

# Run development server
pnpm dev
```

Visit `http://localhost:3000`

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- OAuth credentials (GitHub, etc.)
- GraphQL endpoint URL

## Testing

```powershell
# Run all tests (unit + E2E + performance)
pnpm test:all

# Run unit tests with coverage
pnpm test:unit

# Run Playwright E2E tests
pnpm test:e2e

# Run Lighthouse CI performance tests
pnpm test:perf
```

## Code Generation

Use Plop.js for consistent code generation:

```powershell
# Interactive mode
pnpm generate

# Generate specific types
pnpm generate:component
pnpm generate:resolver
pnpm generate:api
pnpm generate:e2e
```

## Development Commands

```powershell
pnpm dev           # Start dev server
pnpm build         # Build for production
pnpm lint          # Run ESLint
pnpm format        # Format with Prettier
```

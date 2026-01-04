# Vercel Spine - Next.js Full-Stack Template

Enterprise-ready Next.js 14 template with GraphQL, Prisma, comprehensive testing, and AI-assisted development tools.

## 🚀 Features

- **Next.js 14** - App Router with TypeScript
- **GraphQL** - Apollo Server + Apollo Client with SSR
- **Database** - Prisma ORM + PostgreSQL
- **Testing** - Jest (95% coverage) + Playwright + Lighthouse CI
- **Code Generation** - Plop.js for consistent components
- **UI** - Tailwind CSS + shadcn/ui components
- **Auth** - NextAuth.js (ready to configure)
- **Monorepo** - pnpm workspaces + TurboRepo
- **AI Docs** - Comprehensive `.ai-context/` documentation

## 📋 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database

### Installation

```bash
# Clone repository
git clone https://github.com/Maxwell-Software-Solutions/Vercel-spine.git
cd Vercel-spine

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
pnpm prisma generate

# Run development server
pnpm dev
```

Visit `http://localhost:3000`

## 🧪 Testing

### Unified Test Command

```bash
# Run ALL tests (unit + E2E + performance)
pnpm test:all
```

This command runs sequentially:

1. **Jest** - Unit tests with 95% coverage requirement
2. **Playwright** - End-to-end tests with visual feedback
3. **Lighthouse CI** - Performance testing with 90+ score requirement

### Individual Test Suites

```bash
# Unit tests (Jest)
pnpm test:unit              # Run with coverage
pnpm test:unit:watch        # Watch mode
pnpm test:unit:coverage     # Detailed coverage report

# E2E tests (Playwright)
pnpm test:e2e              # Headless mode
pnpm test:e2e:headed       # See browser
pnpm test:e2e:ui           # Interactive UI mode

# Performance tests (Lighthouse)
pnpm test:perf             # Run Lighthouse CI
```

### Coverage Requirements

**Jest enforces 95% coverage on:**

- Statements
- Branches
- Functions
- Lines

Build **FAILS** if coverage drops below 95%.

### Performance Budgets

**Lighthouse CI requires 90+ scores for:**

- Performance
- Accessibility
- Best Practices
- SEO

**Core Web Vitals must meet:**

- First Contentful Paint (FCP) < 2s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 300ms

## 🛠️ Code Generation with Plop

Generate consistent code with built-in templates:

```bash
# Interactive mode
pnpm generate

# Direct generators
pnpm generate:component     # React component + test
pnpm generate:resolver      # GraphQL resolver
pnpm generate:api           # API route + test
pnpm generate:e2e          # Playwright E2E test
```

All generated files include:

- Proper TypeScript types
- Comprehensive test coverage
- Best practice patterns
- AI-friendly documentation

## 📁 Project Structure

```text
vercel-spine/
├── .ai-context/          # AI-friendly documentation
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   │   └── graphql/     # GraphQL endpoint
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/          # React components
├── lib/                 # Utilities
│   ├── db.ts           # Prisma client
│   ├── graphql/        # GraphQL schema & resolvers
│   └── apolloClient.ts # Apollo Client setup
├── prisma/             # Database schema
├── tests/              # Test files
│   └── e2e/           # Playwright E2E tests
├── plop-templates/     # Code generation templates
└── plopfile.js        # Plop configuration
```

## 🔧 Development Commands

```bash
pnpm dev            # Start development server
pnpm build          # Build for production
pnpm start          # Start production server
pnpm lint           # Run ESLint
pnpm format         # Format with Prettier
```

## 🗄️ Database Management

```bash
# Generate Prisma client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name migration_name

# Apply migrations
pnpm prisma migrate deploy

# Open Prisma Studio
pnpm prisma studio

# Push schema without migration (dev only)
pnpm prisma db push
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Environment Variables

Required:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/api/graphql
```

Optional:

```env
GITHUB_ID=...
GITHUB_SECRET=...
```

See `.env.example` for complete list.

## 📚 Documentation

Comprehensive docs in `.ai-context/`:

- `getting-started.md` - Setup and installation
- `project-structure.md` - File organization
- `testing-guide.md` - All testing information
- `plop-usage-guide.md` - Code generation guide
- `coverage-requirements.md` - Coverage details
- `performance-budgets.md` - Performance requirements
- `graphql-integration.md` - GraphQL usage
- `component-patterns.md` - Component best practices

## 🤖 AI Agent Instructions

This template is optimized for AI-assisted development:

1. **Use Plop generators** instead of manual file creation
2. **Maintain 95% coverage** on all new code
3. **Run test:all** before committing
4. **Read .ai-context/** docs for guidance
5. **Follow Playwright** for E2E test patterns
6. **Check Lighthouse** scores regularly

## 🧩 Tech Stack

| Category  | Technology                     |
| --------- | ------------------------------ |
| Framework | Next.js 14 (App Router)        |
| Language  | TypeScript 5                   |
| Database  | PostgreSQL + Prisma            |
| API       | GraphQL (Apollo)               |
| Testing   | Jest + Playwright + Lighthouse |
| UI        | Tailwind CSS + shadcn/ui       |
| Auth      | NextAuth.js                    |
| Tooling   | pnpm + TurboRepo + Plop        |

## 📦 Package Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "test:all": "pnpm test:unit && pnpm test:e2e && pnpm test:perf",
  "test:unit": "jest --coverage --ci",
  "test:e2e": "playwright test",
  "test:perf": "lhci autorun",
  "generate": "plop"
}
```

## 🎯 Quality Gates

All CI checks must pass:

✅ **ESLint** - No linting errors  
✅ **TypeScript** - Type checking  
✅ **Jest** - 95%+ coverage  
✅ **Playwright** - All E2E tests pass  
✅ **Lighthouse** - 90+ scores  
✅ **Build** - Successful production build

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run `pnpm test:all` to ensure quality
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Apollo GraphQL](https://www.apollographql.com/docs/)
- [Playwright Documentation](https://playwright.dev/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

## 💡 Tips

- Use `pnpm generate:component` for all new components
- Run `pnpm test:unit:watch` during development
- Check coverage reports in `coverage/` directory
- Review Playwright traces for failed E2E tests
- Monitor Lighthouse scores in CI artifacts

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
pnpm prisma studio  # Test connection
```

### Test Failures

```bash
# Clear test cache
pnpm jest --clearCache

# Run tests with verbose output
pnpm test:unit --verbose

# Debug Playwright tests
pnpm test:e2e:ui
```

### Build Issues

```bash
# Clean build artifacts
rm -rf .next node_modules
pnpm install
pnpm build
```

---

**Built with ❤️ by Maxwell Software Solutions**

---

## 🤖 Inline AI Editor

This project includes an admin-only inline editing tool that creates AI-structured GitHub issues for automated implementation by coding agents.

### Overview

The Inline AI Editor allows administrators to:

1. Click any element on the live/preview site
2. Describe desired changes in natural language
3. Automatically generate structured, agent-ready GitHub issues with screenshots
4. Enable GitHub Copilot (or other coding agents) to implement changes via PR

### Usage

**1. Enable the editor** (preview deployments only):

Set the environment variable in Vercel:

```bash
NEXT_PUBLIC_INLINE_AI=1
```

**2. Create a change request**:

- Open your preview site
- Click the "Inline AI Editor" widget (bottom-right corner)
- Click "🎯 Pick Element" and select the component you want to change
- Describe your desired change in plain English
- Click "🚀 Create AI Change Request"

**3. Agent implements the change**:

- A structured GitHub issue is automatically created with:
  - Screenshot of the selected element
  - AI-normalized change specification
  - Testable acceptance criteria
  - Risk assessment and complexity estimation
- GitHub Copilot (or your agent) is notified via workflow
- The agent opens a PR with the implementation
- Review and merge!

### PR Preview Feedback

When reviewing a PR preview deployment, you can provide inline feedback that automatically links to that PR:

**1. Access PR preview with PR number**:

```
https://your-preview.vercel.app/?pr=123
```

**2. Use the Inline AI Editor** as normal to create feedback

**3. Automatic linking**:

- Issue is tagged with `pr-preview-feedback` label
- Issue body includes `Related PR: #123`
- A comment is automatically posted on the PR with your feedback
- The PR team is notified of the preview feedback

**Benefits**:

- Feedback captured directly on preview deployments
- Issues automatically linked to correct PR
- Screenshot and context preserved
- No manual cross-referencing needed

### Configuration

Required environment variables for the Inline AI Editor:

```bash
# GitHub Configuration
GITHUB_OWNER=Maxwell-Software-Solutions
GITHUB_REPO=Vercel-spine
GITHUB_TOKEN=ghp_xxx                    # Fine-grained PAT with repo:issues scope

# AI Provider
OPENAI_API_KEY=sk-proj-xxx              # OpenAI API key for request structuring

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx   # Vercel Blob storage for screenshots

# Feature Flag (client-side)
NEXT_PUBLIC_INLINE_AI=1                 # Enable widget (set to 0 for production)
```

#### Detailed Setup Instructions

**1. GitHub Token (GITHUB_TOKEN)**

Create a fine-grained Personal Access Token:

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens?type=beta)
2. Click "Generate new token"
3. Configure:
   - Name: `vercel-spine-inline-ai`
   - Expiration: 90 days
   - Repository access: Select `Vercel-spine` repository only
   - Permissions: **Issues** → `Read and write` (only this permission needed)
4. Generate and copy the token (starts with `ghp_`)
5. Add to `.env.local` and Vercel environment variables

**2. OpenAI API Key (OPENAI_API_KEY)**

Get your API key from OpenAI:

1. Go to <https://platform.openai.com/api-keys>
2. Create new secret key named `vercel-spine-inline-ai`
3. Copy the key (starts with `sk-proj-` or `sk-`)
4. Set monthly budget limit (recommended: $10-20)
5. Add to `.env.local` and Vercel environment variables

**Cost**: ~$0.005 per AI request (GPT-4o), typically <$1/month for normal usage

**3. Vercel Blob Storage (BLOB_READ_WRITE_TOKEN)**

Enable Blob storage for screenshot hosting:

1. Open your Vercel project dashboard
2. Go to Storage tab → Create Database → Select "Blob"
3. Name: `inline-ai-screenshots`
4. The `BLOB_READ_WRITE_TOKEN` is auto-generated
5. Copy token to `.env.local` for local development
6. Token is automatically available in Preview/Production deployments

**Free tier**: 1GB storage, unlimited bandwidth

**4. Feature Flag (NEXT_PUBLIC_INLINE_AI)**

Control widget visibility by environment:

- **Production**: `NEXT_PUBLIC_INLINE_AI=0` (disabled) or omit variable
- **Preview**: `NEXT_PUBLIC_INLINE_AI=1` (enabled for testing)
- **Development**: `NEXT_PUBLIC_INLINE_AI=1` (enabled locally)

Set separately in Vercel for each environment to keep production secure.

### Best Practices

- **Add stable selectors**: Use `data-ai-id` attributes on components you edit frequently:

  ```tsx
  <div data-ai-id="hero-section">
    <h1 data-ai-id="hero-heading">Welcome</h1>
  </div>
  ```

- **Use preview deployments**: Test changes on preview branches before production
- **Be specific**: Provide clear, measurable descriptions (e.g., "Increase font-size to 24px" vs "make bigger")
- **Review AI issues**: Check generated issues before assigning to agents
- **Security**: Only enable on trusted preview deployments, never on public production

### How It Works

```text
User clicks element → AI structures request → GitHub issue created →
GitHub workflow notifies agent → Agent implements → PR opened → Review & merge
```

The system uses:

- **Vercel AI SDK** for structured output generation
- **Vercel Blob** for screenshot hosting
- **Octokit** for GitHub API integration
- **html-to-image** for element capture
- **Zod** for type-safe validation

### Troubleshooting

**Widget not appearing:**

- Check `NEXT_PUBLIC_INLINE_AI=1` in environment variables
- Verify you're on a preview deployment (not production)
- Clear browser cache and hard reload

**Screenshot upload fails:**

- Verify `BLOB_READ_WRITE_TOKEN` is set correctly
- Ensure Vercel Blob is enabled in project settings
- Check element is visible (not `display: none`)

**GitHub issue creation fails:**

- Verify `GITHUB_TOKEN` has `repo:issues` permission
- Check token hasn't expired
- Confirm `GITHUB_OWNER` and `GITHUB_REPO` are correct

For detailed implementation guide, see [INLINE-AI-IMPLEMENTATION.md](./INLINE-AI-IMPLEMENTATION.md).

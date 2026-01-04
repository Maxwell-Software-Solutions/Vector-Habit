# Plop.js Usage Guide

## Overview

Plop.js generates consistent code with tests. Use it for all new components, API routes, resolvers, and E2E tests.

## Available Generators

### 1. Component Generator

```powershell
pnpm generate:component
```

**Prompts:**
- Component name (PascalCase)
- Type: client or server
- Include test file? (default: yes)

**Creates:**
- `components/MyComponent.tsx`
- `components/MyComponent.test.tsx` (with 95% coverage structure)

**Client Component:**
```typescript
'use client';

import React from 'react';

export function MyComponent() {
  // Component with client-side interactivity
}
```

**Server Component:**
```typescript
import React from 'react';

export function MyComponent() {
  // Server-rendered component
}
```

### 2. GraphQL Resolver Generator

```powershell
pnpm generate:resolver
```

**Prompts:**
- Resolver name (camelCase)
- Type: Query or Mutation

**Creates:**
- `lib/graphql/resolvers/myResolver.ts`

**Template:**
```typescript
import { prisma } from '@/lib/db';

export const myResolverResolver = {
  Query: {
    myResolver: async (_parent, args, context) => {
      // Implement resolver logic
      return await prisma.model.findMany();
    },
  },
};
```

### 3. API Route Generator

```powershell
pnpm generate:api
```

**Prompts:**
- API route path (e.g., `users/profile`)

**Creates:**
- `app/api/{path}/route.ts`
- `app/api/{path}/route.test.ts`

**Template includes:**
- GET and POST handlers
- Error handling
- Comprehensive test coverage

### 4. E2E Test Generator

```powershell
pnpm generate:e2e
```

**Prompts:**
- Test name (kebab-case)

**Creates:**
- `tests/e2e/{name}.spec.ts`

**Template includes:**
- Page load test
- Visual screenshot
- Performance check
- Accessibility check

## Interactive Mode

```powershell
pnpm generate
# or
pnpm plop
```

Select generator from menu.

## Why Use Plop?

1. **Consistency** - Same structure every time
2. **Coverage** - Tests generated automatically
3. **Best Practices** - Templates enforce standards
4. **Speed** - Faster than manual creation
5. **AI-Friendly** - AI agents can use generators

## Customizing Templates

Templates are in `plop-templates/`:
- `component.hbs`
- `component.test.hbs`
- `resolver.hbs`
- `api-route.hbs`
- `api-route.test.hbs`
- `e2e-test.hbs`

Edit Handlebars templates to customize output.

## For AI Agents

When creating new components/routes/tests:

1. Use `pnpm generate:{type}` instead of manual file creation
2. Templates ensure coverage requirements are met
3. Consistent structure helps maintain codebase
4. All generated files include tests

**Example:**
```powershell
# Instead of manually creating files
pnpm generate:component
# Enter "MessageCard" as name
# Choose "client" as type
# Confirm test file generation

# Files created with proper structure and tests
```

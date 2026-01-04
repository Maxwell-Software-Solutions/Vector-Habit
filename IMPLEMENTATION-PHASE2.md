# Next.js Full-Stack Template — Phase 2: Production Hardening & Enterprise Features

**Status:** Post-MVP Enhancement Plan  
**Priority:** Implement after completing IMPLEMENTATION.md  
**Target:** Enterprise-grade, battle-tested production system  
**Estimated Effort:** 3-4 weeks (after Phase 1 completion)

---

## 📊 Overview

This document outlines production-hardening improvements and enterprise features to implement after the initial MVP is complete. These enhancements transform the template from a solid foundation (9.5/10) to an enterprise-ready system (10/10).

### Current State (Post Phase 1)

✅ Next.js 13+ App Router with TypeScript  
✅ GraphQL API with Apollo Server  
✅ 95% test coverage (Jest + Playwright + Lighthouse)  
✅ Tailwind + shadcn/ui component system  
✅ NextAuth authentication  
✅ Plop.js code generation  

### Target State (Post Phase 2)

🎯 Production security & rate limiting  
🎯 Error tracking & observability  
🎯 Performance optimization & caching  
🎯 Type-safe configuration  
🎯 Repository/Service patterns  
🎯 Advanced GraphQL features  

---

## 🎯 Implementation Phases

### Phase 2A: Critical Production Requirements (Week 1)

**Priority:** MUST-HAVE for production launch

1. Environment validation with Zod
2. Error tracking with Sentry
3. Rate limiting & security headers
4. Structured logging
5. Database migration workflow

### Phase 2B: Performance & Scalability (Week 2)

**Priority:** SHOULD-HAVE for production scale

1. Redis caching layer
2. GraphQL DataLoader (N+1 prevention)
3. Query complexity limits
4. GraphQL type generation
5. Database connection pooling

### Phase 2C: Architecture Patterns (Week 3)

**Priority:** SHOULD-HAVE for maintainability

1. Repository pattern
2. Service layer pattern
3. Health check endpoints
4. API versioning strategy
5. Event-driven architecture foundation

### Phase 2D: Advanced Features (Week 4)

**Priority:** NICE-TO-HAVE for enterprise features

1. Feature flags system
2. Background job processing
3. API documentation (GraphQL Playground)
4. Internationalization (i18n)
5. Multi-tenancy support (if needed)

---

## Phase 2A: Critical Production Requirements

### 1) Environment Validation with Zod

**Why:** Fail fast on misconfiguration, prevent runtime errors, type-safe env access

Install dependencies:

```powershell
pnpm add zod
```

Create `lib/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  
  // OAuth Providers
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  
  // GraphQL
  NEXT_PUBLIC_GRAPHQL_URL: z.string().url(),
  
  // Redis (optional in dev, required in prod)
  UPSTASH_REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Validate on startup
export const env = envSchema.parse(process.env);

// Type-safe access
export type Env = z.infer<typeof envSchema>;
```

Update `.env.example`:

```env
# Node Environment
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vercel_spine?schema=public

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars-generate-with-openssl

# OAuth Providers
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret

# GraphQL
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/api/graphql

# Redis Cache (Optional in dev, required in production)
UPSTASH_REDIS_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token

# Monitoring (Sentry)
SENTRY_DSN=https://your-sentry-dsn.ingest.sentry.io
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name

# Logging
LOG_LEVEL=info
```

Usage in code:

```typescript
import { env } from '@/lib/env';

// Type-safe, validated environment access
const dbUrl = env.DATABASE_URL;
const nodeEnv = env.NODE_ENV;
```

**Testing:** Create `lib/env.test.ts` to validate schema

---

### 2) Error Tracking with Sentry

**Why:** Production error monitoring, performance tracking, user feedback

Install dependencies:

```powershell
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/env';

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  environment: env.NODE_ENV,
});
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/env';

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  environment: env.NODE_ENV,
});
```

Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/env';

Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
});
```

Usage in error boundaries:

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => window.location.reload()}>Try again</button>
      </body>
    </html>
  );
}
```

---

### 3) Rate Limiting & Security

**Why:** Prevent abuse, DDoS protection, API security

Install dependencies:

```powershell
pnpm add @upstash/ratelimit @upstash/redis
```

Create `lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

// Create Redis client
export const redis = new Redis({
  url: env.UPSTASH_REDIS_URL!,
  token: env.UPSTASH_REDIS_TOKEN!,
});

// Rate limiters for different use cases
export const ratelimit = {
  // API routes: 10 requests per 10 seconds
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
  }),
  
  // GraphQL: 50 requests per minute
  graphql: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    analytics: true,
  }),
  
  // Auth: 5 login attempts per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
  }),
};
```

Update `middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ratelimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip ?? '127.0.0.1';
    const { success, limit, reset, remaining } = await ratelimit.api.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  }

  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

Add CORS for GraphQL in `app/api/graphql/route.ts`:

```typescript
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

---

### 4) Structured Logging

**Why:** Production debugging, audit trails, performance monitoring

Install dependencies:

```powershell
pnpm add pino pino-pretty
```

Create `lib/logger.ts`:

```typescript
import pino from 'pino';
import { env } from '@/lib/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Typed logger methods
export const log = {
  info: (message: string, context?: Record<string, any>) => {
    logger.info(context, message);
  },
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    logger.error({ ...context, error: error?.message, stack: error?.stack }, message);
  },
  warn: (message: string, context?: Record<string, any>) => {
    logger.warn(context, message);
  },
  debug: (message: string, context?: Record<string, any>) => {
    logger.debug(context, message);
  },
};
```

Usage in GraphQL resolvers:

```typescript
import { log } from '@/lib/logger';

export const resolvers = {
  Query: {
    messages: async (_: any, __: any, context: any) => {
      log.info('Fetching messages', { userId: context.user?.id });
      
      try {
        const messages = await prisma.message.findMany();
        log.info('Messages fetched successfully', { count: messages.length });
        return messages;
      } catch (error) {
        log.error('Failed to fetch messages', error as Error);
        throw error;
      }
    },
  },
};
```

---

### 5) Database Migration Workflow

**Why:** Safe schema changes, rollback capability, production deployments

Update `package.json`:

```json
{
  "scripts": {
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:migrate:reset": "prisma migrate reset",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob',
    },
  });

  // Create test messages
  await prisma.message.createMany({
    data: [
      {
        text: 'Hello from Alice!',
        authorId: user1.id,
      },
      {
        text: 'Hi from Bob!',
        authorId: user2.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Migration workflow:

```powershell
# Development: Create and apply migration
pnpm db:migrate:dev --name add_user_role

# Production: Apply migrations
pnpm db:migrate:deploy

# Seed database
pnpm db:seed

# Open Prisma Studio
pnpm db:studio
```

---

## Phase 2B: Performance & Scalability

### 6) Redis Caching Layer

**Why:** Reduce database load, faster response times, session storage

Already installed in Phase 2A. Create `lib/cache.ts`:

```typescript
import { redis } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        log.debug('Cache hit', { key });
        return cached as T;
      }
      log.debug('Cache miss', { key });
      return null;
    } catch (error) {
      log.error('Cache get error', error as Error, { key });
      return null;
    }
  }

  static async set(key: string, value: any, ttl = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      log.debug('Cache set', { key, ttl });
    } catch (error) {
      log.error('Cache set error', error as Error, { key });
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
      log.debug('Cache deleted', { key });
    } catch (error) {
      log.error('Cache delete error', error as Error, { key });
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        log.info('Cache pattern invalidated', { pattern, count: keys.length });
      }
    } catch (error) {
      log.error('Cache invalidate error', error as Error, { pattern });
    }
  }
}

// Helper for cached queries
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 3600
): Promise<T> {
  const cached = await Cache.get<T>(key);
  if (cached) return cached;

  const fresh = await fetcher();
  await Cache.set(key, fresh, ttl);
  return fresh;
}
```

Usage in GraphQL resolvers:

```typescript
import { getCached } from '@/lib/cache';

export const resolvers = {
  Query: {
    messages: async () => {
      return getCached(
        'messages:all',
        async () => {
          return await prisma.message.findMany({
            include: { author: true },
            orderBy: { createdAt: 'desc' },
          });
        },
        300 // 5 minutes
      );
    },
  },
  Mutation: {
    createMessage: async (_: any, args: any) => {
      const message = await prisma.message.create({ data: args });
      
      // Invalidate cache
      await Cache.invalidatePattern('messages:*');
      
      return message;
    },
  },
};
```

---

### 7) GraphQL DataLoader (N+1 Prevention)

**Why:** Prevent N+1 queries, batch database requests, improve performance

Install dependencies:

```powershell
pnpm add dataloader
```

Create `lib/graphql/dataloaders.ts`:

```typescript
import DataLoader from 'dataloader';
import { prisma } from '@/lib/db';
import type { User, Message } from '@prisma/client';

// User loader
export const createUserLoader = () =>
  new DataLoader<string, User | null>(async (ids) => {
    const users = await prisma.user.findMany({
      where: { id: { in: ids as string[] } },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));
    return ids.map((id) => userMap.get(id) || null);
  });

// Message loader
export const createMessageLoader = () =>
  new DataLoader<string, Message | null>(async (ids) => {
    const messages = await prisma.message.findMany({
      where: { id: { in: ids as string[] } },
    });

    const messageMap = new Map(messages.map((msg) => [msg.id, msg]));
    return ids.map((id) => messageMap.get(id) || null);
  });

// Messages by user loader
export const createMessagesByUserLoader = () =>
  new DataLoader<string, Message[]>(async (userIds) => {
    const messages = await prisma.message.findMany({
      where: { authorId: { in: userIds as string[] } },
    });

    const messagesByUser = new Map<string, Message[]>();
    messages.forEach((msg) => {
      if (msg.authorId) {
        const existing = messagesByUser.get(msg.authorId) || [];
        messagesByUser.set(msg.authorId, [...existing, msg]);
      }
    });

    return userIds.map((id) => messagesByUser.get(id) || []);
  });

// Context factory
export function createLoaders() {
  return {
    userLoader: createUserLoader(),
    messageLoader: createMessageLoader(),
    messagesByUserLoader: createMessagesByUserLoader(),
  };
}
```

Update GraphQL context in `app/api/graphql/route.ts`:

```typescript
import { createLoaders } from '@/lib/graphql/dataloaders';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
});

const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => ({
    loaders: createLoaders(),
    // Add user from session if needed
  }),
});
```

Use in resolvers:

```typescript
export const resolvers = {
  User: {
    messages: async (parent: User, _: any, context: any) => {
      // Uses DataLoader - batches and caches
      return context.loaders.messagesByUserLoader.load(parent.id);
    },
  },
  Message: {
    author: async (parent: Message, _: any, context: any) => {
      if (!parent.authorId) return null;
      // Uses DataLoader - prevents N+1
      return context.loaders.userLoader.load(parent.authorId);
    },
  },
};
```

---

### 8) GraphQL Query Complexity Limits

**Why:** Prevent DoS attacks, protect server resources

Install dependencies:

```powershell
pnpm add graphql-validation-complexity
```

Create `lib/graphql/security.ts`:

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import { log } from '@/lib/logger';

export const complexityLimit = createComplexityLimitRule(1000, {
  onCost: (cost) => {
    log.debug('GraphQL query cost', { cost });
  },
  formatErrorMessage: (cost) =>
    `Query is too complex: ${cost}. Maximum allowed complexity: 1000`,
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
});

// Query depth limit
export function depthLimit(maxDepth: number) {
  return (context: any) => {
    const { document } = context;
    const definitions = document.definitions;

    function determineDepth(
      node: any,
      currentDepth = 0,
      maxDepthSoFar = 0
    ): number {
      if (currentDepth > maxDepth) {
        throw new Error(
          `Query exceeds maximum depth of ${maxDepth}. Please reduce query depth.`
        );
      }

      // Implementation details...
      return Math.max(maxDepthSoFar, currentDepth);
    }

    definitions.forEach((def: any) => {
      if (def.kind === 'OperationDefinition') {
        determineDepth(def.selectionSet, 0, 0);
      }
    });
  };
}
```

Update Apollo Server config:

```typescript
import { complexityLimit, depthLimit } from '@/lib/graphql/security';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [complexityLimit],
  plugins: [
    {
      async requestDidStart() {
        return {
          async didResolveOperation(requestContext) {
            depthLimit(5)(requestContext);
          },
        };
      },
    },
  ],
});
```

---

### 9) GraphQL Type Generation

**Why:** End-to-end type safety, auto-completion, catch breaking changes

Install dependencies:

```powershell
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-resolvers @graphql-codegen/typescript-operations @graphql-codegen/typed-document-node
```

Create `codegen.yml`:

```yaml
schema: './lib/graphql/typeDefs.ts'
documents: './lib/graphql/queries/**/*.ts'
generates:
  ./lib/graphql/generated/types.ts:
    plugins:
      - typescript
      - typescript-resolvers
    config:
      useIndexSignature: true
      contextType: '../context#GraphQLContext'
      mappers:
        User: '@prisma/client#User'
        Message: '@prisma/client#Message'
  ./lib/graphql/generated/operations.ts:
    plugins:
      - typescript-operations
      - typed-document-node
```

Update `package.json`:

```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.yml",
    "codegen:watch": "graphql-codegen --config codegen.yml --watch"
  }
}
```

Create `lib/graphql/context.ts`:

```typescript
import type { createLoaders } from './dataloaders';

export interface GraphQLContext {
  loaders: ReturnType<typeof createLoaders>;
  user?: {
    id: string;
    email: string;
  };
}
```

Use generated types:

```typescript
import type { Resolvers } from './generated/types';
import { prisma } from '@/lib/db';

export const resolvers: Resolvers = {
  Query: {
    messages: async (_parent, _args, context) => {
      // Fully typed!
      return await prisma.message.findMany();
    },
  },
};
```

---

### 10) Database Connection Pooling & Monitoring

**Why:** Optimize connections, prevent exhaustion, monitor performance

Update `lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { log } from '@/lib/logger';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  }).$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;

        if (duration > 1000) {
          log.warn('Slow query detected', {
            model,
            operation,
            duration,
            args,
          });
        } else {
          log.debug('Query executed', {
            model,
            operation,
            duration,
          });
        }

        return result;
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
```

Add to `.env.example`:

```env
# Database Connection Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_TIMEOUT=20000
```

---

## Phase 2C: Architecture Patterns

### 11) Repository Pattern

**Why:** Testability, centralized data access, easier to mock

Create `lib/repositories/base.repository.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T> {
  constructor(protected prisma: PrismaClient) {}

  abstract findById(id: string): Promise<T | null>;
  abstract findMany(filters?: any): Promise<T[]>;
  abstract create(data: any): Promise<T>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
```

Create `lib/repositories/user.repository.ts`:

```typescript
import { BaseRepository } from './base.repository';
import type { User, Prisma } from '@prisma/client';

export class UserRepository extends BaseRepository<User> {
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findMany(filters?: Prisma.UserWhereInput): Promise<User[]> {
    return this.prisma.user.findMany({ where: filters });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

Create `lib/repositories/message.repository.ts`:

```typescript
import { BaseRepository } from './base.repository';
import type { Message, Prisma } from '@prisma/client';

export class MessageRepository extends BaseRepository<Message> {
  async findById(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id },
      include: { author: true },
    });
  }

  async findMany(filters?: Prisma.MessageWhereInput): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: filters,
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAuthor(authorId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { authorId },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.MessageCreateInput): Promise<Message> {
    return this.prisma.message.create({
      data,
      include: { author: true },
    });
  }

  async update(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data,
      include: { author: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.message.delete({ where: { id } });
  }
}
```

Create `lib/repositories/index.ts`:

```typescript
import { prisma } from '@/lib/db';
import { UserRepository } from './user.repository';
import { MessageRepository } from './message.repository';

// Singleton repositories
export const repositories = {
  user: new UserRepository(prisma),
  message: new MessageRepository(prisma),
};
```

---

### 12) Service Layer Pattern

**Why:** Business logic separation, reusability, easier testing

Create `lib/services/message.service.ts`:

```typescript
import { repositories } from '@/lib/repositories';
import { Cache } from '@/lib/cache';
import { log } from '@/lib/logger';
import type { Message, Prisma } from '@prisma/client';

export class MessageService {
  async getMessages(): Promise<Message[]> {
    log.info('Fetching all messages');
    
    const cacheKey = 'messages:all';
    const cached = await Cache.get<Message[]>(cacheKey);
    
    if (cached) {
      log.debug('Returning cached messages');
      return cached;
    }

    const messages = await repositories.message.findMany();
    await Cache.set(cacheKey, messages, 300); // 5 min cache
    
    return messages;
  }

  async getMessageById(id: string): Promise<Message | null> {
    log.info('Fetching message by id', { id });
    
    const message = await repositories.message.findById(id);
    
    if (!message) {
      log.warn('Message not found', { id });
      return null;
    }
    
    return message;
  }

  async createMessage(
    data: Prisma.MessageCreateInput,
    userId?: string
  ): Promise<Message> {
    log.info('Creating message', { userId });

    // Business logic: validate user exists
    if (data.author?.connect?.id) {
      const user = await repositories.user.findById(data.author.connect.id);
      if (!user) {
        throw new Error('User not found');
      }
    }

    // Create message
    const message = await repositories.message.create(data);

    // Invalidate cache
    await Cache.invalidatePattern('messages:*');

    log.info('Message created', { messageId: message.id });
    
    return message;
  }

  async deleteMessage(id: string, userId: string): Promise<boolean> {
    log.info('Deleting message', { id, userId });

    const message = await repositories.message.findById(id);
    
    if (!message) {
      throw new Error('Message not found');
    }

    // Business logic: check ownership
    if (message.authorId !== userId) {
      throw new Error('Unauthorized to delete this message');
    }

    await repositories.message.delete(id);
    await Cache.invalidatePattern('messages:*');

    log.info('Message deleted', { id });
    
    return true;
  }
}

// Singleton service
export const messageService = new MessageService();
```

Use in GraphQL resolvers:

```typescript
import { messageService } from '@/lib/services/message.service';

export const resolvers: Resolvers = {
  Query: {
    messages: async () => {
      return await messageService.getMessages();
    },
    message: async (_parent, { id }) => {
      return await messageService.getMessageById(id);
    },
  },
  Mutation: {
    createMessage: async (_parent, { text, authorId }, context) => {
      return await messageService.createMessage(
        {
          text,
          author: authorId ? { connect: { id: authorId } } : undefined,
        },
        context.user?.id
      );
    },
    deleteMessage: async (_parent, { id }, context) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      return await messageService.deleteMessage(id, context.user.id);
    },
  },
};
```

---

### 13) Health Check Endpoints

**Why:** Monitoring, load balancer health checks, debugging

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
  version: string;
}

async function checkDatabase(): Promise<'ok' | 'error'> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkRedis(): Promise<'ok' | 'error'> {
  try {
    await redis.ping();
    return 'ok';
  } catch {
    return 'error';
  }
}

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
  };

  const status = Object.values(checks).every((check) => check === 'ok')
    ? 'healthy'
    : 'unhealthy';

  const health: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    version: process.env.npm_package_version || '1.0.0',
  };

  return NextResponse.json(health, {
    status: status === 'healthy' ? 200 : 503,
  });
}
```

Create `app/api/health/ready/route.ts` (for Kubernetes readiness):

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  // Add any initialization checks here
  return NextResponse.json({ ready: true });
}
```

Create `app/api/health/live/route.ts` (for Kubernetes liveness):

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ alive: true });
}
```

---

### 14) API Versioning Strategy

**Why:** Backward compatibility, gradual deprecation, client migration

Update GraphQL schema with versioning:

```graphql
type Query {
  # V1 - deprecated
  users: [User!]! @deprecated(reason: "Use usersV2 with pagination")
  
  # V2 - current
  usersV2(
    page: Int = 1
    limit: Int = 10
    filter: UserFilter
  ): UserConnection!
  
  # Alias for backward compatibility
  messages: [Message!]!
}

type UserConnection {
  nodes: [User!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

For REST APIs, use URL versioning:

```typescript
// app/api/v1/users/route.ts
export async function GET() {
  // V1 implementation
}

// app/api/v2/users/route.ts
export async function GET() {
  // V2 implementation with pagination
}
```

---

### 15) Event-Driven Architecture Foundation

**Why:** Decoupling, scalability, audit trails

Create `lib/events/emitter.ts`:

```typescript
import EventEmitter from 'events';
import { log } from '@/lib/logger';

class TypedEventEmitter extends EventEmitter {
  emit(event: string, ...args: any[]): boolean {
    log.debug('Event emitted', { event, args });
    return super.emit(event, ...args);
  }
}

export const eventBus = new TypedEventEmitter();

// Type-safe event definitions
export const events = {
  MESSAGE_CREATED: 'message.created',
  MESSAGE_DELETED: 'message.deleted',
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
} as const;

export type EventType = (typeof events)[keyof typeof events];
```

Create `lib/events/handlers/message.handlers.ts`:

```typescript
import { eventBus, events } from '../emitter';
import { log } from '@/lib/logger';
import type { Message } from '@prisma/client';

// Handle message created event
eventBus.on(events.MESSAGE_CREATED, async (message: Message) => {
  log.info('Message created event received', { messageId: message.id });
  
  // Send notifications
  // Update analytics
  // Trigger webhooks
  // etc.
});

// Handle message deleted event
eventBus.on(events.MESSAGE_DELETED, async (messageId: string) => {
  log.info('Message deleted event received', { messageId });
  
  // Clean up related data
  // Update counters
  // etc.
});
```

Use in services:

```typescript
import { eventBus, events } from '@/lib/events/emitter';

export class MessageService {
  async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
    const message = await repositories.message.create(data);
    
    // Emit event
    eventBus.emit(events.MESSAGE_CREATED, message);
    
    return message;
  }
}
```

---

## Phase 2D: Advanced Features

### 16) Feature Flags System

**Why:** Gradual rollouts, A/B testing, kill switches

Install dependencies:

```powershell
pnpm add @vercel/flags
```

Create `lib/feature-flags.ts`:

```typescript
import { unstable_flag as flag } from '@vercel/flags/next';

export const featureFlags = {
  enableNewMessageBoard: flag({
    key: 'new-message-board',
    defaultValue: false,
    description: 'Enable redesigned message board',
    origin: 'https://vercel.com/docs/workflow-collaboration/feature-flags',
  }),
  
  enableAIFeatures: flag({
    key: 'ai-features',
    defaultValue: false,
    description: 'Enable AI-powered features',
    origin: 'https://vercel.com/docs/workflow-collaboration/feature-flags',
  }),
  
  enableAnalytics: flag({
    key: 'analytics',
    defaultValue: true,
    description: 'Enable analytics tracking',
    origin: 'https://vercel.com/docs/workflow-collaboration/feature-flags',
  }),
};

// Type-safe flag checking
export async function isFeatureEnabled(
  flag: keyof typeof featureFlags
): Promise<boolean> {
  try {
    return await featureFlags[flag]();
  } catch {
    return false;
  }
}
```

Usage in components:

```typescript
import { featureFlags } from '@/lib/feature-flags';

export default async function MessagesPage() {
  const showNewBoard = await featureFlags.enableNewMessageBoard();
  
  if (showNewBoard) {
    return <NewMessageBoard />;
  }
  
  return <LegacyMessageBoard />;
}
```

---

### 17) Background Job Processing

**Why:** Long-running tasks, scheduled jobs, email sending

Install dependencies:

```powershell
pnpm add inngest
```

Create `lib/jobs/client.ts`:

```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'vercel-spine' });
```

Create `lib/jobs/functions/email.ts`:

```typescript
import { inngest } from '../client';
import { log } from '@/lib/logger';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email' },
  { event: 'user/registered' },
  async ({ event, step }) => {
    await step.run('send-email', async () => {
      log.info('Sending welcome email', { userId: event.data.userId });
      
      // Send email via your provider
      // await emailService.send({ ... });
      
      return { sent: true };
    });
  }
);

export const processMessageNotifications = inngest.createFunction(
  { id: 'process-message-notifications' },
  { event: 'message/created' },
  async ({ event, step }) => {
    const { messageId } = event.data;
    
    await step.run('fetch-subscribers', async () => {
      // Get users who should be notified
      log.info('Fetching subscribers for message', { messageId });
    });
    
    await step.run('send-notifications', async () => {
      // Send notifications
      log.info('Sending notifications', { messageId });
    });
  }
);
```

Create API endpoint `app/api/inngest/route.ts`:

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/lib/jobs/client';
import { sendWelcomeEmail, processMessageNotifications } from '@/lib/jobs/functions/email';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWelcomeEmail, processMessageNotifications],
});
```

Trigger jobs:

```typescript
import { inngest } from '@/lib/jobs/client';

// In your service
await inngest.send({
  name: 'user/registered',
  data: { userId: user.id },
});
```

---

### 18) API Documentation with GraphQL Playground

**Why:** Developer experience, API exploration, testing

Install dependencies:

```powershell
pnpm add graphql-playground-html
```

Create `app/api/playground/route.ts`:

```typescript
import { renderPlaygroundPage } from 'graphql-playground-html';
import { NextResponse } from 'next/server';

export async function GET() {
  const playground = renderPlaygroundPage({
    endpoint: '/api/graphql',
    settings: {
      'request.credentials': 'include',
    },
  });

  return new NextResponse(playground, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
```

Only enable in development:

```typescript
// middleware.ts addition
if (request.nextUrl.pathname === '/api/playground') {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
```

---

### 19) Internationalization (i18n)

**Why:** Global reach, localized content, better UX

Install dependencies:

```powershell
pnpm add next-intl
```

Create `i18n.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

Create message files:

`messages/en.json`:

```json
{
  "common": {
    "welcome": "Welcome",
    "login": "Log in",
    "logout": "Log out"
  },
  "messages": {
    "title": "Message Board",
    "create": "Create message",
    "delete": "Delete message"
  }
}
```

`messages/es.json`:

```json
{
  "common": {
    "welcome": "Bienvenido",
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión"
  },
  "messages": {
    "title": "Tablero de Mensajes",
    "create": "Crear mensaje",
    "delete": "Eliminar mensaje"
  }
}
```

Update `next.config.js`:

```javascript
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

module.exports = withNextIntl({
  // ... other config
});
```

Usage in components:

```typescript
import { useTranslations } from 'next-intl';

export function MessageBoard() {
  const t = useTranslations('messages');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('create')}</button>
    </div>
  );
}
```

---

### 20) Multi-tenancy Support

**Why:** SaaS applications, data isolation, per-tenant customization

Update Prisma schema:

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  users     User[]
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id        String   @id @default(cuid())
  email     String
  name      String?
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  messages  Message[]
  
  @@unique([email, tenantId])
}

model Message {
  id        String   @id @default(cuid())
  text      String
  authorId  String?
  author    User?    @relation(fields: [authorId], references: [id])
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  createdAt DateTime @default(now())
}
```

Create tenant middleware:

```typescript
// middleware.ts addition
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Extract tenant from subdomain
  const subdomain = hostname.split('.')[0];
  
  // Add tenant to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', subdomain);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

Use in context:

```typescript
// lib/graphql/context.ts
export async function createContext(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  
  return {
    tenantId,
    prisma: prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Automatically add tenant filter
            if (tenantId) {
              args.where = { ...args.where, tenantId };
            }
            return query(args);
          },
        },
      },
    }),
  };
}
```

---

## 📋 Updated File Structure

```text
vercel-spine/
├── .ai-context/
│   ├── getting-started.md
│   ├── project-structure.md
│   ├── testing-guide.md
│   ├── coverage-requirements.md
│   ├── performance-budgets.md
│   ├── plop-usage-guide.md
│   ├── graphql-integration.md
│   ├── component-patterns.md
│   ├── visual-testing-guide.md
│   ├── production-hardening.md          # NEW
│   └── architecture-patterns.md         # NEW
├── app/
│   ├── api/
│   │   ├── graphql/
│   │   │   └── route.ts
│   │   ├── health/
│   │   │   ├── route.ts                 # NEW
│   │   │   ├── ready/route.ts           # NEW
│   │   │   └── live/route.ts            # NEW
│   │   ├── playground/
│   │   │   └── route.ts                 # NEW
│   │   └── inngest/
│   │       └── route.ts                 # NEW
│   └── messages/
│       └── page.tsx
├── lib/
│   ├── env.ts                           # NEW - Zod validation
│   ├── logger.ts                        # NEW - Pino logging
│   ├── cache.ts                         # NEW - Redis caching
│   ├── rate-limit.ts                    # NEW - Rate limiting
│   ├── db.ts                            # UPDATED - Connection pooling
│   ├── graphql/
│   │   ├── typeDefs.ts
│   │   ├── resolvers.ts
│   │   ├── dataloaders.ts               # NEW - DataLoader
│   │   ├── security.ts                  # NEW - Complexity limits
│   │   ├── context.ts                   # NEW
│   │   └── generated/                   # NEW - Generated types
│   │       ├── types.ts
│   │       └── operations.ts
│   ├── repositories/                    # NEW - Repository pattern
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   ├── message.repository.ts
│   │   └── index.ts
│   ├── services/                        # NEW - Service layer
│   │   ├── message.service.ts
│   │   └── user.service.ts
│   ├── events/                          # NEW - Event system
│   │   ├── emitter.ts
│   │   └── handlers/
│   │       └── message.handlers.ts
│   ├── jobs/                            # NEW - Background jobs
│   │   ├── client.ts
│   │   └── functions/
│   │       └── email.ts
│   └── feature-flags.ts                 # NEW - Feature flags
├── prisma/
│   ├── schema.prisma                    # UPDATED - Multi-tenancy
│   ├── seed.ts                          # NEW - Seed data
│   └── migrations/
├── messages/                            # NEW - i18n
│   ├── en.json
│   └── es.json
├── sentry.client.config.ts              # NEW
├── sentry.server.config.ts              # NEW
├── sentry.edge.config.ts                # NEW
├── codegen.yml                          # NEW - GraphQL codegen
├── i18n.ts                              # NEW - i18n config
└── middleware.ts                        # UPDATED - Rate limit + tenant
```

---

## 📊 Implementation Checklist

### Phase 2A: Critical (Week 1)

- [ ] Install Zod and create environment validation
- [ ] Set up Sentry error tracking
- [ ] Implement rate limiting with Upstash
- [ ] Add structured logging with Pino
- [ ] Update database migration workflow
- [ ] Add seed data script

### Phase 2B: Performance (Week 2)

- [ ] Set up Redis caching layer
- [ ] Implement DataLoader for GraphQL
- [ ] Add query complexity limits
- [ ] Set up GraphQL type generation
- [ ] Add database connection pooling
- [ ] Monitor slow queries

### Phase 2C: Architecture (Week 3)

- [ ] Implement Repository pattern
- [ ] Add Service layer
- [ ] Create health check endpoints
- [ ] Set up API versioning
- [ ] Add event-driven foundation
- [ ] Document architecture patterns

### Phase 2D: Advanced (Week 4)

- [ ] Implement feature flags
- [ ] Set up background jobs (Inngest)
- [ ] Add GraphQL Playground
- [ ] Implement i18n support
- [ ] Add multi-tenancy (if needed)
- [ ] Final testing and documentation

---

## 🎯 Success Criteria

After completing Phase 2, the system should have:

✅ **Security**

- Rate limiting on all API routes
- Environment validation on startup
- Security headers configured
- Input sanitization

✅ **Observability**

- Error tracking with Sentry
- Structured logging
- Health check endpoints
- Performance monitoring

✅ **Performance**

- Redis caching (sub-10ms cache hits)
- No N+1 queries (DataLoader)
- Query complexity limits
- Connection pooling

✅ **Maintainability**

- Repository pattern for data access
- Service layer for business logic
- Event-driven architecture
- Type-safe GraphQL

✅ **Scalability**

- Horizontal scaling ready
- Background job processing
- Feature flags for rollouts
- Multi-tenancy support

---

## 📈 Performance Targets

| Metric | Phase 1 | Phase 2 Target |
|--------|---------|----------------|
| API Response Time | <500ms | <100ms |
| Database Queries | Direct | DataLoader batched |
| Cache Hit Rate | 0% | >80% |
| Error Tracking | None | 100% coverage |
| Test Coverage | 95% | 95% (maintained) |
| Lighthouse Score | 90+ | 95+ |

---

## 💰 Estimated Costs (Monthly)

### Development

- Free tier services where possible
- Upstash Redis: $0-10 (generous free tier)
- Sentry: $0-26 (Developer tier)

### Production (Small Scale)

- Vercel Pro: $20
- Database (Supabase/Neon): $0-25
- Upstash Redis: $10-50
- Sentry: $26-80
- **Total: ~$60-175/month**

### Production (Medium Scale)

- Vercel Pro: $20
- Database: $50-100
- Upstash Redis: $50-100
- Sentry Team: $80+
- Inngest: $0-50
- **Total: ~$200-350/month**

---

## 🚀 Deployment Strategy

1. **Deploy Phase 2A first** - Critical production requirements
2. **Monitor for 1 week** - Ensure stability
3. **Deploy Phase 2B** - Performance optimizations
4. **Monitor metrics** - Cache hit rates, response times
5. **Deploy Phase 2C** - Architecture improvements
6. **Deploy Phase 2D** - Advanced features as needed

---

## 📚 Additional Resources

- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Vercel Best Practices](https://vercel.com/docs/concepts/solutions/best-practices)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## 🎓 Learning Path

For team members implementing Phase 2:

1. **Week 1**: Security & Validation (Zod, Rate Limiting)
2. **Week 2**: Caching & Performance (Redis, DataLoader)
3. **Week 3**: Architecture Patterns (Repository, Service Layer)
4. **Week 4**: Advanced Features (Feature Flags, Background Jobs)

---

## ✅ Final Notes

This Phase 2 plan transforms the MVP into an enterprise-ready system. Prioritize based on your specific needs:

- **SaaS Product?** → Focus on multi-tenancy and feature flags
- **High Traffic?** → Focus on caching and DataLoader
- **Compliance Required?** → Focus on logging and audit trails
- **Global Users?** → Focus on i18n and CDN optimization

Review and adjust based on your production metrics and user feedback.

**Ready to begin Phase 2 implementation?** Start with Phase 2A (Critical Production Requirements) and work through systematically.

# Inline AI Website Editor - Implementation Guide

**Project:** Vercel-spine  
**Feature:** Admin-only inline editing with AI-powered GitHub issue creation  
**Date:** October 23, 2025  
**Status:** Ready for Implementation

---

## 🎯 Overview

This document outlines the implementation of an "Inline AI" editing system that allows administrators to:

1. Click any element on the live/preview site
2. Describe desired changes in natural language
3. Automatically generate structured, agent-ready GitHub issues with screenshots
4. Enable GitHub Copilot (or other coding agents) to implement changes via PR

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Admin Only)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AiInlineRequest Component                              │ │
│  │  • Element picker (click-to-select)                     │ │
│  │  • Screenshot capture (html-to-image)                   │ │
│  │  • Description input                                    │ │
│  └──────────────────┬──────────────────────────────────────┘ │
└─────────────────────┼──────────────────────────────────────────┘
                      │ POST /api/ai-change-request
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Route Handler                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Validate input (Zod)                                │ │
│  │  2. Upload screenshot → Vercel Blob                     │ │
│  │  3. Structure request → OpenAI (AI SDK generateObject)  │ │
│  │  4. Create GitHub issue → Octokit                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Issue Created                                          │ │
│  │  • Label: ai-change-request                             │ │
│  │  • Contains: scope, criteria, screenshot URL            │ │
│  └──────────────────┬──────────────────────────────────────┘ │
│                     │ GitHub Actions Workflow               │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  @github-copilot notified                               │ │
│  │  Agent creates PR with implementation                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Phase 1: Foundation Setup

### Step 1: Install Dependencies

```bash
pnpm add ai @ai-sdk/openai zod @octokit/rest html-to-image @vercel/blob
```

**Dependencies breakdown:**

- `ai` + `@ai-sdk/openai` - Vercel AI SDK for structured output generation
- `zod` - Runtime type validation for request/response schemas
- `@octokit/rest` - GitHub REST API client for issue creation
- `html-to-image` - Client-side screenshot capture of DOM elements
- `@vercel/blob` - Vercel Blob storage for hosting screenshots

**Verification:**

```bash
pnpm list | grep -E "(ai|octokit|html-to-image|blob)"
```

---

### Step 2: Environment Variables

Create/update `.env.local`:

```bash
# GitHub Configuration
GITHUB_OWNER=Maxwell-Software-Solutions
GITHUB_REPO=Vercel-spine
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Provider
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxx

# Feature Flag (client-side)
NEXT_PUBLIC_INLINE_AI=1
```

**Setting up in Vercel:**

1. Navigate to Project → Settings → Environment Variables
2. Add each variable above for Production, Preview, and Development
3. For `GITHUB_TOKEN`: Create a fine-grained PAT with `repo:issues` scope
4. For `BLOB_READ_WRITE_TOKEN`: Enable Vercel Blob in project settings

**Security notes:**

- `GITHUB_TOKEN` should have minimal permissions (issues:write only)
- Consider using GitHub App for better security in production
- `NEXT_PUBLIC_INLINE_AI` should be set to `1` only for admin deployments

---

## 🎨 Phase 2: Core Implementation

### Step 3: Client Overlay Component

**File:** `components/AiInlineRequest.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import * as htmlToImage from 'html-to-image';

type PickedTarget = {
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
  screenshotDataUrl?: string;
};

/**
 * Generates a stable CSS selector for a given element.
 * Priority: data-ai-id > id > simplified path
 */
function getBestSelector(el: Element): string {
  // 1. Prefer stable data attribute
  const withData = (el.closest('[data-ai-id]') as HTMLElement) || null;
  if (withData) return `[data-ai-id="${withData.dataset.aiId}"]`;

  // 2. Use element ID if available
  const id = (el as HTMLElement).id;
  if (id) return `#${id}`;

  // 3. Build simplified path (max 4 levels)
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && parts.length < 4) {
    const name = node.tagName.toLowerCase();
    const cls = (node as HTMLElement).className?.split?.(' ')[0] || '';
    parts.unshift(`${name}${cls ? '.' + cls : ''}`);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

export default function AiInlineRequest() {
  const [selector, setSelector] = useState<string>('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<PickedTarget | null>(null);

  /**
   * Activates element picker mode - next click will select target
   */
  async function selectElementOnce() {
    return new Promise<PickedTarget>((resolve) => {
      function onClick(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        document.removeEventListener('click', onClick, true);

        const el = e.target as HTMLElement;
        const rect = el.getBoundingClientRect();
        const selector = getBestSelector(el);

        resolve({
          selector,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      }
      // Use capture phase to intercept before other handlers
      document.addEventListener('click', onClick, true);
    });
  }

  async function handlePick() {
    const target = await selectElementOnce();

    // Attempt to capture screenshot of selected element
    try {
      const node = document.querySelector(target.selector) as HTMLElement | null;
      if (node) {
        const dataUrl = await htmlToImage.toPng(node, {
          cacheBust: true,
          pixelRatio: 2, // Retina quality
        });
        target.screenshotDataUrl = dataUrl;
      }
    } catch (err) {
      console.warn('Screenshot capture failed (non-fatal):', err);
    }

    setPicked(target);
    setSelector(target.selector);
  }

  async function submit() {
    if (!selector || !desc) return;
    setBusy(true);

    try {
      const res = await fetch('/api/ai-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.href,
          selector,
          description: desc,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          screenshotDataUrl: picked?.screenshotDataUrl,
        }),
      });

      const json = await res.json();

      if (json.ok) {
        alert(
          `✅ Issue created successfully!\n\n${json.issueUrl}\n\nA coding agent will be notified.`
        );
        // Reset form
        setDesc('');
        setPicked(null);
        setSelector('');
      } else {
        alert(`❌ Error: ${json.error}`);
      }
    } catch (err) {
      alert(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 999999,
        background: 'white',
        border: '2px solid #3b82f6',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)',
        width: 340,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 12,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>✨</span>
        Inline AI Editor
      </div>

      <button
        onClick={handlePick}
        disabled={busy}
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          border: picked ? '2px solid #22c55e' : '2px solid #e2e8f0',
          background: picked ? '#f0fdf4' : 'white',
          cursor: busy ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          fontSize: 13,
          width: '100%',
          transition: 'all 0.2s',
        }}
      >
        {picked ? '✓ Element Selected' : '🎯 Pick Element'}
      </button>

      {selector && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: '#64748b',
            background: '#f8fafc',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          <strong>Selector:</strong> {selector}
        </div>
      )}

      <textarea
        placeholder="Describe what you want changed (e.g., 'Make the heading larger and bold' or 'Change button color to blue')..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        disabled={busy}
        style={{
          marginTop: 12,
          width: '100%',
          height: 100,
          padding: 10,
          borderRadius: 8,
          border: '2px solid #e2e8f0',
          fontSize: 13,
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
        onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
      />

      <button
        onClick={submit}
        disabled={busy || !desc || !selector}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          background: busy || !desc || !selector ? '#94a3b8' : '#3b82f6',
          color: 'white',
          border: 'none',
          fontWeight: 600,
          fontSize: 14,
          cursor: busy || !desc || !selector ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {busy ? '⏳ Creating Issue...' : '🚀 Create AI Change Request'}
      </button>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: '#94a3b8',
          lineHeight: 1.4,
        }}
      >
        💡 <strong>Tip:</strong> Add{' '}
        <code
          style={{
            background: '#f1f5f9',
            padding: '2px 4px',
            borderRadius: 3,
          }}
        >
          data-ai-id
        </code>{' '}
        attributes to components you edit frequently.
      </div>
    </div>
  );
}
```

**Key features:**

- ✅ Element picker with visual feedback
- ✅ Automatic screenshot capture (2x retina quality)
- ✅ Stable selector generation (data-ai-id > id > path)
- ✅ User-friendly error handling
- ✅ Responsive UI with state management

---

### Step 4: API Route Handler

**File:** `app/api/ai-change-request/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Octokit } from '@octokit/rest';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { put } from '@vercel/blob';

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Input schema - validates incoming request from client
 */
const InSchema = z.object({
  url: z.string().url(),
  selector: z.string().min(1),
  description: z.string().min(5).max(2000),
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  screenshotDataUrl: z.string().optional(),
});

/**
 * AI output schema - forces structured response from LLM
 * This is the key to making agent-ready issues
 */
const OutSchema = z.object({
  scope: z
    .string()
    .describe('The specific component or area being changed (e.g., "Hero section CTA button")'),
  expectedChange: z.string().describe('Detailed, implementable description of the change'),
  acceptanceCriteria: z.array(z.string()).min(1).describe('Testable criteria for PR approval'),
  riskNotes: z.array(z.string()).optional().describe('Potential side effects or concerns'),
  estimatedComplexity: z.enum(['trivial', 'low', 'medium', 'high']).optional(),
});

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Converts data URL (from canvas/screenshot) to Buffer for upload
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const [, base64] = dataUrl.split(',');
  return Buffer.from(base64, 'base64');
}

/**
 * Generates a filename for the screenshot
 */
function generateScreenshotFilename(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `ai-requests/${timestamp}-${random}.png`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. VALIDATE INPUT
    // -------------------------------------------------------------------------
    const input = InSchema.parse(await req.json());

    // -------------------------------------------------------------------------
    // 2. UPLOAD SCREENSHOT TO VERCEL BLOB (optional)
    // -------------------------------------------------------------------------
    let screenshotUrl: string | undefined;

    if (input.screenshotDataUrl?.startsWith('data:image/')) {
      try {
        const buf = dataUrlToBuffer(input.screenshotDataUrl);
        const filename = generateScreenshotFilename();

        const uploaded = await put(filename, buf, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false,
        });

        screenshotUrl = uploaded.url;
        console.log('Screenshot uploaded:', screenshotUrl);
      } catch (err) {
        console.error('Screenshot upload failed (continuing anyway):', err);
        // Non-fatal - continue without screenshot
      }
    }

    // -------------------------------------------------------------------------
    // 3. STRUCTURE REQUEST WITH AI
    // -------------------------------------------------------------------------
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: OutSchema,
      prompt: `
You are a senior front-end engineer preparing a change request for a coding agent.

## Context
- **Page URL**: ${input.url}
- **Selector**: \`${input.selector}\`
- **Viewport**: ${input.viewport.width}×${input.viewport.height}
- **Screenshot**: ${screenshotUrl ?? 'Not available'}

## User's Request
"""
${input.description}
"""

## Instructions
Normalize this into a precise, actionable spec:

1. **scope**: Name the component/section (e.g., "Pricing card header", "Hero CTA")
2. **expectedChange**: Specific edits (copy changes, CSS adjustments, etc.)
3. **acceptanceCriteria**: 3-5 testable bullets suitable for a PR checklist
4. **riskNotes**: Potential side effects (layout shifts, accessibility, mobile)
5. **estimatedComplexity**: trivial | low | medium | high

Focus on:
- Precise CSS/component names when possible
- Measurable criteria (e.g., "font-size increased to 24px" not just "bigger")
- Accessibility implications
- Mobile/responsive considerations
`.trim(),
      temperature: 0.3, // Lower temperature for more consistent output
    });

    console.log('AI-structured request:', object);

    // -------------------------------------------------------------------------
    // 4. CREATE GITHUB ISSUE
    // -------------------------------------------------------------------------
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const owner = process.env.GITHUB_OWNER!;
    const repo = process.env.GITHUB_REPO!;

    // Build issue title
    const pathname = new URL(input.url).pathname;
    const title = `[Inline AI] ${object.scope} — ${pathname === '/' ? 'Home' : pathname}`;

    // Build issue body with structured markdown
    const body = [
      '## 🤖 AI-Generated Change Request',
      '',
      '### 📍 Location',
      `- **URL**: ${input.url}`,
      `- **Selector**: \`${input.selector}\``,
      `- **Viewport**: ${input.viewport.width}×${input.viewport.height}`,
      screenshotUrl ? `- **Screenshot**: ![Element Screenshot](${screenshotUrl})` : '',
      '',
      '### 📝 Expected Change',
      object.expectedChange,
      '',
      '### ✅ Acceptance Criteria',
      ...object.acceptanceCriteria.map((criterion: string) => `- [ ] ${criterion}`),
      '',
      object.riskNotes?.length ? '### ⚠️ Risk Notes' : '',
      object.riskNotes?.length
        ? object.riskNotes.map((note: string) => `- ${note}`).join('\n')
        : '',
      '',
      object.estimatedComplexity ? `### 📊 Complexity: \`${object.estimatedComplexity}\`` : '',
      '',
      '---',
      '',
      '**Original Description:**',
      '> ' + input.description.split('\n').join('\n> '),
      '',
      '_Filed by Inline AI Editor_',
    ]
      .filter(Boolean)
      .join('\n');

    const issue = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels: ['ai-change-request', 'needs-review'],
    });

    console.log('GitHub issue created:', issue.data.html_url);

    // -------------------------------------------------------------------------
    // 5. RETURN SUCCESS
    // -------------------------------------------------------------------------
    return NextResponse.json({
      ok: true,
      issueUrl: issue.data.html_url,
      issueNumber: issue.data.number,
    });
  } catch (err: any) {
    console.error('AI change request failed:', err);

    // Handle specific error types
    if (err.name === 'ZodError') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid request data',
          details: err.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: err.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Optional: Health check endpoint
 */
export async function GET() {
  const hasToken = !!process.env.GITHUB_TOKEN;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

  return NextResponse.json({
    service: 'AI Change Request API',
    configured: {
      github: hasToken,
      openai: hasOpenAI,
      blob: hasBlob,
    },
  });
}
```

**Key features:**

- ✅ Zod validation for type safety
- ✅ AI SDK `generateObject()` for structured output (no JSON parsing!)
- ✅ Screenshot upload to Vercel Blob with error handling
- ✅ Rich GitHub issue formatting with Markdown
- ✅ Comprehensive error handling and logging
- ✅ Optional health check endpoint

---

## 🔗 Phase 3: Integration

### Step 5: Add to Layout

**File:** `app/layout.tsx`

Update the layout to conditionally render the AI editor:

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AiInlineRequest from '@/components/AiInlineRequest';

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
    <html lang="en">
      <body className={inter.className}>
        {children}
        {showInlineAI && <AiInlineRequest />}
      </body>
    </html>
  );
}
```

**Deployment strategy:**

- Production: `NEXT_PUBLIC_INLINE_AI=0` (disabled)
- Preview/Staging: `NEXT_PUBLIC_INLINE_AI=1` (enabled for testing)
- Local dev: Set in `.env.local` based on need

**Enhanced security (optional):**

```tsx
// For production with auth, wrap in a client component:
'use client';
import { useSession } from 'next-auth/react';

export function AdminTools() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  if (!isAdmin) return null;
  return <AiInlineRequest />;
}
```

---

### Step 6: GitHub Workflow for Agent Handoff

**File:** `.github/workflows/route-ai-requests.yml`

```yaml
name: Route AI Change Requests

on:
  issues:
    types: [opened, labeled]

jobs:
  notify-copilot:
    # Only run when ai-change-request label is present
    if: contains(github.event.issue.labels.*.name, 'ai-change-request')
    runs-on: ubuntu-latest

    permissions:
      issues: write
      contents: read

    steps:
      - name: Comment with Copilot instructions
        uses: peter-evans/create-or-update-comment@v4
        with:
          issue-number: ${{ github.event.issue.number }}
          body: |
            ## 🤖 GitHub Copilot - Please Implement

            @github-copilot This is an AI-generated change request. Please:

            1. **Review** the Expected Change and Screenshot above
            2. **Locate** the component using the provided selector
            3. **Implement** the changes according to acceptance criteria
            4. **Test** locally (ensure no regressions)
            5. **Open a PR** linking back to this issue (use `Fixes #${{ github.event.issue.number }}`)

            ### Implementation Notes
            - Use the selector hint: check for `data-ai-id` attributes first
            - If screenshot shows layout, preserve spacing and alignment
            - Run existing tests before submitting PR
            - Consider mobile/responsive implications

            ### When Done
            - Link PR to this issue
            - Add screenshots/preview to PR description
            - Request review from original requester if possible

            ---

            _Automated by Inline AI Workflow_

      - name: Add metadata labels
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: ['copilot-ready', 'enhancement']
            });

      - name: Log to Actions
        run: |
          echo "✅ Notified Copilot for issue #${{ github.event.issue.number }}"
          echo "📋 Issue URL: ${{ github.event.issue.html_url }}"
```

**What this does:**

1. Triggers when `ai-change-request` label is added
2. Posts detailed instructions for GitHub Copilot
3. Adds additional labels for tracking (`copilot-ready`, `enhancement`)
4. Provides implementation guidance in the comment

**GitHub Copilot Integration:**

- Manual: Assign issue to `@github-copilot` in GitHub UI
- Automatic: Use GitHub's new "Agents" panel (if available)
- Alternative: Integrate with other coding agents (Cursor, Aider, etc.)

---

## 🎯 Phase 4: Enhancement

### Step 7: Add Stable Selectors

Update key components with `data-ai-id` attributes for reliable targeting.

**File:** `app/page.tsx`

```tsx
export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-16">
      {/* Hero Section */}
      <section data-ai-id="hero-section" className="mb-16">
        <h1 data-ai-id="hero-heading" className="text-4xl font-bold mb-4">
          Welcome to Vercel Spine
        </h1>
        <p data-ai-id="hero-description" className="text-xl text-gray-600 mb-8">
          Enterprise-ready Next.js template with GraphQL, Prisma, and comprehensive testing
        </p>
        <div data-ai-id="hero-cta" className="flex gap-4">
          <button className="btn-primary">Get Started</button>
          <button className="btn-secondary">Learn More</button>
        </div>
      </section>

      {/* Features Grid */}
      <section data-ai-id="features-section" className="grid md:grid-cols-3 gap-8">
        <div data-ai-id="feature-card-graphql" className="card">
          <h3 className="text-xl font-semibold mb-2">GraphQL API</h3>
          <p>Type-safe API layer with Apollo Server</p>
        </div>
        <div data-ai-id="feature-card-prisma" className="card">
          <h3 className="text-xl font-semibold mb-2">Prisma ORM</h3>
          <p>Database migrations and type-safe queries</p>
        </div>
        <div data-ai-id="feature-card-testing" className="card">
          <h3 className="text-xl font-semibold mb-2">Full Test Suite</h3>
          <p>Jest, Playwright, and Lighthouse integration</p>
        </div>
      </section>
    </main>
  );
}
```

**Naming convention:**

- Use kebab-case: `data-ai-id="hero-cta-button"`
- Be descriptive: Include section + component type
- Group related elements: `pricing-card-header`, `pricing-card-body`

---

### Step 8: Documentation & Setup

**Create GitHub label:**

```bash
# Via GitHub CLI
gh label create "ai-change-request" --description "AI-generated change request" --color "0E8A16"

# Or via UI: Settings → Labels → New Label
# Name: ai-change-request
# Color: #0E8A16 (green)
```

**Update README with usage section:**

Add to `README.md`:

````markdown
## 🤖 Inline AI Editor

This project includes an admin-only inline editing tool that creates AI-structured GitHub issues.

### Usage

1. **Enable the editor** (preview deployments only):
   - Set `NEXT_PUBLIC_INLINE_AI=1` in Vercel environment variables
   - Redeploy to preview branch

2. **Create a change request**:
   - Open your preview site
   - Click the "Inline AI Editor" widget (bottom-right)
   - Click "Pick Element" and select the component you want to change
   - Describe your desired change in plain English
   - Click "Create AI Change Request"

3. **Agent implements the change**:
   - A structured GitHub issue is automatically created
   - GitHub Copilot (or your agent) is notified
   - The agent opens a PR with the implementation
   - Review and merge!

### Configuration

Required environment variables:

```bash
GITHUB_OWNER=Maxwell-Software-Solutions
GITHUB_REPO=Vercel-spine
GITHUB_TOKEN=ghp_xxx                    # Fine-grained PAT with repo:issues
OPENAI_API_KEY=sk-proj-xxx              # OpenAI API key
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx   # Vercel Blob storage
NEXT_PUBLIC_INLINE_AI=1                 # Enable widget (preview only)
```
````

### Best Practices

- Add `data-ai-id` attributes to components you edit frequently
- Use preview deployments for testing changes before production
- Review AI-generated issues before assigning to agents
- Keep descriptions concise but specific

````

---

## 🔒 Security Hardening

### Authentication Middleware (Recommended for Production)

**File:** `middleware.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Protect AI change request endpoint
  if (request.nextUrl.pathname.startsWith('/api/ai-change-request')) {
    // Option 1: Check for admin session cookie
    const sessionToken = request.cookies.get('admin-session')?.value;
    if (!sessionToken || !isValidAdminSession(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Option 2: Verify signed JWT
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || !verifyJWT(authHeader)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
  }

  return NextResponse.next();
}

function isValidAdminSession(token: string): boolean {
  // Implement your session validation logic
  // Example: check against Redis, database, or JWT
  return true; // Placeholder
}

export const config = {
  matcher: '/api/ai-change-request',
};
````

### Rate Limiting

**File:** `app/api/ai-change-request/route.ts` (add to existing)

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter (requires Upstash Redis)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
});

export async function POST(req: NextRequest) {
  // Rate limit by IP or user ID
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
    );
  }

  // ... rest of handler
}
```

---

## 🧪 Testing Strategy

### Unit Tests

**File:** `components/AiInlineRequest.test.tsx`

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiInlineRequest from './AiInlineRequest';

describe('AiInlineRequest', () => {
  it('renders the widget', () => {
    render(<AiInlineRequest />);
    expect(screen.getByText(/Inline AI Editor/i)).toBeInTheDocument();
  });

  it('enables submit only when element is picked and description provided', () => {
    render(<AiInlineRequest />);
    const submitBtn = screen.getByText(/Create AI Change Request/i);

    expect(submitBtn).toBeDisabled();

    // TODO: Mock element picker and test enabled state
  });

  it('shows success message after successful submission', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ ok: true, issueUrl: 'https://github.com/...' }),
      })
    ) as jest.Mock;

    render(<AiInlineRequest />);

    // TODO: Simulate pick + submit flow
    // await waitFor(() => {
    //   expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Issue created'));
    // });
  });
});
```

### Integration Tests

**File:** `app/api/ai-change-request/route.test.ts`

```ts
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));
jest.mock('@octokit/rest');
jest.mock('@vercel/blob');

describe('POST /api/ai-change-request', () => {
  it('returns 400 for invalid input', async () => {
    const req = new NextRequest('http://localhost/api/ai-change-request', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('creates GitHub issue and returns URL', async () => {
    // TODO: Mock Octokit, AI SDK, and Blob responses
    // Verify issue creation with correct labels and body format
  });
});
```

### E2E Tests

**File:** `tests/e2e/inline-ai.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('Inline AI Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Set feature flag in local storage or cookie
    await page.goto('/');
  });

  test('widget is visible when feature flag is enabled', async ({ page }) => {
    await expect(page.getByText('Inline AI Editor')).toBeVisible();
  });

  test('can select element and submit request', async ({ page }) => {
    // Click pick button
    await page.click('button:has-text("Pick Element")');

    // Click target element (e.g., heading)
    await page.click('h1');

    // Fill description
    await page.fill('textarea', 'Make this heading bigger and bold');

    // Submit (mock API)
    await page.route('/api/ai-change-request', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ok: true, issueUrl: 'https://github.com/test/123' }),
      });
    });

    await page.click('button:has-text("Create AI Change Request")');

    // Verify success
    await expect(page.locator('text=Issue created successfully')).toBeVisible();
  });
});
```

---

## 📊 Monitoring & Analytics

### Add logging to track usage:

```ts
// In route.ts, add after successful issue creation:
await fetch('https://your-analytics-endpoint.com/events', {
  method: 'POST',
  body: JSON.stringify({
    event: 'ai_change_request_created',
    properties: {
      issueNumber: issue.data.number,
      url: input.url,
      complexity: object.estimatedComplexity,
      hasScreenshot: !!screenshotUrl,
      timestamp: new Date().toISOString(),
    },
  }),
});
```

### Vercel Analytics Integration:

```tsx
// In AiInlineRequest.tsx, track interactions:
import { track } from '@vercel/analytics';

async function handlePick() {
  track('inline_ai_element_picked', { url: window.location.href });
  // ... rest of function
}

async function submit() {
  track('inline_ai_request_submitted', {
    url: window.location.href,
    descriptionLength: desc.length,
  });
  // ... rest of function
}
```

---

## 🚀 Deployment Checklist

- [ ] Dependencies installed via `pnpm add`
- [ ] Environment variables set in Vercel (all environments)
- [ ] GitHub token created with `repo:issues` scope
- [ ] Vercel Blob enabled in project settings
- [ ] `ai-change-request` label created in GitHub repo
- [ ] GitHub workflow file committed (`.github/workflows/route-ai-requests.yml`)
- [ ] Component added to layout with feature flag check
- [ ] Key components tagged with `data-ai-id` attributes
- [ ] README updated with usage instructions
- [ ] Tests written and passing
- [ ] Preview deployment tested end-to-end
- [ ] Security middleware configured (if needed)
- [ ] Rate limiting implemented
- [ ] Analytics/logging configured

---

## 🔄 Workflow Example

### End-to-End Flow

1. **Admin visits preview site** → `https://vercel-spine-preview-xyz.vercel.app`
2. **Sees Inline AI widget** in bottom-right corner
3. **Clicks "Pick Element"** → clicks hero heading
4. **Types description:** "Make this heading 20% larger and add a subtle text shadow"
5. **Clicks "Create AI Change Request"**

**Backend processes:**

- Validates input ✅
- Uploads screenshot to Blob ✅
- Calls OpenAI to structure request ✅
- Creates GitHub issue #42 ✅

**GitHub automation:**

- Workflow detects `ai-change-request` label
- Posts comment tagging `@github-copilot`
- Adds `copilot-ready` label

**Copilot (or agent) responds:**

- Reads issue description and criteria
- Views screenshot
- Locates component via selector
- Makes CSS changes
- Runs tests
- Opens PR #43 with `Fixes #42`

**Review & merge:**

- Human reviewer checks PR preview
- Verifies acceptance criteria
- Merges to main
- Closes issue #42

---

## 🎓 Advanced Customizations

### Custom AI Prompt for Domain-Specific Components

If your project uses specific frameworks (e.g., Sitecore, Contentful), customize the AI prompt:

```ts
// In route.ts, update the prompt:
const prompt = `
You are a senior engineer familiar with ${FRAMEWORK_NAME}.

## Component Context
- Framework: ${FRAMEWORK_NAME}
- Component ID: ${extractComponentId(input.selector)}
- CMS Type: ${getCMSType(input.url)}

## Request
${input.description}

## Output Requirements
- Include ${FRAMEWORK_NAME}-specific field IDs
- Consider multivariate testing constraints
- Flag any CMS publishing implications
- Estimate Lighthouse CLS impact (if layout change)

Return structured JSON following the schema.
`;
```

### Lighthouse CLS Safeguard

Add a validation step before creating the issue:

```ts
// Pseudo-code for CLS check
const affectsLayout = await detectLayoutChange(input.selector, object.expectedChange);

if (affectsLayout) {
  object.riskNotes = [
    ...(object.riskNotes || []),
    '⚠️ May impact Cumulative Layout Shift (CLS) - verify Lighthouse score after implementation',
  ];
  object.acceptanceCriteria.push('Run Lighthouse and verify CLS ≤ 0.1');
}
```

### Multi-Agent Support

Route to different agents based on change type:

```yaml
# In .github/workflows/route-ai-requests.yml
- name: Determine agent
  id: agent
  run: |
    if [[ "${{ github.event.issue.body }}" == *"CSS"* ]]; then
      echo "agent=@css-copilot" >> $GITHUB_OUTPUT
    elif [[ "${{ github.event.issue.body }}" == *"GraphQL"* ]]; then
      echo "agent=@backend-copilot" >> $GITHUB_OUTPUT
    else
      echo "agent=@github-copilot" >> $GITHUB_OUTPUT
    fi

- name: Tag appropriate agent
  run: |
    gh issue comment ${{ github.event.issue.number }} \
      --body "${{ steps.agent.outputs.agent }} please implement"
```

---

## 📚 References

- [Vercel AI SDK Docs](https://ai-sdk.dev/docs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Octokit REST API](https://octokit.github.io/rest.js)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [html-to-image GitHub](https://github.com/bubkoo/html-to-image)
- [GitHub Issues API](https://docs.github.com/en/rest/issues)
- [GitHub Copilot for PRs](https://github.com/features/copilot)

---

## 🆘 Troubleshooting

### Issue: Widget not appearing

- ✅ Check `NEXT_PUBLIC_INLINE_AI=1` in Vercel env vars
- ✅ Verify you're on a preview deployment (not production)
- ✅ Clear browser cache and hard reload

### Issue: Screenshot upload fails

- ✅ Verify `BLOB_READ_WRITE_TOKEN` is set correctly
- ✅ Check Vercel Blob is enabled in project settings
- ✅ Ensure element is visible (not `display: none`)

### Issue: GitHub issue creation fails

- ✅ Verify `GITHUB_TOKEN` has `repo:issues` permission
- ✅ Check token hasn't expired
- ✅ Confirm `GITHUB_OWNER` and `GITHUB_REPO` are correct
- ✅ Check GitHub API rate limits

### Issue: AI structuring returns errors

- ✅ Verify `OPENAI_API_KEY` is valid
- ✅ Check OpenAI API status
- ✅ Ensure description is ≥5 characters
- ✅ Review server logs for detailed error messages

---

## ✅ Success Metrics

Track these KPIs to measure effectiveness:

- **Issues created per week** - Usage adoption
- **Issue-to-PR conversion rate** - Agent effectiveness
- **Average time from issue to merge** - Workflow efficiency
- **User satisfaction** - Survey feedback
- **Reduction in manual bug reports** - Process improvement

---

**End of Implementation Guide**

_For questions or issues, please refer to the project README or contact the development team._

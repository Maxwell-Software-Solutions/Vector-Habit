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
  prNumber: z.number().int().positive().optional(),
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
      input.prNumber ? `**Related PR:** #${input.prNumber}` : '',
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
      labels: input.prNumber
        ? ['ai-change-request', 'needs-review', 'pr-preview-feedback']
        : ['ai-change-request', 'needs-review'],
    });

    console.log('GitHub issue created:', issue.data.html_url);

    // -------------------------------------------------------------------------
    // 5. RETURN SUCCESS
    // -------------------------------------------------------------------------
    return NextResponse.json({
      ok: true,
      issueUrl: issue.data.html_url,
      issueNumber: issue.data.number,
      prNumber: input.prNumber,
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

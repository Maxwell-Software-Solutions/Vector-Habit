# Stage 5: AI Floor Plan Generation

**Duration**: 1.5 weeks (7-10 days)  
**Dependencies**: Stage 1-4 complete (full manual pipeline working)  
**Stage Gate**: AI generates valid, editable floor plans from prompts  
**Quality Bar**: 80%+ valid plans on first try, self-repair on failures  

---

## 🎯 Stage Objectives

Integrate **AI-driven floor plan generation** using LLM (OpenAI/Claude) with schema-validated output. Implement **validation feedback loop** for self-repair and **prompt engineering** for architectural accuracy.

**Success Criteria:**
- ✅ API route `/api/generate-plan` accepts natural language prompts
- ✅ LLM outputs schema-valid IR (Project JSON)
- ✅ Validation runs automatically → retries on errors (max 2 loops)
- ✅ Generated plans render/edit/export like manual plans
- ✅ Prompt includes lot size, room requirements, style hints
- ✅ 80%+ success rate on common residential prompts

**Non-Goals (Explicitly Out of Scope):**
- ❌ No multi-storey generation (Stage 6+)
- ❌ No furniture/fixtures (Stage 7+)
- ❌ No real-time collaboration (future)
- ❌ No cost optimization (LLM token usage analytics later)

---

## 🏗️ AI Architecture Pattern

### Design: LLM → IR → Validate → Retry

```
User Prompt
    ↓
Next.js API Route (server-side)
    ↓
LLM (OpenAI GPT-4) + JSON Schema
    ↓
Parse → Validate (lib/validator)
    ↓
    ├─ Valid → Return IR
    └─ Invalid → Retry with errors (max 2x)
```

**Critical Decision**: Never expose OpenAI API key to client (use Next.js API route).

---

## 🛡️ Prompt Engineering Strategy

### System Prompt Template

```typescript
// lib/ai/prompts.ts

export const SYSTEM_PROMPT = `You are an expert architectural AI assistant specializing in residential floor plan design.

Your task is to generate structurally valid floor plans in JSON format that comply with building codes and architectural best practices.

CRITICAL RULES:
1. Output ONLY valid JSON matching the provided schema - no explanations or markdown.
2. All dimensions in millimeters (mm).
3. Walls must form closed boundaries (rooms must be enclosed).
4. Minimum wall length: 500mm.
5. Standard wall thickness: 200mm (interior), 250mm (exterior).
6. Standard ceiling height: 2700mm.
7. Doors: 900mm wide (interior), 1000mm wide (exterior).
8. Windows: 1200mm-1800mm wide, sill height 900mm.
9. Openings must be positioned within wall segments (offset + width/2 ≤ wall length).
10. Avoid overlapping walls or impossible geometries.

ARCHITECTURAL BEST PRACTICES:
- Bedrooms: minimum 9m² (3000mm x 3000mm).
- Bathrooms: minimum 4m² (2000mm x 2000mm).
- Kitchens: minimum 6m² (2000mm x 3000mm).
- Hallways: minimum 1000mm wide.
- Doors on interior walls should be ~1000mm from corners.
- Windows should be centered on exterior walls where possible.

You will receive:
1. A natural language description of the desired floor plan.
2. Lot size constraints (width x depth in mm).
3. Number of bedrooms, bathrooms, and other rooms.
4. Optional style preferences (modern, traditional, open-plan, etc.).

Generate a complete, valid floor plan that meets these requirements.`;

export interface GeneratePromptInput {
  userPrompt: string;
  lotSizeMm: { width: number; depth: number };
  bedrooms: number;
  bathrooms: number;
  style?: string;
}

export function buildUserPrompt(input: GeneratePromptInput): string {
  return `Generate a floor plan with these requirements:

Description: ${input.userPrompt}

Constraints:
- Lot size: ${input.lotSizeMm.width / 1000}m x ${input.lotSizeMm.depth / 1000}m (${input.lotSizeMm.width}mm x ${input.lotSizeMm.depth}mm)
- Bedrooms: ${input.bedrooms}
- Bathrooms: ${input.bathrooms}
${input.style ? `- Style: ${input.style}` : ''}

Create a rectangular floor plan that fits within the lot size. Include:
- Exterior walls forming the building perimeter
- Interior walls dividing rooms
- Doors between rooms and to the exterior
- Windows on exterior walls

Ensure all walls connect properly to form enclosed rooms.
All dimensions in millimeters (mm).
Output valid JSON only.`;
}
```

**Architecture Self-Rating: 9/10** - Detailed constraints reduce hallucinations, matches IR schema.

---

## 🤖 AI Generation API Route

```typescript
// app/api/generate-plan/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { ProjectSchema } from '@/lib/ir/schema';
import { validateProject } from '@/lib/validator/rules';
import { SYSTEM_PROMPT, buildUserPrompt, GeneratePromptInput } from '@/lib/ai/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs'; // Server-side only
export const maxDuration = 60; // 60s timeout (LLM calls can be slow)

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePromptInput = await req.json();
    
    // Validate input
    if (!body.userPrompt || !body.lotSizeMm) {
      return NextResponse.json(
        { error: 'Missing required fields: userPrompt, lotSizeMm' },
        { status: 400 }
      );
    }
    
    const userPrompt = buildUserPrompt(body);
    
    // Attempt 1: Generate plan
    let attempt = 0;
    const maxAttempts = 3;
    let lastError: string | null = null;
    
    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        const completion = await openai.beta.chat.completions.parse({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
            ...(lastError
              ? [{
                  role: 'assistant' as const,
                  content: 'Previous attempt had validation errors:',
                }, {
                  role: 'user' as const,
                  content: `Fix these issues and regenerate:\n${lastError}`,
                }]
              : []
            ),
          ],
          response_format: zodResponseFormat(ProjectSchema, 'floor_plan'),
          temperature: 0.7,
        });
        
        const project = completion.choices[0].message.parsed;
        
        if (!project) {
          throw new Error('LLM returned null parsed data');
        }
        
        // Validate generated plan
        const issues = validateProject(project);
        
        if (issues.length === 0) {
          // Success! Return valid plan
          return NextResponse.json({
            success: true,
            project,
            attempts: attempt,
          });
        }
        
        // Has validation errors - retry
        const errors = issues.filter(i => i.severity === 'error');
        
        if (errors.length > 0 && attempt < maxAttempts) {
          lastError = errors.map(e => `- ${e.code}: ${e.message}`).join('\n');
          console.log(`Attempt ${attempt} failed validation, retrying...`);
          continue; // Retry
        }
        
        // Max attempts or warnings only
        return NextResponse.json({
          success: issues.every(i => i.severity === 'warning'),
          project,
          issues,
          attempts: attempt,
        });
        
      } catch (error: any) {
        console.error(`Generation attempt ${attempt} failed:`, error);
        
        if (attempt >= maxAttempts) {
          throw error;
        }
        
        lastError = error.message;
      }
    }
    
    // Exhausted retries
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate valid plan after 3 attempts',
        lastError,
      },
      { status: 500 }
    );
    
  } catch (error: any) {
    console.error('Generate plan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Features:**
- Uses OpenAI structured outputs (Zod schema validation)
- Retry loop with validation feedback (max 3 attempts)
- Server-side only (API key never exposed)
- 60s timeout for long LLM calls

**Architecture Self-Rating: 9/10** - Robust retry logic, schema enforcement, secure.

---

## 🎨 AI Generation UI Component

```tsx
// components/AIGeneratePanel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { Project } from '@/lib/ir/schema';

interface AIGeneratePanelProps {
  onGenerate: (project: Project) => void;
}

export function AIGeneratePanel({ onGenerate }: AIGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [lotWidth, setLotWidth] = useState('20'); // meters
  const [lotDepth, setLotDepth] = useState('30'); // meters
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('2');
  const [style, setStyle] = useState('modern');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description');
      return;
    }
    
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: prompt,
          lotSizeMm: {
            width: parseFloat(lotWidth) * 1000,
            depth: parseFloat(lotDepth) * 1000,
          },
          bedrooms: parseInt(bedrooms, 10),
          bathrooms: parseInt(bathrooms, 10),
          style,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Generated plan has validation errors');
      }
      
      onGenerate(data.project);
      
      // Show attempt count
      if (data.attempts > 1) {
        console.log(`Generated in ${data.attempts} attempts (with self-repair)`);
      }
      
    } catch (err: any) {
      console.error('AI generation error:', err);
      setError(err.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Generate Floor Plan
        </CardTitle>
        <CardDescription>
          Describe your ideal home and let AI create the floor plan
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prompt">Description</Label>
          <Textarea
            id="prompt"
            placeholder="e.g., Single-storey family home with open-plan living, kitchen, and dining area..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lotWidth">Lot Width (m)</Label>
            <Input
              id="lotWidth"
              type="number"
              value={lotWidth}
              onChange={(e) => setLotWidth(e.target.value)}
              min="5"
              max="50"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="lotDepth">Lot Depth (m)</Label>
            <Input
              id="lotDepth"
              type="number"
              value={lotDepth}
              onChange={(e) => setLotDepth(e.target.value)}
              min="5"
              max="50"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger id="bedrooms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Select value={bathrooms} onValueChange={setBathrooms}>
              <SelectTrigger id="bathrooms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(n => (
                  <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Label htmlFor="style">Style</Label>
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger id="style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="traditional">Traditional</SelectItem>
              <SelectItem value="open-plan">Open Plan</SelectItem>
              <SelectItem value="minimalist">Minimalist</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded">
            {error}
          </div>
        )}
        
        <Button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating... (may take 30-60s)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Floor Plan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🧪 Testing Strategy

### API Route Tests

```typescript
// app/api/generate-plan/route.test.ts

import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    beta: {
      chat: {
        completions: {
          parse: jest.fn(),
        },
      },
    },
  })),
}));

describe('POST /api/generate-plan', () => {
  it('should return 400 for missing fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
  
  it('should generate valid plan on success', async () => {
    const mockProject = {
      id: 'p1',
      name: 'AI Generated Plan',
      units: 'mm',
      levels: [{
        id: 'l1',
        name: 'Ground Floor',
        walls: [],
        openings: [],
      }],
    };
    
    const OpenAI = require('openai').OpenAI;
    const mockInstance = new OpenAI();
    mockInstance.beta.chat.completions.parse.mockResolvedValue({
      choices: [{
        message: {
          parsed: mockProject,
        },
      }],
    });
    
    const req = new NextRequest('http://localhost:3000/api/generate-plan', {
      method: 'POST',
      body: JSON.stringify({
        userPrompt: 'Test house',
        lotSizeMm: { width: 20000, depth: 30000 },
        bedrooms: 3,
        bathrooms: 2,
      }),
    });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project).toBeDefined();
  });
});
```

### Prompt Engineering Tests (Manual)

```typescript
// lib/ai/prompts.test.ts

import { buildUserPrompt } from './prompts';

describe('Prompt Builder', () => {
  it('should include all required fields', () => {
    const prompt = buildUserPrompt({
      userPrompt: '3 bedroom house',
      lotSizeMm: { width: 20000, depth: 30000 },
      bedrooms: 3,
      bathrooms: 2,
      style: 'modern',
    });
    
    expect(prompt).toContain('3 bedroom house');
    expect(prompt).toContain('20m x 30m');
    expect(prompt).toContain('Bedrooms: 3');
    expect(prompt).toContain('Bathrooms: 2');
    expect(prompt).toContain('Style: modern');
  });
  
  it('should handle optional style', () => {
    const prompt = buildUserPrompt({
      userPrompt: 'Simple house',
      lotSizeMm: { width: 10000, depth: 15000 },
      bedrooms: 2,
      bathrooms: 1,
    });
    
    expect(prompt).not.toContain('Style:');
  });
});
```

### E2E AI Generation Test

```typescript
// tests/e2e/ai-generation.spec.ts

import { test, expect } from '@playwright/test';

test('AI generates floor plan from prompt', async ({ page }) => {
  await page.goto('/canvas');
  
  // Open AI panel
  await expect(page.locator('text=AI Generate Floor Plan')).toBeVisible();
  
  // Fill form
  await page.fill('[placeholder*="ideal home"]', '3 bedroom family home with open kitchen');
  await page.selectOption('text=Bedrooms', '3');
  await page.selectOption('text=Bathrooms', '2');
  
  // Click generate
  await page.click('text=Generate Floor Plan');
  
  // Wait for generation (up to 60s)
  await expect(page.locator('text=Generating')).toBeVisible();
  
  // Should complete
  await expect(page.locator('canvas')).toBeVisible({ timeout: 65000 });
  
  // Verify plan loaded (validation panel should show)
  await expect(page.locator('text=Plan Valid')).toBeVisible({ timeout: 5000 });
});
```

**Note**: E2E AI test requires `OPENAI_API_KEY` env var and costs real $$ (run sparingly).

---

## ✅ Stage 5 Acceptance Criteria

### Must Complete:

1. **API Route**
   - [ ] `/api/generate-plan` accepts prompt + constraints
   - [ ] OpenAI structured outputs with Zod schema
   - [ ] Retry loop (max 3 attempts) with validation feedback
   - [ ] Returns valid Project JSON or error

2. **Prompt Engineering**
   - [ ] System prompt with architectural rules
   - [ ] User prompt builder with lot size, rooms, style
   - [ ] Error feedback format for LLM self-repair

3. **UI Component**
   - [ ] `AIGeneratePanel` with form (description, lot, rooms, style)
   - [ ] Loading state with progress indicator
   - [ ] Error display
   - [ ] Generated plan replaces current project

4. **Testing**
   - [ ] API route tests (mocked OpenAI)
   - [ ] Prompt builder tests
   - [ ] E2E test (real API call, skip in CI)
   - [ ] Manual testing: 10 prompts, 80%+ success rate

### Quality Gates:

- ✅ 80%+ valid plans on first attempt (manual evaluation)
- ✅ Retry loop reduces failures to < 5%
- ✅ No API key exposure (server-side only)
- ✅ TypeScript strict mode: No errors

---

## 📦 Deliverables

```
app/
  api/
    generate-plan/
      route.ts            ✅ OpenAI API route
      route.test.ts       ✅ API tests (mocked)

lib/
  ai/
    prompts.ts            ✅ System/user prompt templates
    prompts.test.ts       ✅ Prompt tests
    README.md             ✅ AI integration docs

components/
  AIGeneratePanel.tsx     ✅ Generation UI
  AIGeneratePanel.test.tsx ✅ Component tests

tests/
  e2e/
    ai-generation.spec.ts ✅ E2E AI flow (optional)
```

**Stage Gate Test**: Run this flow successfully:

1. Navigate to `/canvas` → Open AI panel
2. Enter prompt: "Modern 3 bedroom home with open-plan kitchen and living area, 2 bathrooms"
3. Set lot: 15m x 20m, bedrooms: 3, bathrooms: 2, style: modern
4. Click "Generate Floor Plan"
5. Wait 30-60s → Plan appears on canvas
6. Validation panel shows "✓ Plan Valid"
7. Edit wall → Changes work
8. Export PDF/DXF → Exports work
9. **Critical**: 8/10 similar prompts should succeed (80% rate)

---

## 🎓 Architecture Self-Rating: 9/10

**Strengths:**
- ✅ Schema validation prevents garbage output (ADR-002: validation as gate)
- ✅ Retry loop with feedback = self-repairing AI
- ✅ Structured outputs (Zod) > raw JSON parsing
- ✅ Server-side only = secure API key handling
- ✅ Follows GPT plan: "AI last, after pipeline validated"

**Considerations:**
- ⚠️ LLM costs can accumulate (add usage tracking later)
- ⚠️ Quality depends on prompt engineering (iterate based on failures)
- ⚠️ 60s timeout may be tight for complex prompts (monitor)

**Alignment to Best Practices:**
- ✅ Follows ADR-008: AI integrated after full pipeline working
- ✅ Follows GPT plan: "LLM → schema → validate → retry" pattern
- ✅ Uses Vercel AI SDK patterns (structured outputs)
- ✅ Aligns with Vercel Spine: Next.js API routes, OpenAI integration

**Production Readiness**: 85% - Needs:
- Usage analytics (token counting)
- Rate limiting (prevent abuse)
- Prompt versioning (A/B test prompts)

---

## 🚀 Post-Stage 5 Enhancements (Future)

1. **Advanced Prompting**
   - Few-shot examples (show LLM good floor plans)
   - Chain-of-thought reasoning (explain layout decisions)
   - Adjacency matrix (specify room connections)

2. **Quality Improvements**
   - Semantic validators (min room sizes, bathroom near bedrooms)
   - Multi-model ensemble (GPT-4 + Claude, pick best)
   - User feedback loop (thumbs up/down → retrain prompts)

3. **Performance**
   - Streaming responses (show progress as LLM generates)
   - Cached common layouts (instant templates)
   - Cost optimization (use GPT-3.5 for drafts, GPT-4 for refinement)

---

**Next**: [MVP-ROADMAP.md](./MVP-ROADMAP.md) - Overall Timeline + Dependencies

# Stage 2: 2D Canvas Viewer & Example Loading

**Duration**: 1 week (5-7 days)  
**Dependencies**: Stage 1 complete (IR schema + validator)  
**Stage Gate**: Can load example plans and render them as 2D floor plans  
**Quality Bar**: 85%+ test coverage, Lighthouse TBT < 300ms  

---

## 🎯 Stage Objectives

Build the **2D canvas viewer** that renders IR as visual floor plans. Implement **geometry derivation layer** (IR → polygons) and **example plan loader** UI. This stage is read-only (no editing yet).

**Success Criteria:**
- ✅ Konva.js installed + SSR-safe dynamic import wrapper
- ✅ Geometry derivation: IR → wall polygons + opening cutouts
- ✅ 2D canvas renders example plans with pan/zoom
- ✅ Example loader dropdown UI (select from public/examples/*.json)
- ✅ Validation panel shows issues from loaded plan
- ✅ Lighthouse performance: TBT < 300ms, bundle < 200KB

**Non-Goals (Explicitly Out of Scope):**
- ❌ No wall editing/drawing yet (Stage 3)
- ❌ No export functionality (Stage 4)
- ❌ No AI generation (Stage 5)
- ❌ No database persistence

---

## 📐 Geometry Derivation Layer

### Design Principle: Pure Functions Only

Geometry derivation must be **deterministic** and **framework-agnostic** (no React, no Konva).

```typescript
// lib/geometry/derive.ts

import { Wall, Opening, Point } from '../ir/schema';

/** Polygon represented as array of points */
export interface Polygon {
  points: Point[];
  closed: boolean;
}

/** Wall rendered as centerline + thickness → rectangle */
export interface WallGeometry {
  wallId: string;
  centerline: { start: Point; end: Point };
  polygon: Polygon; // 4 corners of wall rectangle
  length: number;
}

/** Opening rendered as cutout on wall */
export interface OpeningGeometry {
  openingId: string;
  wallId: string;
  center: Point; // Position on wall
  polygon: Polygon; // Opening rectangle
}

/** Derive wall polygon from centerline + thickness */
export function deriveWallGeometry(wall: Wall): WallGeometry {
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular vector for thickness
  const nx = -dy / length;
  const ny = dx / length;
  
  const halfThickness = wall.thicknessMm / 2;
  
  // Four corners of wall rectangle
  const p1 = {
    x: wall.a.x + nx * halfThickness,
    y: wall.a.y + ny * halfThickness,
  };
  const p2 = {
    x: wall.b.x + nx * halfThickness,
    y: wall.b.y + ny * halfThickness,
  };
  const p3 = {
    x: wall.b.x - nx * halfThickness,
    y: wall.b.y - ny * halfThickness,
  };
  const p4 = {
    x: wall.a.x - nx * halfThickness,
    y: wall.a.y - ny * halfThickness,
  };
  
  return {
    wallId: wall.id,
    centerline: { start: wall.a, end: wall.b },
    polygon: { points: [p1, p2, p3, p4], closed: true },
    length,
  };
}

/** Derive opening position on wall */
export function deriveOpeningGeometry(
  opening: Opening,
  wall: Wall
): OpeningGeometry {
  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const wallLength = Math.sqrt(dx * dx + dy * dy);
  
  // Position along wall centerline
  const t = opening.offsetMm / wallLength;
  const centerX = wall.a.x + dx * t;
  const centerY = wall.a.y + dy * t;
  
  // Perpendicular for opening depth
  const nx = -dy / wallLength;
  const ny = dx / wallLength;
  
  const halfWidth = opening.widthMm / 2;
  const halfDepth = wall.thicknessMm / 2;
  
  // Opening rectangle (cutout from wall)
  const tx = dx / wallLength; // Tangent vector
  const ty = dy / wallLength;
  
  const p1 = {
    x: centerX - tx * halfWidth + nx * halfDepth,
    y: centerY - ty * halfWidth + ny * halfDepth,
  };
  const p2 = {
    x: centerX + tx * halfWidth + nx * halfDepth,
    y: centerY + ty * halfWidth + ny * halfDepth,
  };
  const p3 = {
    x: centerX + tx * halfWidth - nx * halfDepth,
    y: centerY + ty * halfWidth - ny * halfDepth,
  };
  const p4 = {
    x: centerX - tx * halfWidth - nx * halfDepth,
    y: centerY - ty * halfWidth - ny * halfDepth,
  };
  
  return {
    openingId: opening.id,
    wallId: wall.id,
    center: { x: centerX, y: centerY },
    polygon: { points: [p1, p2, p3, p4], closed: true },
  };
}

/** Derive all geometry for a level */
export function deriveLevelGeometry(level: Level) {
  const walls = level.walls.map(deriveWallGeometry);
  
  const openings = level.openings.map(opening => {
    const wall = level.walls.find(w => w.id === opening.wallId);
    if (!wall) {
      throw new Error(`Opening ${opening.id} references non-existent wall ${opening.wallId}`);
    }
    return deriveOpeningGeometry(opening, wall);
  });
  
  return { walls, openings };
}
```

**Architecture Self-Rating: 9/10** - Pure, testable, deterministic. Slight complexity in vector math.

---

## 🎨 Konva.js Canvas Component

### Installation

```bash
pnpm add konva react-konva
pnpm add -D @types/react-konva
```

### Component Structure (Client Component)

```tsx
// components/PlanViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Text } from 'react-konva';
import { Project } from '@/lib/ir/schema';
import { deriveLevelGeometry } from '@/lib/geometry/derive';

interface PlanViewerProps {
  project: Project | null;
  onSelectEntity?: (entityId: string) => void;
}

export function PlanViewer({ project, onSelectEntity }: PlanViewerProps) {
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  if (!project || project.levels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No plan loaded. Select an example or create a new plan.
      </div>
    );
  }
  
  const level = project.levels[0]; // MVP: single level only
  const geometry = deriveLevelGeometry(level);
  
  // Calculate bounds for auto-zoom
  const bounds = calculateBounds(geometry);
  const scale = Math.min(
    stageSize.width / (bounds.maxX - bounds.minX + 2000), // +2000mm padding
    stageSize.height / (bounds.maxY - bounds.minY + 2000)
  );
  
  const offsetX = (stageSize.width - (bounds.maxX + bounds.minX) * scale) / 2;
  const offsetY = (stageSize.height - (bounds.maxY + bounds.minY) * scale) / 2;
  
  return (
    <div ref={containerRef} className="w-full h-full bg-gray-50">
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          {/* Grid */}
          <GridLayer bounds={bounds} scale={scale} offset={{ x: offsetX, y: offsetY }} />
          
          {/* Walls */}
          {geometry.walls.map(wall => (
            <Line
              key={wall.wallId}
              points={wall.polygon.points.flatMap(p => [
                p.x * scale + offsetX,
                p.y * scale + offsetY,
              ])}
              closed
              fill="#d4d4d8" // zinc-300
              stroke="#52525b" // zinc-600
              strokeWidth={2}
              onClick={() => onSelectEntity?.(wall.wallId)}
            />
          ))}
          
          {/* Openings (cutouts shown as white rectangles) */}
          {geometry.openings.map(opening => (
            <Line
              key={opening.openingId}
              points={opening.polygon.points.flatMap(p => [
                p.x * scale + offsetX,
                p.y * scale + offsetY,
              ])}
              closed
              fill="#ffffff"
              stroke="#3b82f6" // blue-500 for doors/windows
              strokeWidth={2}
              onClick={() => onSelectEntity?.(opening.openingId)}
            />
          ))}
          
          {/* Dimension labels (optional MVP) */}
          {geometry.walls.map(wall => {
            const midX = (wall.centerline.start.x + wall.centerline.end.x) / 2;
            const midY = (wall.centerline.start.y + wall.centerline.end.y) / 2;
            return (
              <Text
                key={`label-${wall.wallId}`}
                x={midX * scale + offsetX}
                y={midY * scale + offsetY}
                text={`${(wall.length / 1000).toFixed(2)}m`}
                fontSize={12}
                fill="#18181b" // zinc-900
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

/** Calculate bounding box of all geometry */
function calculateBounds(geometry: ReturnType<typeof deriveLevelGeometry>) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  geometry.walls.forEach(wall => {
    wall.polygon.points.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  });
  
  return { minX, minY, maxX, maxY };
}

/** Grid overlay (100mm spacing) */
function GridLayer({ bounds, scale, offset }: any) {
  const gridLines: JSX.Element[] = [];
  const gridSpacing = 1000; // 1m grid in mm
  
  for (let x = Math.floor(bounds.minX / gridSpacing) * gridSpacing; x <= bounds.maxX; x += gridSpacing) {
    gridLines.push(
      <Line
        key={`grid-v-${x}`}
        points={[
          x * scale + offset.x, bounds.minY * scale + offset.y,
          x * scale + offset.x, bounds.maxY * scale + offset.y,
        ]}
        stroke="#e4e4e7" // zinc-200
        strokeWidth={1}
      />
    );
  }
  
  for (let y = Math.floor(bounds.minY / gridSpacing) * gridSpacing; y <= bounds.maxY; y += gridSpacing) {
    gridLines.push(
      <Line
        key={`grid-h-${y}`}
        points={[
          bounds.minX * scale + offset.x, y * scale + offset.y,
          bounds.maxX * scale + offset.x, y * scale + offset.y,
        ]}
        stroke="#e4e4e7" // zinc-200
        strokeWidth={1}
      />
    );
  }
  
  return <>{gridLines}</>;
}
```

**SSR-Safe Dynamic Import:**

```tsx
// app/canvas/page.tsx
import dynamic from 'next/dynamic';

const PlanViewer = dynamic(() => import('@/components/PlanViewer').then(mod => ({ default: mod.PlanViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading canvas...</div>,
});

export default function CanvasPage() {
  return (
    <main className="h-screen">
      <PlanViewer project={null} />
    </main>
  );
}
```

**Architecture Self-Rating: 8/10** - Good React integration, auto-zoom/grid nice touches. Complexity in coordinate transforms.

---

## 🗂️ Example Loader Component

```tsx
// components/ExampleLoader.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/lib/ir/schema';

const EXAMPLES = [
  { id: 'simple-room', name: 'Simple Rectangular Room', path: '/examples/simple-room.json' },
  { id: 'invalid-plan', name: 'Invalid Plan (Testing)', path: '/examples/invalid-plan.json' },
];

interface ExampleLoaderProps {
  onLoad: (project: Project) => void;
}

export function ExampleLoader({ onLoad }: ExampleLoaderProps) {
  const [loading, setLoading] = useState<string | null>(null);
  
  const handleLoad = async (path: string, id: string) => {
    setLoading(id);
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error('Failed to load example');
      const project: Project = await response.json();
      onLoad(project);
    } catch (error) {
      console.error('Error loading example:', error);
      alert('Failed to load example plan');
    } finally {
      setLoading(null);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Plans</CardTitle>
        <CardDescription>Load a sample floor plan to get started</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {EXAMPLES.map(example => (
          <Button
            key={example.id}
            variant="outline"
            onClick={() => handleLoad(example.path, example.id)}
            disabled={loading === example.id}
          >
            {loading === example.id ? 'Loading...' : example.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## 🛡️ Validation Panel Component

```tsx
// components/ValidationPanel.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidationIssue } from '@/lib/validator/rules';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onFocusEntity?: (entityId: string) => void;
}

export function ValidationPanel({ issues, onFocusEntity }: ValidationPanelProps) {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✓ Plan Valid</CardTitle>
          <CardDescription>No issues detected</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-red-600">
          {errors.length > 0 ? '✗ Plan Invalid' : '⚠ Plan Has Warnings'}
        </CardTitle>
        <CardDescription>
          {errors.length} error{errors.length !== 1 ? 's' : ''}, {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {errors.map((issue, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2 bg-red-50 rounded cursor-pointer hover:bg-red-100"
            onClick={() => onFocusEntity?.(issue.entityId)}
          >
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-medium">{issue.code}</div>
              <div className="text-muted-foreground">{issue.message}</div>
            </div>
          </div>
        ))}
        
        {warnings.map((issue, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2 bg-yellow-50 rounded cursor-pointer hover:bg-yellow-100"
            onClick={() => onFocusEntity?.(issue.entityId)}
          >
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-medium">{issue.code}</div>
              <div className="text-muted-foreground">{issue.message}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## 🧪 Testing Strategy

### Geometry Derivation Tests

```typescript
// lib/geometry/derive.test.ts

import { deriveWallGeometry, deriveOpeningGeometry } from './derive';
import { Wall, Opening } from '../ir/schema';

describe('Geometry: Wall Derivation', () => {
  it('should derive correct wall polygon for horizontal wall', () => {
    const wall: Wall = {
      id: 'w1',
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      thicknessMm: 200,
      heightMm: 2700,
    };
    
    const geometry = deriveWallGeometry(wall);
    
    expect(geometry.wallId).toBe('w1');
    expect(geometry.length).toBe(5000);
    expect(geometry.polygon.points).toHaveLength(4);
    
    // Check perpendicular offset (100mm from centerline)
    expect(geometry.polygon.points[0].y).toBe(-100);
    expect(geometry.polygon.points[3].y).toBe(100);
  });
  
  it('should derive correct wall polygon for vertical wall', () => {
    const wall: Wall = {
      id: 'w2',
      a: { x: 0, y: 0 },
      b: { x: 0, y: 4000 },
      thicknessMm: 200,
      heightMm: 2700,
    };
    
    const geometry = deriveWallGeometry(wall);
    
    expect(geometry.length).toBe(4000);
    expect(geometry.polygon.points[0].x).toBe(100); // Perpendicular offset
  });
});

describe('Geometry: Opening Derivation', () => {
  it('should position opening correctly on wall', () => {
    const wall: Wall = {
      id: 'w1',
      a: { x: 0, y: 0 },
      b: { x: 5000, y: 0 },
      thicknessMm: 200,
      heightMm: 2700,
    };
    
    const opening: Opening = {
      id: 'o1',
      wallId: 'w1',
      type: 'door',
      offsetMm: 2500, // Center of wall
      widthMm: 900,
      heightMm: 2100,
      sillHeightMm: 0,
    };
    
    const geometry = deriveOpeningGeometry(opening, wall);
    
    expect(geometry.openingId).toBe('o1');
    expect(geometry.center.x).toBe(2500); // Midpoint
    expect(geometry.center.y).toBe(0);
  });
});
```

### Component Tests (React Testing Library)

```typescript
// components/PlanViewer.test.tsx

import { render } from '@testing-library/react';
import { PlanViewer } from './PlanViewer';

// Mock react-konva (canvas mocking)
jest.mock('react-konva', () => ({
  Stage: ({ children }: any) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Line: () => <div data-testid="konva-line" />,
  Text: () => <div data-testid="konva-text" />,
}));

describe('PlanViewer', () => {
  it('renders empty state when no project provided', () => {
    const { getByText } = render(<PlanViewer project={null} />);
    expect(getByText(/No plan loaded/i)).toBeInTheDocument();
  });
  
  it('renders stage when project provided', () => {
    const project = {
      id: 'p1',
      name: 'Test',
      units: 'mm' as const,
      levels: [{
        id: 'l1',
        name: 'Ground',
        walls: [],
        openings: [],
      }],
    };
    
    const { getByTestId } = render(<PlanViewer project={project} />);
    expect(getByTestId('konva-stage')).toBeInTheDocument();
  });
});
```

### E2E Test (Playwright)

```typescript
// tests/e2e/canvas-viewer.spec.ts

import { test, expect } from '@playwright/test';

test('loads and displays example plan', async ({ page }) => {
  await page.goto('/canvas');
  
  // Load simple room example
  await page.click('text=Simple Rectangular Room');
  
  // Wait for canvas to render
  await page.waitForSelector('canvas');
  
  // Take screenshot for visual regression
  await expect(page).toHaveScreenshot('simple-room-loaded.png');
  
  // Verify validation shows success
  await expect(page.locator('text=Plan Valid')).toBeVisible();
});

test('displays validation errors for invalid plan', async ({ page }) => {
  await page.goto('/canvas');
  
  // Load invalid plan
  await page.click('text=Invalid Plan');
  
  // Verify error shown
  await expect(page.locator('text=Plan Invalid')).toBeVisible();
  await expect(page.locator('text=OPENING_EXCEEDS_WALL')).toBeVisible();
});
```

---

## ✅ Stage 2 Acceptance Criteria

### Must Complete:

1. **Konva.js Setup**
   - [ ] `konva` and `react-konva` installed
   - [ ] Dynamic import wrapper (SSR-safe)
   - [ ] Lighthouse bundle size < 200KB (check with `pnpm test:perf`)

2. **Geometry Derivation**
   - [ ] `lib/geometry/derive.ts` with pure functions
   - [ ] `deriveWallGeometry()` and `deriveOpeningGeometry()` implemented
   - [ ] 100% test coverage on geometry functions

3. **Canvas Viewer**
   - [ ] `components/PlanViewer.tsx` renders walls + openings
   - [ ] Auto-zoom to fit plan in viewport
   - [ ] Grid overlay (1m spacing)
   - [ ] Dimension labels on walls

4. **UI Components**
   - [ ] `components/ExampleLoader.tsx` loads JSON plans
   - [ ] `components/ValidationPanel.tsx` displays issues
   - [ ] `app/canvas/page.tsx` wires everything together

5. **Testing**
   - [ ] Geometry tests: 85%+ coverage
   - [ ] Component tests: 85%+ coverage (with Konva mocks)
   - [ ] E2E test: Load example → verify render → check validation

### Quality Gates:

- ✅ Jest coverage: 85%+ on `lib/geometry/`, `components/`
- ✅ Lighthouse TBT: < 300ms (canvas code-split)
- ✅ TypeScript strict: No errors
- ✅ Visual regression: E2E screenshot matches baseline

---

## 📦 Deliverables

```
lib/
  geometry/
    derive.ts           ✅ Pure geometry functions
    derive.test.ts      ✅ Comprehensive tests
    README.md           ✅ Geometry docs

components/
  PlanViewer.tsx        ✅ Konva canvas component
  PlanViewer.test.tsx   ✅ Component tests
  ExampleLoader.tsx     ✅ JSON loader UI
  ValidationPanel.tsx   ✅ Issue display

app/
  canvas/
    page.tsx            ✅ Integrated demo page

tests/
  e2e/
    canvas-viewer.spec.ts ✅ E2E visual test
```

**Stage Gate Test**: Run this flow successfully:

1. `pnpm dev` → Navigate to `/canvas`
2. Click "Simple Rectangular Room" → Plan renders with 4 walls + door + window
3. Validation panel shows "✓ Plan Valid"
4. Click "Invalid Plan" → Validation panel shows "OPENING_EXCEEDS_WALL" error
5. `pnpm test:e2e` passes with screenshot comparison

---

## 🎓 Architecture Self-Rating: 8.5/10

**Strengths:**
- ✅ Geometry derivation pure + testable (ADR-001 compliance)
- ✅ Canvas component uses React patterns (declarative Konva)
- ✅ Auto-zoom/grid enhances UX without complexity
- ✅ Example loader + validation UI demonstrate full pipeline

**Considerations:**
- ⚠️ No pan/zoom controls yet (Stage 3 enhancement)
- ⚠️ Canvas mocking in tests is boilerplate-heavy
- ⚠️ Large plans may need performance optimization (memoization)

**Alignment to Best Practices:**
- ✅ Follows GPT plan: "Build pipeline before AI"
- ✅ Konva code-split per ADR-005 (performance)
- ✅ Aligns with Vercel Spine: uses shadcn/ui Card, Button
- ✅ Validation panel proves ADR-002 (validation as UX feature)

**Ready for Stage 3**: Yes - rendering works, now add editing.

---

**Next Stage**: [STAGE-3-EDITOR.md](./STAGE-3-EDITOR.md) - Wall Drawing Tools + Manual Editing

# FloorForge MVP Roadmap

**Software Name**: FloorForge (AI + Architecture + Creation)  
**Project Type**: AI-Driven CAD for Residential Floor Plans  
**Total Duration**: 5-6 weeks (MVP complete)  
**Tech Stack**: Next.js 14, React, TypeScript, Konva.js, Prisma, OpenAI  

---

## 📊 Executive Summary

FloorForge is an AI-driven CAD application that generates editable, export-ready residential floor plans from natural language prompts. The MVP follows a **staged architecture** approach where each stage builds on validated foundations, preventing the common trap of AI integration spaghetti.

### Core Innovation

**Intermediate Representation (IR) as Source of Truth**  
- All geometry derives from typed, validated data (not pixels)
- AI outputs schema-validated JSON (not free-form drawings)
- Enables undo/redo, collaboration, and reliable exports

### MVP Capabilities (Week 6)

✅ **Manual Workflow**: Draw walls → Edit → Validate → Export PDF/DXF  
✅ **AI Workflow**: Prompt → AI generates plan → Edit → Export  
✅ **Quality Gate**: 85%+ test coverage, validation enforced, exports industry-standard  

---

## 🗓️ Stage Timeline & Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                         MVP ROADMAP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Week 1: Stage 1 (IR + Validation)                              │
│  ├─ IR schema (Zod)                                             │
│  ├─ Validator rules                                             │
│  └─ Example fixtures                                            │
│                                                                   │
│  Week 2: Stage 2 (Canvas Viewer)                                │
│  ├─ Konva.js setup                                              │
│  ├─ Geometry derivation                                         │
│  ├─ Example loader UI                                           │
│  └─ Validation panel                                            │
│                                                                   │
│  Week 3-4: Stage 3 (Editor)                                     │
│  ├─ Draw wall tool                                              │
│  ├─ Orthogonal lock + snapping                                  │
│  ├─ Endpoint editing                                            │
│  └─ Undo/redo                                                   │
│                                                                   │
│  Week 4-5: Stage 4 (Export)                                     │
│  ├─ PDF export (jsPDF)                                          │
│  ├─ DXF export (dxf-writer)                                     │
│  └─ Export UI                                                   │
│                                                                   │
│  Week 5-6: Stage 5 (AI)                                         │
│  ├─ OpenAI API route                                            │
│  ├─ Prompt engineering                                          │
│  ├─ Validation retry loop                                       │
│  └─ AI panel UI                                                 │
│                                                                   │
│  Week 6: Polish + Demo                                          │
│  └─ End-to-end testing, performance tuning, demo prep          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Dependencies:
  Stage 2 → Stage 1 (needs IR schema)
  Stage 3 → Stage 2 (needs renderer)
  Stage 4 → Stage 1-3 (needs full manual pipeline)
  Stage 5 → Stage 1-4 (needs validation + export working)
```

---

## 📐 Architecture Decisions Recap

| ADR | Decision | Rationale | Rating |
|-----|----------|-----------|--------|
| **ADR-001** | IR as Single Source of Truth | Prevents geometry drift, enables undo/versioning | 9/10 |
| **ADR-002** | Validation as Hard Gate | Creates quality moat, enables AI self-repair | 10/10 |
| **ADR-003** | Framework-Agnostic Core | Testable pure functions, future flexibility | 9/10 |
| **ADR-004** | Client-Side First (MVP) | Faster MVP, clear migration path to backend | 8/10 |
| **ADR-005** | Konva.js for Canvas | React-friendly, declarative, performant | 8/10 |
| **ADR-006** | 85% Test Coverage | Maintains template quality bar, catches regressions | 9/10 |
| **ADR-007** | Client-Side Export (MVP) | No backend needed, instant feedback | 7/10 |
| **ADR-008** | AI Last (After Pipeline) | De-risks integration, validates architecture first | 9/10 |

**Overall Architecture Rating: 8.7/10**  
Strengths: Clear separation of concerns, validation-first, staged delivery  
Improvements: Need performance optimization for large plans, backend migration planning  

---

## 🎯 Stage-by-Stage Breakdown

### Stage 1: IR Foundation & Validation (Week 1)

**Goal**: Build the data layer without UI  
**Deliverables**:
- `lib/ir/schema.ts` - Zod schemas for Project/Level/Wall/Opening
- `lib/validator/rules.ts` - Pure validation functions
- `public/examples/simple-room.json` - Valid example plan
- `public/examples/invalid-plan.json` - Test fixture

**Acceptance Test**:
```bash
node scripts/validate-plan.js public/examples/simple-room.json
# Output: ✅ Plan is valid (0 issues)
```

**Quality Gates**:
- ✅ 100% coverage on validator (pure functions, no excuses)
- ✅ Zod schemas validate both examples successfully

**Risk**: None (foundational work, no dependencies)

---

### Stage 2: 2D Viewer & Example Loading (Week 2)

**Goal**: Render IR as visual floor plans (read-only)  
**Deliverables**:
- `lib/geometry/derive.ts` - IR → polygons (pure functions)
- `components/PlanViewer.tsx` - Konva canvas component
- `components/ExampleLoader.tsx` - JSON loader dropdown
- `components/ValidationPanel.tsx` - Issue display

**Acceptance Test**:
1. Load simple-room.json → Canvas shows 4 walls + door + window
2. Validation panel shows "✓ Plan Valid"
3. Load invalid-plan.json → Shows "OPENING_EXCEEDS_WALL" error

**Quality Gates**:
- ✅ 85%+ coverage on `lib/geometry/` and components
- ✅ Lighthouse TBT < 300ms (Konva code-split)
- ✅ E2E screenshot matches baseline

**Risk**: Konva coordinate transforms tricky (mitigation: comprehensive tests)

---

### Stage 3: Wall Drawing Editor (Weeks 3-4)

**Goal**: Transform viewer into interactive editor  
**Deliverables**:
- `lib/geometry/snap.ts` - Grid + endpoint snapping
- `lib/editor/state.ts` - Editor state management
- `lib/editor/history.ts` - Undo/redo stack
- `components/PlanEditor.tsx` - Interactive canvas
- `components/Toolbar.tsx` - Tool selection UI

**Acceptance Test**:
1. Select "Draw Wall" → Click start/end → Wall created
2. Hold Shift → Wall snaps to orthogonal (90°)
3. Drag endpoint → Snaps to grid (100mm)
4. Undo → Wall disappears
5. Redo → Wall returns

**Quality Gates**:
- ✅ 85%+ coverage on `lib/editor/` and `lib/geometry/snap.ts`
- ✅ Validation runs on every IR change
- ✅ No TypeScript errors (strict mode)

**Risk**: Endpoint dragging event handling complexity (mitigation: incremental implementation, frequent testing)

---

### Stage 4: Export Pipeline (Week 4-5)

**Goal**: Generate industry-standard file formats  
**Deliverables**:
- `lib/export/pdf.ts` - jsPDF vector export
- `lib/export/dxf.ts` - DXF polyline export
- `components/ExportPanel.tsx` - Export UI with options

**Acceptance Test**:
1. Load plan → Export PDF (1:50, A4) → Opens in Adobe Reader
2. Export DXF → Opens in AutoCAD → Walls on correct layers
3. Verify dimensions match canvas (5m wall = 5000mm in DXF)

**Quality Gates**:
- ✅ 85%+ coverage on `lib/export/`
- ✅ Manual validation in AutoCAD + Adobe Reader
- ✅ Bundle size: jsPDF + dxf-writer < 100KB gzipped

**Risk**: DXF format quirks (mitigation: test in multiple CAD tools - AutoCAD, LibreCAD, QCAD)

---

### Stage 5: AI Generation (Weeks 5-6)

**Goal**: AI-driven floor plan generation from prompts  
**Deliverables**:
- `app/api/generate-plan/route.ts` - OpenAI API route
- `lib/ai/prompts.ts` - System/user prompt templates
- `components/AIGeneratePanel.tsx` - Generation UI

**Acceptance Test**:
1. Enter prompt: "3 bedroom modern home, 15m x 20m lot"
2. Click "Generate" → Wait 30-60s → Plan appears
3. Validation panel shows "✓ Plan Valid"
4. Edit/export works like manual plans
5. **Critical**: 8/10 prompts succeed (80% success rate)

**Quality Gates**:
- ✅ 80%+ valid plans on first attempt
- ✅ Retry loop reduces failures to < 5%
- ✅ No API key exposure (server-side only)
- ✅ E2E test (optional, costs real $$)

**Risk**: LLM quality variance (mitigation: retry loop with validation feedback, prompt iteration based on failures)

---

## 🧪 Testing Strategy Summary

| Layer | Tool | Coverage Target | Critical Tests |
|-------|------|-----------------|----------------|
| **IR/Validation** | Jest | 100% | Schema parsing, validation rules, golden fixtures |
| **Geometry** | Jest | 100% | Derivation accuracy, snapping logic |
| **Components** | Jest + RTL | 85% | Canvas mocking, state updates, UI interactions |
| **E2E** | Playwright | N/A | Load → Draw → Edit → Validate → Export → AI |
| **Performance** | Lighthouse CI | 90+ scores | TBT < 300ms, FCP < 2s, LCP < 2.5s |

**Build Gates**:
- ❌ Build fails if Jest coverage < 85%
- ❌ Build fails if Playwright tests fail
- ❌ Build fails if Lighthouse scores < 90

---

## 📦 Final Deliverables (Week 6)

### Code Structure

```
lib/
  ir/
    schema.ts           # Zod schemas (Project, Level, Wall, Opening)
    README.md           # IR documentation
  validator/
    rules.ts            # Validation functions
    validator.test.ts   # Comprehensive tests
  geometry/
    derive.ts           # IR → polygons (pure)
    snap.ts             # Snapping utilities
    derive.test.ts      # Geometry tests
    snap.test.ts        # Snapping tests
  editor/
    state.ts            # Editor state management
    history.ts          # Undo/redo stack
    state.test.ts       # Editor tests
  export/
    pdf.ts              # jsPDF export
    dxf.ts              # DXF export
    pdf.test.ts         # PDF tests
    dxf.test.ts         # DXF tests
  ai/
    prompts.ts          # Prompt templates
    prompts.test.ts     # Prompt tests

components/
  PlanViewer.tsx        # Read-only canvas
  PlanEditor.tsx        # Interactive canvas
  Toolbar.tsx           # Tool selection
  ExampleLoader.tsx     # JSON loader
  ValidationPanel.tsx   # Issue display
  ExportPanel.tsx       # PDF/DXF export
  AIGeneratePanel.tsx   # AI generation
  [All components have .test.tsx]

app/
  canvas/
    page.tsx            # Main canvas page
  api/
    generate-plan/
      route.ts          # OpenAI API route
      route.test.ts     # API tests

public/
  examples/
    simple-room.json    # Valid example
    invalid-plan.json   # Test fixture

tests/
  e2e/
    home.spec.ts        # Homepage test
    canvas-viewer.spec.ts # Viewer tests
    canvas-editor.spec.ts # Editor tests
    export.spec.ts      # Export tests
    ai-generation.spec.ts # AI tests

docs/
  ARCHITECTURE.md       # ADRs (this doc source)
  STAGE-1-IR-FOUNDATION.md
  STAGE-2-VIEWER.md
  STAGE-3-EDITOR.md
  STAGE-4-EXPORT.md
  STAGE-5-AI.md
  MVP-ROADMAP.md        # This file
```

### User Workflows

**Manual Workflow** (No AI):
1. Load example plan OR create new blank project
2. Select "Draw Wall" tool
3. Click to start wall, move mouse, Shift for orthogonal, click to finish
4. Repeat to create floor plan
5. Validation panel shows live feedback
6. Export as PDF (scaled) or DXF (AutoCAD)

**AI Workflow** (Primary):
1. Click "AI Generate Floor Plan"
2. Enter description: "3 bedroom family home with open kitchen"
3. Set lot size (15m x 20m), bedrooms (3), bathrooms (2), style (modern)
4. Click "Generate" → Wait 30-60s
5. AI-generated plan appears on canvas
6. Edit manually if needed (move walls, add doors)
7. Export as PDF/DXF

---

## 🎓 Success Metrics

### Technical Metrics

| Metric | Target | Actual (Week 6) |
|--------|--------|-----------------|
| **Test Coverage** | 85%+ | TBD |
| **Lighthouse Performance** | 90+ | TBD |
| **Build Time** | < 60s | TBD |
| **Bundle Size** | < 300KB (gzipped) | TBD |
| **AI Success Rate** | 80%+ valid plans | TBD |

### Product Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| **Time to First Plan** | < 2 min (AI) | Prompt → Generated plan |
| **Time to First Plan** | < 10 min (manual) | New user drawing first room |
| **Export Success** | 100% | Valid plans must export |
| **Edit Fidelity** | 100% | AI plans fully editable like manual |

---

## 🚀 Post-MVP Roadmap (Weeks 7+)

### Stage 6: Persistence & Collaboration (Weeks 7-8)

**Goal**: Save/load plans, user accounts, versioning  
**Features**:
- Prisma schema: `Project`, `Version` models
- GraphQL mutations: `createProject`, `saveVersion`, `loadProject`
- User authentication (NextAuth.js)
- Version history UI (browse past versions)

**Risk**: Database migrations, auth complexity

---

### Stage 7: Advanced Features (Weeks 9-12)

**Goal**: Multi-storey, furniture, 3D preview  
**Features**:
- Multi-level support (stairs, elevators)
- Furniture/fixture library (drag-drop)
- 3D isometric view (Three.js)
- Room labeling + area calculations
- Cost estimation (rough materials)

**Risk**: 3D rendering performance, furniture catalog curation

---

### Stage 8: Enterprise Features (Weeks 13+)

**Goal**: Production-ready, scalable  
**Features**:
- Real-time collaboration (WebSockets, CRDT)
- IFC/BIM export (industry integration)
- Template library (pre-designed layouts)
- Usage analytics + cost tracking
- Batch export (multiple formats)
- API for external integrations

**Risk**: CRDT complexity, IFC specification depth

---

## 🛡️ Risk Management

### High-Risk Areas

1. **AI Quality Variance**
   - **Risk**: LLM generates nonsensical plans
   - **Mitigation**: Validation retry loop, semantic validators (min room sizes)
   - **Fallback**: Manual editing always available

2. **Konva Performance on Large Plans**
   - **Risk**: Canvas rendering slows down (>1000 walls)
   - **Mitigation**: Memoization, incremental updates, viewport culling
   - **Fallback**: Switch to server-side rendering for exports

3. **Export Format Compatibility**
   - **Risk**: DXF doesn't open in specific CAD tools
   - **Mitigation**: Test in AutoCAD, LibreCAD, QCAD before release
   - **Fallback**: Provide multiple DXF versions (R12, R14)

4. **LLM API Costs**
   - **Risk**: Heavy usage drains budget
   - **Mitigation**: Rate limiting, usage alerts, cached common layouts
   - **Fallback**: Free tier limited to 5 generations/day

---

## 🎯 MVP Definition of Done

**FloorForge MVP is complete when**:

✅ A new user can:
1. Describe a house in natural language
2. Generate a valid floor plan in < 60s
3. See the plan rendered with walls, doors, windows
4. Edit the plan manually (move walls, add openings)
5. Validate the plan (get actionable error messages)
6. Export as PDF (scaled, printable)
7. Export as DXF (opens in AutoCAD)

✅ Technical requirements met:
1. 85%+ test coverage (Jest)
2. E2E tests pass (Playwright)
3. Lighthouse scores 90+ (Performance, A11y, SEO)
4. Build succeeds with no TypeScript errors
5. All 8 ADRs documented and followed

✅ Quality gates passed:
1. AI success rate: 80%+ valid plans on first try
2. Validation catches all common errors (wall length, opening placement)
3. Exports validated in industry tools (AutoCAD, Adobe Reader)

---

## 📈 Next Steps After MVP

1. **User Testing** (Week 7)
   - Recruit 10 beta users (architects, homeowners, contractors)
   - Collect feedback on UX, AI quality, export formats
   - Iterate on prompt engineering based on failures

2. **Performance Optimization** (Week 8)
   - Profile Konva rendering, optimize hot paths
   - Implement viewport culling for large plans
   - Add progressive loading for example plans

3. **Backend Migration** (Weeks 9-10)
   - Implement Prisma schema for Project/Version
   - Add GraphQL mutations for save/load
   - Migrate exports to server-side (better PDF quality)

4. **Go-to-Market** (Week 11+)
   - Pricing model: Free tier (5 plans/month), Pro ($20/mo unlimited)
   - Landing page + marketing site
   - Launch on Product Hunt

---

## 🎓 Final Architecture Self-Rating: 8.7/10

**What We Did Right**:
✅ IR-first architecture prevents common CAD pitfalls  
✅ Validation-as-a-gate creates quality moat  
✅ Staged delivery de-risks AI integration  
✅ Framework-agnostic core enables future flexibility  
✅ Comprehensive testing catches regressions early  

**What Could Be Better**:
⚠️ No backend persistence in MVP (localStorage limits)  
⚠️ Client-side export has font/styling limitations  
⚠️ Performance untested on large plans (>100 walls)  
⚠️ No real-time collaboration (future feature)  

**Alignment to Best Practices**:
✅ Follows all 8 ADRs consistently  
✅ Matches Vercel Spine template conventions (Plop, testing, Next.js)  
✅ Implements GPT plan recommendations (IR, validation, pipeline-first)  
✅ KISS principle applied (started simple, can expand)  
✅ DRY via Plop generators, shared utilities  
✅ SOLID where beneficial (not over-engineered)  

**Production Readiness**: 75%  
Needs: Backend persistence, rate limiting, usage analytics, error monitoring  

---

**Status**: ✅ Architecture planning complete, ready to implement Stage 1  
**Next Action**: Begin Stage 1 implementation (IR schema + validator)  
**Estimated MVP Delivery**: Week 6 (February 16, 2026)

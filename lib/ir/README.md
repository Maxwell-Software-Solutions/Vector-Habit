# FloorForge IR (Intermediate Representation)

The IR is the **single source of truth** for all floor plan data in FloorForge. All manipulations (AI-generated, manual edits, exports) operate on this canonical data structure.

## Design Philosophy

### Why IR-First? (ADR-001)

```
Canvas Rendering ← IR → AI Generation
                   ↑
            Export (PDF/DXF)
```

**Benefits**:

- **Versioning**: Git-friendly JSON format
- **Validation**: Run strict checks on every change (hard gate)
- **Testing**: Pure data transformations (no canvas mocking)
- **AI Integration**: LLMs generate/modify structured JSON
- **Export**: Direct mapping to CAD formats (DXF), print (PDF)

## Schema Overview

All entities defined using [Zod](https://zod.dev/) for runtime + compile-time validation.

### Units

**All dimensions are in millimeters (mm)**. This avoids floating-point issues and matches architectural conventions (100mm = 1 decimeter).

### Entity Hierarchy

```
Project (p1, p2, ...)
 └─ Level[] (l1, l2, ...)
     ├─ Wall[] (w1, w2, ...)
     └─ Opening[] (o1, o2, ...)
```

### ID Conventions

- **Project**: `p[0-9]+` (e.g., `p1`, `p2`)
- **Level**: `l[0-9]+` (e.g., `l1`, `l2`)
- **Wall**: `w[0-9]+` (e.g., `w1`, `w10`)
- **Opening**: `o[0-9]+` (e.g., `o1`, `o25`)

IDs must be unique **across the entire project** (enforced by validator).

## Types

### Point

```typescript
{
  x: number; // Integer millimeters
  y: number; // Integer millimeters
}
```

**Coordinate system**: Origin (0,0) at top-left, X increases right, Y increases down (matches HTML Canvas).

### Wall

```typescript
{
  id: string; // w[0-9]+
  a: Point; // Start point
  b: Point; // End point
  thicknessMm: number; // 100-500mm (interior: 100-200, exterior: 200-300)
  heightMm: number; // 1800-4000mm (default: 2700mm)
}
```

**Constraints**:

- Length must be ≥ 100mm (enforced by validator)
- Walls < 500mm trigger warning (unusual but valid)
- Thickness 100-500mm (Zod schema enforces)

### Opening

```typescript
{
  id: string; // o[0-9]+
  wallId: string; // Reference to Wall.id
  type: 'door' | 'window';
  offsetMm: number; // Distance from wall.a along wall vector
  widthMm: number; // 600-3000mm
  heightMm: number;
  sillHeightMm: number; // Floor to bottom of opening (0 for doors)
}
```

**Positioning**: `offsetMm` is measured from `wall.a` along the wall vector. Opening spans from `[offsetMm, offsetMm + widthMm]`.

**Type-specific constraints**:

- **Door**: `widthMm >= 700`, `heightMm >= 1800`, `sillHeightMm === 0`
- **Window**: `widthMm >= 600`, `sillHeightMm >= 600`

### Level

```typescript
{
  id: string; // l[0-9]+
  name: string; // "Ground Floor", "First Floor", etc.
  walls: Wall[];
  openings: Opening[];
}
```

**MVP scope**: Single-level only (future: multi-storey).

### Project

```typescript
{
  id: string; // p[0-9]+
  name: string; // User-provided project name
  units: 'mm'; // Only millimeters in MVP
  levels: Level[]; // Min 1 level required
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}
```

## Helper Functions

### `createEmptyProject(name: string): Project`

Creates a new project with:

- Auto-generated ID (`p<timestamp>`)
- One empty level (`l1`)
- Current timestamp
- No walls/openings

**Usage**:

```typescript
const project = createEmptyProject('My House');
// Ready to add walls via manual editing or AI generation
```

### `validateProjectSchema(data: unknown): Project`

Parses and validates raw data against the Zod schema. **Throws `ZodError`** if invalid.

**Usage**:

```typescript
const json = await fs.readFile('plan.json', 'utf-8');
const data = JSON.parse(json);
const project = validateProjectSchema(data); // Throws if invalid
```

### `safeValidateProjectSchema(data: unknown): SafeParseReturnType<unknown, Project>`

Non-throwing version that returns `{success: true, data: Project}` or `{success: false, error: ZodError}`.

**Usage**:

```typescript
const result = safeValidateProjectSchema(data);
if (result.success) {
  console.log('Valid project:', result.data);
} else {
  console.error('Validation errors:', result.error.issues);
}
```

## Validation

Schema validation (Zod) checks:

- ✅ Required fields present
- ✅ Correct data types
- ✅ ID format matches regex
- ✅ Numeric constraints (thickness 100-500mm, etc.)

**Architectural validation** (lib/validator/rules.ts) checks:

- ✅ Walls long enough (>= 100mm)
- ✅ Openings fit within walls
- ✅ Opening dimensions reasonable for type
- ✅ No duplicate IDs
- ✅ No overlapping openings on same wall
- ⚠️ Levels have at least one wall (warning)

See [lib/validator/README.md](../validator/README.md) for details.

## File Format

Projects are stored as JSON files:

```json
{
  "id": "p1",
  "name": "Simple Room",
  "units": "mm",
  "levels": [
    {
      "id": "l1",
      "name": "Ground Floor",
      "walls": [
        {
          "id": "w1",
          "a": { "x": 0, "y": 0 },
          "b": { "x": 5000, "y": 0 },
          "thicknessMm": 200,
          "heightMm": 2700
        }
      ],
      "openings": [
        {
          "id": "o1",
          "wallId": "w1",
          "type": "door",
          "offsetMm": 2000,
          "widthMm": 900,
          "heightMm": 2100,
          "sillHeightMm": 0
        }
      ]
    }
  ],
  "createdAt": "2026-01-05T10:00:00Z",
  "updatedAt": "2026-01-05T10:00:00Z"
}
```

**Best practices**:

- Indent with 2 spaces (standard JSON formatting)
- Use descriptive names (`"Three Bedroom House"` not `"Project 1"`)
- Keep wall IDs sequential (w1, w2, w3) for readability
- Store in `public/examples/` for sharing/testing

## Examples

See [public/examples/](../../public/examples/) for:

- `simple-room.json` - Basic 5m x 4m room (golden fixture)
- `three-bedroom-house.json` - Complex multi-room plan

## Future Extensions (Post-MVP)

### Multi-Level Support

```typescript
levels: [
  { id: 'l1', name: 'Ground Floor', ... },
  { id: 'l2', name: 'First Floor', ... },
]
```

### Additional Opening Types

```typescript
type: 'door' | 'window' | 'sliding-door' | 'french-door' | 'skylight';
```

### Furniture/Fixtures

```typescript
furniture: [
  {
    id: 'f1',
    type: 'bed' | 'table' | 'toilet',
    position: Point,
    rotation: number, // Degrees
    dimensions: { width: number, depth: number, height: number },
  },
];
```

### Materials

```typescript
wall: {
  ...existingFields,
  material: 'brick' | 'concrete' | 'timber-frame',
  finish: 'painted' | 'wallpaper' | 'tiled'
}
```

## References

- **ADR-001**: IR as Single Source of Truth ([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md))
- **ADR-002**: Validation as Hard Gate
- **Stage 1 Implementation**: [docs/STAGE-1-IR-FOUNDATION.md](../../docs/STAGE-1-IR-FOUNDATION.md)
- **Zod Documentation**: https://zod.dev/

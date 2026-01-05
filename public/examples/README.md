# FloorForge Example Plans

This directory contains example floor plans in JSON format for testing and demonstration purposes.

## Files

### simple-room.json

A basic rectangular room (5m x 4m) with:

- 4 exterior walls (200mm thick)
- 1 door on the front wall
- 1 window on the right wall
- **Status**: ✅ Valid (passes all validation)

**Use case**: Testing basic rendering, validator baseline, first-time user tutorial

### invalid-plan.json

A deliberately invalid floor plan demonstrating validation errors:

- 1 short wall (2m)
- 1 door that exceeds the wall length
- **Status**: ❌ Invalid (OPENING_EXCEEDS_WALL error)

**Use case**: Testing validator error detection, AI self-repair testing

### three-bedroom-house.json

A more complex residential floor plan (12m x 9m) with:

- Exterior walls (250mm thick)
- Interior partition walls (200mm thick)
- Multiple rooms (living, kitchen, 3 bedrooms, bathroom)
- 4 doors (interior and exterior)
- 3 windows
- **Status**: ✅ Valid

**Use case**: Testing geometry derivation complexity, realistic AI target, export testing

## JSON Schema

All example files conform to the `ProjectSchema` defined in `lib/ir/schema.ts`.

Required structure:

```json
{
  "id": "p1",                    // Project ID (p1, p2, etc.)
  "name": "Project Name",
  "units": "mm",                 // Only "mm" supported in MVP
  "levels": [{
    "id": "l1",                  // Level ID (l1, l2, etc.)
    "name": "Ground Floor",
    "walls": [...],              // Array of Wall objects
    "openings": [...]            // Array of Opening objects
  }],
  "createdAt": "2026-01-05T10:00:00Z",  // ISO 8601 timestamp
  "updatedAt": "2026-01-05T10:00:00Z"
}
```

## Validation

To validate an example plan:

```bash
# Using the validator (once tests are implemented)
pnpm test lib/validator/rules.test.ts

# Or programmatically:
import { validateProjectSchema } from '@/lib/ir/schema';
import { validateProject } from '@/lib/validator/rules';

const data = await fetch('/examples/simple-room.json').then(r => r.json());
const project = validateProjectSchema(data); // Throws if schema invalid
const issues = validateProject(project);     // Returns array of issues

if (issues.length === 0) {
  console.log('✅ Plan is valid');
} else {
  console.log('❌ Plan has issues:', issues);
}
```

## Adding New Examples

When creating new example plans:

1. Follow the `ProjectSchema` structure exactly
2. Use sequential IDs (w1, w2, w3 for walls; o1, o2 for openings)
3. All dimensions in millimeters
4. Validate with `validateProjectSchema()` and `validateProject()`
5. Add description to this README

## Common Dimensions Reference

### Walls

- Interior walls: 100-200mm thickness
- Exterior walls: 200-300mm thickness
- Standard height: 2700mm (2.7m ceiling)

### Doors

- Interior door: 900mm wide, 2100mm high
- Exterior door: 1000mm wide, 2100mm high
- Minimum width: 700mm (accessibility)

### Windows

- Typical width: 1200-1800mm
- Typical height: 1200-1500mm
- Standard sill height: 900mm from floor

### Rooms (Minimum Sizes)

- Bedroom: 9m² (3000mm x 3000mm)
- Bathroom: 4m² (2000mm x 2000mm)
- Kitchen: 6m² (2000mm x 3000mm)
- Living room: 12m² (3000mm x 4000mm)

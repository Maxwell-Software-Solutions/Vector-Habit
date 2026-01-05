# FloorForge Validation Engine

Pure validation functions that run on **every IR change**. Validators catch common architectural/geometric errors before they corrupt the data model or cause rendering issues.

## Design Philosophy (ADR-002: Validation as Hard Gate)

```
User Edit → Validate → Valid? → Update IR → Re-render
                          ↓
                         Invalid → Show Errors → Block Change
```

**Hard gate approach**: Invalid changes are **blocked**, not silently corrected. This prevents cascading errors and makes the system predictable.

## Validation Severity

### Error (Blocking)

Changes that would create **structurally invalid** or **physically impossible** floor plans:

- Wall too short (< 100mm)
- Opening exceeds wall length
- Duplicate IDs
- Door narrower than accessibility minimum (700mm)
- Openings overlap on same wall

**Behavior**: Edit is rejected, error shown to user (or AI agent for self-repair).

### Warning (Non-blocking)

Unusual but technically valid configurations:

- Wall shorter than 500mm (valid but uncommon)
- Empty level (no walls yet)

**Behavior**: Change is allowed, warning logged for user review.

## Validators

### `validateWallLength(wall: Wall): ValidationIssue[]`

**Checks**:

- ✅ Length >= 100mm (error if shorter)
- ⚠️ Length >= 500mm (warning if 100-500mm)

**Error codes**:

- `WALL_TOO_SHORT` - Length < 100mm (suggests deletion)
- `WALL_UNUSUALLY_SHORT` - Length < 500mm

**Example**:

```typescript
const wall = { id: 'w1', a: {x: 0, y: 0}, b: {x: 50, y: 0}, ... };
const issues = validateWallLength(wall);
// [{
//   code: 'WALL_TOO_SHORT',
//   severity: 'error',
//   message: 'Wall w1 length 50mm is below minimum 100mm',
//   entityId: 'w1',
//   suggestedFix: { action: 'delete', reason: 'Wall too short...' }
// }]
```

### `validateOpeningFitsWall(opening: Opening, walls: Wall[]): ValidationIssue[]`

**Checks**:

- ✅ Referenced wall exists
- ✅ Opening fits within wall bounds (`offsetMm + widthMm <= wallLength`)

**Error codes**:

- `WALL_NOT_FOUND` - Opening references non-existent wall
- `OPENING_EXCEEDS_WALL` - Opening extends past wall end

**Positioning logic**:

```
Wall: [====================================] (5000mm)
      ↑                    ↑
      a (0mm)              offsetMm=2000mm
                           [Door: 900mm wide]
                           End: 2000 + 900 = 2900mm ✓ (fits)
```

### `validateOpeningDimensions(opening: Opening): ValidationIssue[]`

**Checks (type-specific)**:

**Doors**:

- ✅ Width >= 700mm (accessibility minimum)
- ✅ Height >= 1800mm (standard minimum)
- ✅ Sill height === 0mm (doors have no sill)

**Windows**:

- ✅ Sill height >= 600mm (safety/code compliance)

**Error codes**:

- `DOOR_TOO_NARROW`
- `DOOR_TOO_SHORT`
- `DOOR_INVALID_SILL`
- `WINDOW_SILL_TOO_LOW`

### `validateUniqueIds(project: Project): ValidationIssue[]`

**Checks**:

- ✅ No duplicate level IDs across project
- ✅ No duplicate wall IDs across all levels
- ✅ No duplicate opening IDs across all levels

**Error codes**:

- `DUPLICATE_LEVEL_ID`
- `DUPLICATE_WALL_ID`
- `DUPLICATE_OPENING_ID`

**Why this matters**: IDs are used for canvas selection, AI editing ("modify door o3"), and export references.

### `validateLevelHasWalls(level: Level): ValidationIssue[]`

**Checks**:

- ⚠️ Level has at least one wall (warning only)

**Error codes**:

- `EMPTY_LEVEL`

**Rationale**: Empty levels are valid during construction (user hasn't added walls yet) but worth flagging.

### `validateOpeningsNoOverlap(level: Level): ValidationIssue[]`

**Checks**:

- ✅ Openings on same wall don't overlap

**Overlap logic**:

```
Wall: [====================================]
      [Door 1: 500-1400mm]
                      [Door 2: 1400-2300mm] ✓ Adjacent OK
                  [Door 3: 1200-2100mm] ✗ Overlaps Door 1
```

**Error codes**:

- `OPENINGS_OVERLAP`

### `validateProject(project: Project): ValidationIssue[]`

**Main entry point** - runs all validators and returns aggregated issues.

**Usage**:

```typescript
import { validateProject, hasErrors } from '@/lib/validator/rules';

const issues = validateProject(project);

if (hasErrors(issues)) {
  console.error('Cannot save project:', getErrors(issues));
  // Block save, show UI errors
} else {
  console.warn('Warnings:', getWarnings(issues));
  // Allow save, log warnings
}
```

## ValidationIssue Structure

```typescript
{
  code: string; // Machine-readable (WALL_TOO_SHORT, DOOR_TOO_NARROW)
  severity: 'error' | 'warning';
  message: string; // Human-readable ("Door o1 width 600mm is below minimum 700mm")
  entityId: string; // ID of problematic entity (w1, o2, l1)
  suggestedFix?: any; // Optional: Auto-repair suggestion for AI
}
```

### AI Self-Repair

The `suggestedFix` field enables **AI auto-correction**:

```typescript
// AI generates invalid door
const door = { id: 'o1', widthMm: 600, ... };

// Validator catches error
const issues = validateOpeningDimensions(door);
// [{
//   code: 'DOOR_TOO_NARROW',
//   suggestedFix: { widthMm: 700 } // ← AI can apply this automatically
// }]

// AI self-repairs
Object.assign(door, issues[0].suggestedFix);
// door.widthMm is now 700
```

**When to use**:

- Simple numeric adjustments (width, offset)
- Deletions (`suggestedFix: { action: 'delete' }`)

**When NOT to use**:

- Complex geometric changes (wall repositioning)
- User intent unclear (which opening to move?)

## Helper Functions

### `hasErrors(issues: ValidationIssue[]): boolean`

Returns `true` if any issue has `severity === 'error'`.

### `getErrors(issues: ValidationIssue[]): ValidationIssue[]`

Filters to only errors.

### `getWarnings(issues: ValidationIssue[]): ValidationIssue[]`

Filters to only warnings.

## Testing

All validators have **100% test coverage** (see [rules.test.ts](./rules.test.ts)).

**Test categories**:

1. **Unit tests**: Each validator in isolation
2. **Integration tests**: `validateProject()` with example fixtures
3. **Edge cases**: Adjacent openings, zero-length walls, empty projects

**Golden fixtures** (used for validation benchmarks):

- `public/examples/simple-room.json` - Valid baseline
- `public/examples/invalid-plan.json` - Opening exceeds wall (tests error detection)

## Adding New Validators

1. **Define error codes** (use SCREAMING_SNAKE_CASE)
2. **Write pure function** (no side effects, returns `ValidationIssue[]`)
3. **Add to `validateProject()`** in appropriate section
4. **Write comprehensive tests** (test valid, invalid, and edge cases)
5. **Update this README** with validator documentation

**Example**:

```typescript
export function validateWallsFormClosedLoop(level: Level): ValidationIssue[] {
  // Check if walls form closed perimeter
  const gaps = detectWallGaps(level.walls);

  if (gaps.length > 0) {
    return gaps.map((gap) => ({
      code: 'WALL_GAP_DETECTED',
      severity: 'warning',
      message: `Gap detected at (${gap.x}, ${gap.y})`,
      entityId: gap.nearestWallId,
      suggestedFix: { action: 'connect', wallIds: gap.wallPair },
    }));
  }

  return [];
}

// Add to validateProject():
project.levels.forEach((level) => {
  issues.push(...validateWallsFormClosedLoop(level));
});
```

## Performance Considerations

All validators are **O(n)** or **O(n log n)** (opening overlap uses sorting).

**Optimization strategies**:

- Validators run **only on changed entities** (future: incremental validation)
- Geometric calculations cached (future: memoization)
- Early returns for common cases (e.g., valid dimensions)

**Current performance** (on typical 3-bedroom house):

- `validateProject()`: < 5ms
- Re-validation on every keystroke is feasible

## Future Validators (Post-MVP)

### Geometry Validation

- `validateWallsFormClosedLoop` - Check perimeter closure
- `validateWallIntersections` - Detect overlapping walls
- `validateWallAngles` - Warn on very acute angles (< 30°)

### Building Code Compliance

- `validateEgressRequirements` - Min door width for escape routes
- `validateMinimumRoomSizes` - Bedrooms >= 9m², etc.
- `validateFireSafety` - Max travel distance to exits

### Accessibility (ADA/UK Building Regs)

- `validateDoorClearances` - Min 800mm for wheelchairs
- `validateCorridorWidth` - Min 1200mm for accessible routes

### Material Constraints

- `validateStructuralLoads` - Wall thickness sufficient for height
- `validateSpanLimits` - Max distance between load-bearing walls

## References

- **ADR-002**: Validation as Hard Gate ([docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md))
- **Stage 1 Implementation**: [docs/STAGE-1-IR-FOUNDATION.md](../../docs/STAGE-1-IR-FOUNDATION.md))
- **IR Schema**: [lib/ir/README.md](../ir/README.md)

# Stage 3 Implementation Plan: User Interaction Layer

**Goal**: Transform read-only viewer into interactive editor with wall drawing, opening placement, and undo/redo.

---

## 📋 Deliverables

### 1. Wall Drawing Tool

- [ ] Click-to-place wall endpoints
- [ ] Live preview while drawing
- [ ] Snap-to-grid (1000mm increments)
- [ ] Wall thickness input
- [ ] Cancel drawing (Escape key)

### 2. Opening Placement

- [ ] Click wall to add door/window
- [ ] Opening type selector (door/window)
- [ ] Width input
- [ ] Drag to reposition along wall
- [ ] Delete with keyboard (Delete/Backspace)

### 3. Selection & Properties Panel

- [ ] Click to select walls/openings
- [ ] Visual selection indicator (highlight/outline)
- [ ] Properties panel showing:
  - Wall: ID, start/end points, thickness, length
  - Opening: ID, type, width, offset, parent wall
- [ ] Edit properties inline
- [ ] Apply changes to IR

### 4. Undo/Redo System

- [ ] Command pattern implementation
- [ ] History stack (max 50 actions)
- [ ] Keyboard shortcuts:
  - Ctrl+Z: Undo
  - Ctrl+Shift+Z or Ctrl+Y: Redo
- [ ] Commands for: AddWall, RemoveWall, AddOpening, RemoveOpening, UpdateProperties

### 5. State Management

- [ ] React Context or Zustand store
- [ ] Current tool state (select, draw-wall, add-door, add-window)
- [ ] Selected element tracking
- [ ] IR project state (mutable)
- [ ] Command history state

---

## 🏗️ Architecture

### File Structure

```
lib/
  commands/               # Command pattern for undo/redo
    Command.ts           # Abstract command interface
    AddWallCommand.ts
    RemoveWallCommand.ts
    AddOpeningCommand.ts
    RemoveOpeningCommand.ts
    UpdatePropertiesCommand.ts
    CommandHistory.ts    # History manager

  store/                 # State management
    editorStore.ts       # Zustand store or Context
    types.ts             # Store types

components/
  FloorPlanEditor.tsx    # Main editor (replaces FloorPlanViewer)
  Toolbar.tsx            # Tool selection (select, wall, door, window)
  PropertiesPanel.tsx    # Show/edit selected element
  Canvas/
    InteractiveCanvas.tsx   # Canvas with event handlers
    WallDrawingOverlay.tsx  # Preview while drawing
    SelectionOverlay.tsx    # Highlight selected elements
```

### State Flow

```
User Action → Event Handler → Command → Execute → Update IR → Re-render
                                  ↓
                              History Stack (for undo)
```

### Command Pattern

```typescript
interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
  description: string;
}

class AddWallCommand implements Command {
  constructor(
    private wall: Wall,
    private project: Project
  ) {}

  execute() {
    this.project.levels[0].walls.push(this.wall);
  }

  undo() {
    const index = this.project.levels[0].walls.findIndex((w) => w.id === this.wall.id);
    this.project.levels[0].walls.splice(index, 1);
  }

  redo() {
    this.execute();
  }
}
```

---

## 🎯 Implementation Steps

### Phase 1: State Management (Priority: HIGH)

1. Create Zustand store for editor state
2. Define editor modes (select, draw-wall, add-door, add-window)
3. Track selected element
4. Mutable IR project state

### Phase 2: Command System (Priority: HIGH)

1. Implement Command interface
2. Create concrete commands (AddWall, RemoveWall, etc.)
3. Build CommandHistory with undo/redo
4. Keyboard shortcuts handler

### Phase 3: Interactive Canvas (Priority: HIGH)

1. Convert FloorPlanViewer to FloorPlanEditor
2. Add mouse event handlers (click, move, down, up)
3. Implement selection logic (ray casting to find clicked element)
4. Visual feedback for selection

### Phase 4: Wall Drawing Tool (Priority: HIGH)

1. Click to place start point
2. Live preview line following cursor
3. Snap-to-grid logic (round to 1000mm)
4. Click to place end point → create wall
5. Escape to cancel

### Phase 5: Opening Placement (Priority: MEDIUM)

1. Click wall detection (point-to-line distance)
2. Calculate offset along wall
3. Create opening at click position
4. Drag to reposition (update offset)

### Phase 6: Properties Panel (Priority: MEDIUM)

1. Display selected element data
2. Editable inputs for properties
3. Apply changes via UpdatePropertiesCommand
4. Validation (e.g., opening must fit on wall)

### Phase 7: Toolbar & UI (Priority: MEDIUM)

1. Tool buttons (select, wall, door, window)
2. Active tool indicator
3. Instructions text (e.g., "Click to place wall start point")

### Phase 8: Testing (Priority: HIGH)

1. Unit tests for commands
2. Unit tests for store
3. Integration tests for interactions
4. E2E tests with Playwright

---

## 📏 Technical Specifications

### Grid Snapping

```typescript
function snapToGrid(point: Point, gridSize: number = 1000): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}
```

### Wall Click Detection

```typescript
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  // Calculate perpendicular distance from point to line segment
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}
```

### Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        commandHistory.redo();
      } else {
        commandHistory.undo();
      }
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      commandHistory.redo();
    } else if (e.key === 'Escape') {
      cancelCurrentAction();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedElement) deleteSelected();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedElement]);
```

---

## 🎨 UI/UX Considerations

### Visual Feedback

- **Selected element**: Blue outline + control handles
- **Hovered element**: Subtle highlight (opacity change)
- **Drawing preview**: Dashed line from start point to cursor
- **Snap indicator**: Small circle at snapped grid point
- **Tool cursor**: Custom cursor for each tool (crosshair for draw, pointer for select)

### Instructions

Display context-sensitive instructions:

- Select tool: "Click an element to select"
- Wall tool: "Click to place wall start point" → "Click to place wall end point"
- Door/Window tool: "Click a wall to place opening"

### Error Handling

- Wall too short (< 500mm): Show error toast
- Opening doesn't fit on wall: Show error toast
- Invalid property value: Red border on input

---

## 🧪 Testing Strategy

### Unit Tests

- `CommandHistory.test.ts`: Undo/redo logic, history limits
- `AddWallCommand.test.ts`: Command execution/undo
- `snapToGrid.test.ts`: Grid snapping accuracy
- `pointToLineDistance.test.ts`: Wall click detection

### Integration Tests

- `FloorPlanEditor.test.tsx`: Tool switching, selection
- `WallDrawing.test.tsx`: Full wall drawing flow
- `OpeningPlacement.test.tsx`: Opening creation and drag

### E2E Tests (Playwright)

- `editor-interaction.spec.ts`:
  - Draw a wall
  - Add a door to the wall
  - Select and edit wall properties
  - Undo/redo operations
  - Delete elements

---

## 📊 Success Criteria

- [ ] Can draw walls by clicking two points
- [ ] Walls snap to 1m grid
- [ ] Can add doors and windows to walls
- [ ] Can select and view element properties
- [ ] Can edit properties (thickness, width, etc.)
- [ ] Undo/redo works for all actions
- [ ] Keyboard shortcuts functional
- [ ] No IR validation errors after edits
- [ ] All tests passing (unit + integration + E2E)
- [ ] Coverage ≥ 85%

---

## 🚀 Estimated Effort

- **Phase 1-2 (State + Commands)**: ~2-3 hours
- **Phase 3-4 (Canvas + Wall Drawing)**: ~3-4 hours
- **Phase 5-6 (Openings + Properties)**: ~2-3 hours
- **Phase 7-8 (UI + Tests)**: ~2-3 hours

**Total**: ~9-13 hours of development

---

## 📝 Notes

- Keep IR schema immutable (always clone before mutating)
- Use `cuid2` for generating new element IDs
- Validate after each command execution
- Consider performance: debounce property changes, throttle live preview
- Accessibility: keyboard-only workflow should be possible

---

**Next Step**: Start with Phase 1 - Create Zustand store for editor state

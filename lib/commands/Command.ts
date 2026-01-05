/**
 * Command Pattern Interface
 *
 * Base interface for implementing undo/redo functionality.
 * Each command encapsulates a reversible action on the floor plan.
 */

/**
 * Abstract command interface
 *
 * All commands must implement execute, undo, and redo methods.
 */
export interface Command {
  /**
   * Execute the command (make the change)
   */
  execute(): void;

  /**
   * Undo the command (revert the change)
   */
  undo(): void;

  /**
   * Redo the command (reapply after undo)
   * Default implementation calls execute()
   */
  redo(): void;

  /**
   * Human-readable description for UI (e.g., "Add Wall", "Delete Door")
   */
  description: string;

  /**
   * Timestamp when command was created
   */
  timestamp: number;
}

/**
 * Abstract base class for commands
 *
 * Provides default redo implementation and timestamp.
 */
export abstract class BaseCommand implements Command {
  public readonly timestamp: number;

  constructor() {
    this.timestamp = Date.now();
  }

  abstract execute(): void;
  abstract undo(): void;
  abstract description: string;

  /**
   * Default redo behavior: re-execute the command
   */
  redo(): void {
    this.execute();
  }
}

/**
 * Command History Manager
 *
 * Manages undo/redo stack with configurable history limit.
 * Follows command pattern for reversible operations.
 */

import type { Command } from './Command';

/**
 * Maximum number of commands to keep in history
 */
const MAX_HISTORY_SIZE = 50;

/**
 * Command history manager for undo/redo functionality
 */
export class CommandHistory {
  private history: Command[] = [];
  private currentIndex: number = -1;
  private maxSize: number;

  constructor(maxSize: number = MAX_HISTORY_SIZE) {
    this.maxSize = maxSize;
  }

  /**
   * Execute a command and add it to history
   *
   * Clears any commands after current index (redo stack).
   * Limits history size to maxSize.
   */
  execute(command: Command): void {
    // Execute the command
    command.execute();

    // Remove any commands after current index (clear redo stack)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add command to history
    this.history.push(command);

    // Limit history size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Undo the last command
   *
   * @returns true if undo was performed, false if nothing to undo
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.history[this.currentIndex];
    command.undo();
    this.currentIndex--;
    return true;
  }

  /**
   * Redo the next command
   *
   * @returns true if redo was performed, false if nothing to redo
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    command.redo();
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get the command that would be undone
   */
  getUndoCommand(): Command | null {
    return this.canUndo() ? this.history[this.currentIndex] : null;
  }

  /**
   * Get the command that would be redone
   */
  getRedoCommand(): Command | null {
    return this.canRedo() ? this.history[this.currentIndex + 1] : null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get full history (for debugging)
   */
  getHistory(): readonly Command[] {
    return this.history;
  }

  /**
   * Get current position in history
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get history size
   */
  size(): number {
    return this.history.length;
  }
}

/**
 * Global singleton instance (can be replaced in tests)
 */
export const commandHistory = new CommandHistory();

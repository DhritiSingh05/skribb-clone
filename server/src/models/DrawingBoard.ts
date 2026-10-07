import { StrokeAction } from '../types';

export class DrawingBoard {
  private actions: StrokeAction[] = [];
  private undoStack: StrokeAction[] = [];

  constructor() {
    this.actions = [];
    this.undoStack = [];
  }

  public addAction(action: StrokeAction): void {
    this.actions.push(action);
    // When a new action is performed, clear the redo/undo scratch
    this.undoStack = [];
  }

  public undo(): StrokeAction | null {
    if (this.actions.length === 0) return null;
    const removed = this.actions.pop();
    if (removed) {
      this.undoStack.push(removed);
      return removed;
    }
    return null;
  }

  public clear(): void {
    this.actions = [];
    this.undoStack = [];
  }

  public getActions(): StrokeAction[] {
    return [...this.actions];
  }

  public getActionsCount(): number {
    return this.actions.length;
  }

  public reset(): void {
    this.clear();
  }
}

export type ActionButton = "jump" | "throw";

export interface InputState {
  /** -1 (left), 0 (idle), 1 (right). */
  moveX: number;
  jumpQueued: boolean;
  throwQueued: boolean;
}

export function createInputState(): InputState {
  return { moveX: 0, jumpQueued: false, throwQueued: false };
}

export function setAxis(state: InputState, value: number): void {
  state.moveX = Math.max(-1, Math.min(1, value));
}

export function press(state: InputState, button: ActionButton): void {
  if (button === "jump") state.jumpQueued = true;
  else state.throwQueued = true;
}

/** Returns whether the action was queued, and clears the queue (edge-trigger). */
export function consumePress(state: InputState, button: ActionButton): boolean {
  if (button === "jump") {
    const was = state.jumpQueued;
    state.jumpQueued = false;
    return was;
  }
  const was = state.throwQueued;
  state.throwQueued = false;
  return was;
}

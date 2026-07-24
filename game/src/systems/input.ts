export type ActionButton = "jump" | "throw" | "magic";

export interface InputState {
  /** -1 (left), 0 (idle), 1 (right). */
  moveX: number;
  /** Held: crouch / aim-down. */
  crouch: boolean;
  /** Held: aim-up. */
  aimUp: boolean;
  jumpQueued: boolean;
  throwQueued: boolean;
  magicQueued: boolean;
}

export function createInputState(): InputState {
  return { moveX: 0, crouch: false, aimUp: false, jumpQueued: false, throwQueued: false, magicQueued: false };
}

export function setAxis(state: InputState, value: number): void {
  state.moveX = Math.max(-1, Math.min(1, value));
}

export function setCrouch(state: InputState, held: boolean): void { state.crouch = held; }
export function setAimUp(state: InputState, held: boolean): void { state.aimUp = held; }

export function press(state: InputState, button: ActionButton): void {
  if (button === "jump") state.jumpQueued = true;
  else if (button === "throw") state.throwQueued = true;
  else state.magicQueued = true;
}

/** Returns whether the action was queued, and clears the queue (edge-trigger). */
export function consumePress(state: InputState, button: ActionButton): boolean {
  if (button === "jump") { const was = state.jumpQueued; state.jumpQueued = false; return was; }
  if (button === "throw") { const was = state.throwQueued; state.throwQueued = false; return was; }
  const was = state.magicQueued; state.magicQueued = false; return was;
}

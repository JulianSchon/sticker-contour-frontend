import type { KAPLAYCtx } from "kaplay";

/**
 * Wire a single "continue/proceed" action to keyboard (space), mouse click,
 * and touch. Guards against the synthetic mouse event that follows a real
 * touch on mobile, so the callback fires at most once per scene instance.
 */
export function onAnyProceed(k: KAPLAYCtx, cb: () => void): void {
  let fired = false;
  const once = () => {
    if (fired) return;
    fired = true;
    cb();
  };
  k.onKeyPress("space", once);
  k.onMousePress(once);
  k.onTouchStart(() => once());
}

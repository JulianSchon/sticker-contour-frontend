import type { KAPLAYCtx } from "kaplay";
import { consumeTap } from "../systems/inputWiring";

/**
 * Wire a single "continue/proceed" action to keyboard (space), mouse click, and
 * touch (via the native-touch tap flag). Fires at most once per scene instance.
 */
export function onAnyProceed(k: KAPLAYCtx, cb: () => void): void {
  consumeTap(); // clear any stale tap from the previous scene
  let fired = false;
  const once = () => {
    if (fired) return;
    fired = true;
    cb();
  };
  k.onKeyPress("space", once);
  k.onMousePress(once);
  k.onUpdate(() => { if (consumeTap()) once(); });
}

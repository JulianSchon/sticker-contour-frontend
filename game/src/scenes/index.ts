import type { KAPLAYCtx } from "kaplay";
import type { InputState } from "../systems/input";
import { RunState, createRun } from "../systems/progress";
import { registerTitleScene } from "./title";
import { registerLevelScene } from "./level";
import { registerRewardScene } from "./reward";
import { registerAlbumScene } from "./album";
import { registerWinScene } from "./win";
import { registerGameOverScene } from "./gameover";

export function registerScenes(k: KAPLAYCtx, input: InputState): void {
  // A single mutable run object shared by gameplay scenes via getRun/setRun.
  let run: RunState = createRun();
  const getRun = () => run;
  const setRun = (r: RunState) => { run = r; };

  registerTitleScene(k, setRun);
  registerLevelScene(k, input, getRun);
  registerRewardScene(k, getRun);
  registerAlbumScene(k);
  registerWinScene(k);
  registerGameOverScene(k);
}

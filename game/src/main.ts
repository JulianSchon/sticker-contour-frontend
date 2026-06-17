import { initEngine } from "./engine";
import { loadAssets } from "./assets";
import { createInputState } from "./systems/input";
import { wireInput } from "./systems/inputWiring";
import { registerScenes } from "./scenes";

const root = document.getElementById("nimstick-game-root");
if (!root) throw new Error("nimstick-game-root element not found");

const k = initEngine(root);
loadAssets(k);

const input = createInputState();
wireInput(k, input);

registerScenes(k, input);

k.go("title");

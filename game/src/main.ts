import { initEngine } from "./engine";
import { loadAssets } from "./assets";
import { initAudio } from "./systems/audio";
import { createInputState } from "./systems/input";
import { wireInput } from "./systems/inputWiring";
import { registerScenes } from "./scenes";

const root = document.getElementById("nimstick-game-root");
if (!root) throw new Error("nimstick-game-root element not found");

const k = initEngine(root);
loadAssets(k);
initAudio(k);

const input = createInputState();
// Expose the live input state for debugging and E2E assertions (read-only use).
(window as unknown as { __nimstickInput?: typeof input }).__nimstickInput = input;
wireInput(k, input);

registerScenes(k, input);

k.go("title");

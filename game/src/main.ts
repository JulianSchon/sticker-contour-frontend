import kaplay from "kaplay";

const root = document.getElementById("nimstick-game-root");
if (!root) throw new Error("nimstick-game-root element not found");

const k = kaplay({
  width: 1280,
  height: 720,
  letterbox: true,
  global: false,
  touchToMouse: false,
  pixelDensity: Math.min(window.devicePixelRatio, 2),
  background: [135, 183, 255],
  root,
});

k.add([k.text("Stickan's Sticker Run"), k.pos(k.center()), k.anchor("center")]);

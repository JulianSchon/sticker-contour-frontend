import type { GameObj, KAPLAYCtx } from "kaplay";

interface SpawnAt { x: number; y: number; }

/**
 * A caged sticker-buddy. Freed when a projectile hits it OR the player touches
 * it; fires `onFree` exactly once, then pops. The level scene wires collisions
 * to `"hostage"` (projectile) and `"hostagezone"` (player touch).
 */
export function makeHostage(k: KAPLAYCtx, at: SpawnAt, onFree: () => void): GameObj {
  let freed = false;
  const cage = k.add([
    k.rect(44, 60, { radius: 4 }),
    k.color(120, 120, 140),
    k.opacity(0.85),
    k.outline(4, k.rgb(40, 40, 55)),
    k.pos(at.x, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(6),
    "hostage",
    "hostagezone",
  ]);
  const label = k.add([
    k.text("?", { size: 30 }),
    k.pos(at.x, at.y - 30),
    k.anchor("center"),
    k.color(255, 220, 0),
    k.z(7),
    "hostagelabel",
  ]);

  const free = () => {
    if (freed) return;
    freed = true;
    k.add([
      k.text("FREED!", { size: 22 }),
      k.pos(cage.pos.x, cage.pos.y - 70),
      k.anchor("center"),
      k.color(80, 255, 120),
      k.opacity(1),
      k.lifespan(0.6, { fade: 0.3 }),
      k.move(k.UP, 50),
      k.z(20),
    ]);
    k.destroy(cage);
    k.destroy(label);
    onFree();
  };

  cage.on("free", free);   // scene triggers via cage.trigger("free")
  return cage;
}

import type { GameObj, KAPLAYCtx } from "kaplay";

interface SpawnAt { x: number; y: number; }

/**
 * A caged sticker-buddy: a dark cell holding a trapped sticker that wriggles
 * and bobs behind steel bars, with a top plate and a padlock. Freed when a
 * projectile hits it OR the player touches it; fires `onFree` exactly once,
 * then pops (bars + buddy fly off). The level scene wires collisions to
 * `"hostage"` (projectile) and `"hostagezone"` (player touch).
 */
export function makeHostage(k: KAPLAYCtx, at: SpawnAt, onFree: () => void): GameObj {
  let freed = false;
  const cx = at.x;
  const topY = at.y - 62;

  // The cell background is also the collision object (area + tags).
  const cage = k.add([
    k.rect(46, 62, { radius: 5 }),
    k.color(34, 34, 48),
    k.opacity(0.92),
    k.outline(4, k.rgb(18, 18, 28)),
    k.pos(cx, at.y),
    k.anchor("bot"),
    k.area(),
    k.z(5),
    "hostage",
    "hostagezone",
  ]);

  // Trapped buddy: a real sticker that bobs and struggles to get attention.
  const buddy = k.add([
    k.sprite("stickericon"),
    k.pos(cx, at.y - 32),
    k.anchor("center"),
    k.scale(0.4),
    k.rotate(0),
    k.z(6),
  ]) as unknown as GameObj & { angle: number };
  let bt = 0;
  buddy.onUpdate(() => {
    bt += k.dt();
    buddy.pos.y = at.y - 32 + Math.sin(bt * 6) * 3;
    buddy.angle = Math.sin(bt * 9) * 10; // frantic wriggle
  });

  // Steel bars drawn over the buddy.
  const parts: GameObj[] = [buddy];
  for (let i = 0; i < 4; i++) {
    parts.push(k.add([
      k.rect(4, 52, { radius: 2 }),
      k.color(188, 194, 208),
      k.outline(1, k.rgb(90, 95, 110)),
      k.pos(cx - 16.5 + i * 11, at.y - 4),
      k.anchor("bot"),
      k.z(7),
    ]));
  }
  // Top plate + padlock.
  parts.push(k.add([
    k.rect(52, 10, { radius: 3 }),
    k.color(96, 100, 116),
    k.outline(2, k.rgb(18, 18, 28)),
    k.pos(cx, topY),
    k.anchor("top"),
    k.z(8),
  ]));
  parts.push(k.add([
    k.rect(14, 12, { radius: 3 }),
    k.color(240, 200, 40),
    k.outline(2, k.rgb(18, 18, 28)),
    k.pos(cx, at.y - 30),
    k.anchor("center"),
    k.z(8),
  ]));
  // Keyhole dot on the lock.
  parts.push(k.add([
    k.circle(2),
    k.color(18, 18, 28),
    k.pos(cx, at.y - 30),
    k.anchor("center"),
    k.z(9),
  ]));

  const free = () => {
    if (freed) return;
    freed = true;
    // The freed buddy leaps out and cheers.
    k.add([
      k.sprite("stickericon"),
      k.pos(cx, at.y - 40),
      k.anchor("center"),
      k.scale(0.4),
      k.opacity(1),
      k.z(20),
      k.move(k.UP, 120),
      k.lifespan(0.7, { fade: 0.4 }),
    ]);
    k.add([
      k.text("FREED!", { size: 22 }),
      k.pos(cx, at.y - 78),
      k.anchor("center"),
      k.color(80, 255, 120),
      k.opacity(1),
      k.lifespan(0.6, { fade: 0.3 }),
      k.move(k.UP, 50),
      k.z(21),
    ]);
    parts.forEach((p) => k.destroy(p));
    k.destroy(cage);
    onFree();
  };

  cage.on("free", free); // scene triggers via cage.trigger("free")
  return cage;
}

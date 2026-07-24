import type { GameObj, KAPLAYCtx } from "kaplay";
import { PROJECTILE } from "../config";

export interface ProjectileOpts {
  x: number;
  y: number;
  vx: number;   // px/s horizontal
  vy: number;   // px/s vertical (negative = up); no gravity applied
}

export function makeProjectile(k: KAPLAYCtx, opts: ProjectileOpts): GameObj {
  const proj = k.add([
    k.sprite("throwsticker", { anim: "spin" }),
    k.scale(0.4),
    k.opacity(1),
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.area({ scale: 0.6 }),
    k.z(9),
    k.offscreen({ destroy: true }),
    k.lifespan(PROJECTILE.lifetime, { fade: 0.1 }),
    "projectile",
  ]);

  proj.onUpdate(() => {
    proj.move(opts.vx, opts.vy);
  });

  proj.onCollide("enemy", () => k.destroy(proj));
  proj.onCollide("wall", () => k.destroy(proj));
  proj.onCollide("hazard", () => k.destroy(proj));

  return proj;
}

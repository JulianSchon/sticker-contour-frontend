import type { GameObj, KAPLAYCtx } from "kaplay";
import { PROJECTILE } from "../config";

export interface ProjectileOpts {
  x: number;
  y: number;
  dir: number;   // -1 or 1
  speed: number;
}

export function makeProjectile(k: KAPLAYCtx, opts: ProjectileOpts): GameObj {
  const proj = k.add([
    k.circle(12),
    k.color(255, 212, 0),
    k.outline(3, k.rgb(0, 0, 0)),
    k.opacity(1),
    k.pos(opts.x, opts.y),
    k.anchor("center"),
    k.area(),
    k.rotate(0),
    k.z(9),
    k.offscreen({ destroy: true }),
    k.lifespan(PROJECTILE.lifetime, { fade: 0.1 }),
    "projectile",
  ]);

  proj.onUpdate(() => {
    proj.move(opts.dir * opts.speed, 0);
    proj.angle += 720 * k.dt();
  });

  proj.onCollide("enemy", () => k.destroy(proj));
  proj.onCollide("wall", () => k.destroy(proj));

  return proj;
}

import type { Update, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { applyUpdates } from './world';
import { behaviorForRole, getCustomBehavior } from './behaviors';

export function tick(world: World, registry: Registry, rng: RNG): World {
  const updates: Update[] = [];
  const occupiedNext = new Set<number>();

  const order: number[] = [];
  for (let i = 0; i < world.tiles.length; i++) {
    if (world.tiles[i].creature) order.push(i);
  }
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (const i of order) {
    if (occupiedNext.has(i)) continue;
    const tile = world.tiles[i];
    if (!tile.creature) continue;
    const def = registry.species(tile.creature.speciesId);
    if (!def) continue;
    const pos = { x: i % world.size, y: Math.floor(i / world.size) };
    const ctx = { world, pos, def, registry, rng, occupiedNext };
    const roleFn = behaviorForRole(def.role);
    const u1 = roleFn(ctx);
    updates.push(...u1);
    if (def.behaviors) {
      for (const id of def.behaviors) {
        const fn = getCustomBehavior(id);
        if (fn) updates.push(...fn(ctx));
      }
    }
  }

  const next = applyUpdates(world, updates, registry);
  next.day = world.day + 1;
  next.weather = next.day % 10 < 7 ? 'sun' : 'rain';
  return next;
}

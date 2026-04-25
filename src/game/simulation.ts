import type { Pos, Update, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { NEIGHBOR_OFFSETS, applyUpdates, decode, idx, inDisc } from './world';
import { behaviorForRole, getCustomBehavior } from './behaviors';
import { tickAtmosphere } from './atmosphere';
import { countPopulations } from './endConditions';

export function tick(world: World, registry: Registry, rng: RNG): World {
  const updates: Update[] = [];
  const occupiedNext = new Set<number>();

  const order: number[] = [];
  for (let i = 0; i < world.tiles.length; i++) {
    const t = world.tiles[i];
    if (t && t.creature) order.push(i);
  }
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (const i of order) {
    if (occupiedNext.has(i)) continue;
    const tile = world.tiles[i];
    if (!tile || !tile.creature) continue;
    const def = registry.species(tile.creature.speciesId);
    if (!def) continue;
    const pos = decode(world.radius, i);
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

  let next = applyUpdates(world, updates, registry);
  next.day = world.day + 1;
  next = tickAtmosphere(next, registry, rng);
  next = applyMigration(next, registry, rng);
  return next;
}

function applyMigration(world: World, registry: Registry, rng: RNG): World {
  const counts = countPopulations(world, registry).bySpecies;
  const updates: Update[] = [];
  const claimed = new Set<number>();

  for (const def of registry.allSpecies()) {
    const m = def.migrate;
    if (!m) continue;
    const myCount = counts.get(def.id) ?? 0;
    if (myCount >= (m.whenBelow ?? 1)) continue;
    if (m.needsDiet != null) {
      let dietTotal = 0;
      for (const d of def.diet ?? []) dietTotal += counts.get(d) ?? 0;
      if (dietTotal < m.needsDiet) continue;
    }
    if (!rng.chance(m.chance)) continue;
    const spot = pickEdgeGrass(world, rng, claimed);
    if (!spot) continue;
    claimed.add(idx(world.radius, spot.q, spot.r));
    updates.push({ kind: 'spawn', pos: spot, speciesId: def.id });
  }

  return updates.length === 0 ? world : applyUpdates(world, updates, registry);
}

function pickEdgeGrass(world: World, rng: RNG, claimed: Set<number>): Pos | undefined {
  const candidates: Pos[] = [];
  for (let q = -world.radius; q <= world.radius; q++) {
    for (let r = -world.radius; r <= world.radius; r++) {
      if (!inDisc(world.radius, q, r)) continue;
      let onEdge = false;
      for (const [dq, dr] of NEIGHBOR_OFFSETS) {
        if (!inDisc(world.radius, q + dq, r + dr)) {
          onEdge = true;
          break;
        }
      }
      if (!onEdge) continue;
      const k = idx(world.radius, q, r);
      if (claimed.has(k)) continue;
      const t = world.tiles[k];
      if (!t || t.terrain !== 'grass' || t.creature) continue;
      candidates.push({ q, r });
    }
  }
  return rng.pick(candidates);
}

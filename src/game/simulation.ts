import type { Pos, Update, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { applyUpdates, cloneWorld, decode, getTile, idx, neighbors } from './world';
import { behaviorForRole, getCustomBehavior } from './behaviors';

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
  next.weather = weatherFor(next.day);
  next = applyEnvironmentEvents(next, registry, rng);
  return next;
}

function weatherFor(day: number): World['weather'] {
  const phase = day % 20;
  if (phase < 10) return 'sun';
  if (phase < 14) return 'clouds';
  if (phase < 18) return 'rain';
  return 'storm';
}

function applyEnvironmentEvents(world: World, registry: Registry, rng: RNG): World {
  const wet = world.weather === 'rain' || world.weather === 'storm';
  const stormy = world.weather === 'storm';
  if (!wet && !stormy) return world;

  const next = cloneWorld(world);

  if (wet && rng.chance(0.5)) expandLake(next, rng);
  if (stormy && rng.chance(0.35)) lightningStrike(next, registry, rng);

  return next;
}

function expandLake(world: World, rng: RNG): void {
  const candidates: Pos[] = [];
  for (let i = 0; i < world.tiles.length; i++) {
    const t = world.tiles[i];
    if (!t || t.terrain !== 'grass' || t.creature) continue;
    const pos = decode(world.radius, i);
    if (neighbors(world, pos).some((n) => getTile(world, n.q, n.r)?.terrain === 'water')) {
      candidates.push(pos);
    }
  }
  const target = rng.pick(candidates);
  if (!target) return;
  const t = world.tiles[idx(world.radius, target.q, target.r)];
  if (!t) return;
  t.terrain = 'water';
  t.creature = undefined;
}

function lightningStrike(world: World, registry: Registry, rng: RNG): void {
  const validIndices: number[] = [];
  for (let i = 0; i < world.tiles.length; i++) {
    if (world.tiles[i] !== null) validIndices.push(i);
  }
  if (validIndices.length === 0) return;
  const i = validIndices[rng.int(validIndices.length)];
  const t = world.tiles[i];
  if (!t || t.terrain !== 'grass') return;
  const fireDef = registry.species('fire');
  if (!fireDef) return;
  if (t.creature) {
    const def = registry.species(t.creature.speciesId);
    if (def?.role !== 'producer') return;
  }
  t.creature = { speciesId: 'fire', energy: fireDef.energyStart ?? 5, age: 0 };
}

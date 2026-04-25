import type { Pos, Update, WeatherKind, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { applyUpdates, cloneWorld, decode, idx, inDisc } from './world';
import { getCustomBehavior } from './behaviors';

const SPAWN_SPECIES = 'cloud';

export function tickAtmosphere(world: World, registry: Registry, rng: RNG): World {
  const updates: Update[] = [];
  const occupiedNext = new Set<number>();

  const order: number[] = [];
  for (let i = 0; i < world.atmosphere.length; i++) {
    if (world.atmosphere[i]) order.push(i);
  }
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }

  for (const i of order) {
    if (occupiedNext.has(i)) continue;
    const cell = world.atmosphere[i];
    if (!cell) continue;
    const def = registry.species(cell.speciesId);
    if (!def) continue;
    const pos = decode(world.radius, i);
    const ageNext = cell.age + 1;

    if (def.lifespan != null && ageNext >= def.lifespan) {
      updates.push({ kind: 'remove', pos, layer: 'atmosphere' });
      continue;
    }

    if (def.growsInto && ageNext >= (def.matureAge ?? 0) && rng.chance(0.5)) {
      updates.push({ kind: 'transform', pos, speciesId: def.growsInto, layer: 'atmosphere' });
      continue;
    }

    updates.push({ kind: 'setAge', pos, age: ageNext, layer: 'atmosphere' });

    if (def.behaviors) {
      const ctx = { world, pos, def, registry, rng, occupiedNext };
      for (const id of def.behaviors) {
        const fn = getCustomBehavior(id);
        if (fn) updates.push(...fn(ctx));
      }
    }
  }

  const target = Math.max(2, Math.floor(world.radius / 2));
  let count = 0;
  for (const c of world.atmosphere) if (c) count++;
  if (count < target) {
    const spot = pickUpwindEdgeSpawn(world, rng);
    if (spot) {
      const k = idx(world.radius, spot.q, spot.r);
      if (!occupiedNext.has(k)) {
        occupiedNext.add(k);
        updates.push({ kind: 'spawn', pos: spot, speciesId: SPAWN_SPECIES, layer: 'atmosphere' });
      }
    }
  }

  let next = applyAtmosphereUpdates(world, updates, registry);
  next = applyUpdates(next, updates, registry);
  return next;
}

export function applyAtmosphereUpdates(world: World, updates: Update[], registry: Registry): World {
  const next = cloneWorld(world);
  const touched = new Set<number>();
  const touch = (p: Pos): boolean => {
    const k = idx(next.radius, p.q, p.r);
    if (touched.has(k)) return false;
    touched.add(k);
    return true;
  };

  for (const u of updates) {
    if (u.layer !== 'atmosphere') continue;
    switch (u.kind) {
      case 'spawn': {
        const k = idx(next.radius, u.pos.q, u.pos.r);
        if (!inDisc(next.radius, u.pos.q, u.pos.r)) break;
        if (next.atmosphere[k]) break;
        if (!touch(u.pos)) break;
        const def = registry.species(u.speciesId);
        if (!def) break;
        next.atmosphere[k] = {
          speciesId: u.speciesId,
          energy: u.energy ?? def.energyStart ?? 0,
          age: 0,
        };
        break;
      }
      case 'remove': {
        const k = idx(next.radius, u.pos.q, u.pos.r);
        if (!touch(u.pos)) break;
        next.atmosphere[k] = null;
        break;
      }
      case 'move': {
        if (!inDisc(next.radius, u.to.q, u.to.r)) break;
        const fromK = idx(next.radius, u.from.q, u.from.r);
        const toK = idx(next.radius, u.to.q, u.to.r);
        const cell = next.atmosphere[fromK];
        if (!cell || next.atmosphere[toK]) break;
        if (!touch(u.from) || !touch(u.to)) break;
        next.atmosphere[toK] = cell;
        next.atmosphere[fromK] = null;
        break;
      }
      case 'setAge': {
        const cell = next.atmosphere[idx(next.radius, u.pos.q, u.pos.r)];
        if (cell) cell.age = u.age;
        break;
      }
      case 'setEnergy': {
        const cell = next.atmosphere[idx(next.radius, u.pos.q, u.pos.r)];
        if (cell) cell.energy = u.energy;
        break;
      }
      case 'transform': {
        const k = idx(next.radius, u.pos.q, u.pos.r);
        const cell = next.atmosphere[k];
        if (!cell) break;
        const def = registry.species(u.speciesId);
        if (!def) break;
        cell.speciesId = u.speciesId;
        cell.age = 0;
        break;
      }
    }
  }
  return next;
}

export function seedAtmosphere(world: World, rng: RNG): World {
  const next = cloneWorld(world);
  const target = 4 + rng.int(3);
  let placed = 0;
  let attempts = 0;
  while (placed < target && attempts < 200) {
    attempts++;
    const q = rng.int(2 * next.radius + 1) - next.radius;
    const r = rng.int(2 * next.radius + 1) - next.radius;
    if (!inDisc(next.radius, q, r)) continue;
    const k = idx(next.radius, q, r);
    if (next.atmosphere[k]) continue;
    next.atmosphere[k] = { speciesId: SPAWN_SPECIES, energy: 0, age: 0 };
    placed++;
  }
  return next;
}

export function dominantWeather(world: World): WeatherKind {
  let storm = false;
  let rain = false;
  let cloud = false;
  for (const c of world.atmosphere) {
    if (!c) continue;
    if (c.speciesId === 'storm') storm = true;
    else if (c.speciesId === 'rain') rain = true;
    else if (c.speciesId === 'cloud') cloud = true;
  }
  if (storm) return 'storm';
  if (rain) return 'rain';
  if (cloud) return 'clouds';
  return 'sun';
}

function pickUpwindEdgeSpawn(world: World, rng: RNG): Pos | undefined {
  const candidates: Pos[] = [];
  for (let q = -world.radius; q <= world.radius; q++) {
    for (let r = -world.radius; r <= world.radius; r++) {
      if (!inDisc(world.radius, q, r)) continue;
      if (world.atmosphere[idx(world.radius, q, r)]) continue;
      const upQ = q - world.wind.dq;
      const upR = r - world.wind.dr;
      if (!inDisc(world.radius, upQ, upR)) candidates.push({ q, r });
    }
  }
  return rng.pick(candidates);
}

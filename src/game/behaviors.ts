import type { Pos, SpeciesDef, Update, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { NEIGHBOR_OFFSETS, getTile, idx, inDisc, neighbors } from './world';

export interface BehaviorCtx {
  world: World;
  pos: Pos;
  def: SpeciesDef;
  registry: Registry;
  rng: RNG;
  occupiedNext: Set<number>;
}

export type Behavior = (ctx: BehaviorCtx) => Update[];

const customBehaviors = new Map<string, Behavior>();

export function registerBehavior(id: string, fn: Behavior): void {
  customBehaviors.set(id, fn);
}

export function getCustomBehavior(id: string): Behavior | undefined {
  return customBehaviors.get(id);
}

declare global {
  interface Window {
    EcoMoji?: { registerBehavior: typeof registerBehavior };
  }
}

if (typeof window !== 'undefined') {
  window.EcoMoji = { registerBehavior };
}

function emptyGrassNeighbors(ctx: BehaviorCtx): Pos[] {
  const out: Pos[] = [];
  for (const n of neighbors(ctx.world, ctx.pos)) {
    const t = getTile(ctx.world, n.q, n.r);
    if (!t) continue;
    const k = idx(ctx.world.radius, n.q, n.r);
    if (t.terrain === 'grass' && !t.creature && !ctx.occupiedNext.has(k)) out.push(n);
  }
  return out;
}

function findPrey(ctx: BehaviorCtx): Pos | undefined {
  const diet = ctx.def.diet ?? [];
  if (diet.length === 0) return undefined;
  const candidates: Pos[] = [];
  for (const n of neighbors(ctx.world, ctx.pos)) {
    const t = getTile(ctx.world, n.q, n.r);
    if (t && t.creature && diet.includes(t.creature.speciesId)) candidates.push(n);
  }
  return ctx.rng.pick(candidates);
}

function hasWaterNeighbor(ctx: BehaviorCtx): boolean {
  for (const n of neighbors(ctx.world, ctx.pos)) {
    if (getTile(ctx.world, n.q, n.r)?.terrain === 'water') return true;
  }
  return false;
}

export const producerBehavior: Behavior = (ctx) => {
  const updates: Update[] = [];
  const tile = getTile(ctx.world, ctx.pos.q, ctx.pos.r);
  if (!tile?.creature) return updates;
  const def = ctx.def;

  const ageNext = tile.creature.age + 1;
  updates.push({ kind: 'setAge', pos: ctx.pos, age: ageNext });

  if ((def.lifespan ?? Infinity) <= ageNext) {
    updates.push({ kind: 'remove', pos: ctx.pos });
    return updates;
  }

  const above = ctx.world.atmosphere[idx(ctx.world.radius, ctx.pos.q, ctx.pos.r)];
  const aboveId = above ? above.speciesId : undefined;
  const sunOk = !def.needs?.sun || !above || aboveId === 'cloud' || aboveId === 'rain';
  const waterOk = !def.needs?.waterNeighbor || hasWaterNeighbor(ctx);
  const healthy = sunOk && waterOk;

  let energyDelta = 0;
  if (healthy) energyDelta += 1;
  if ((aboveId === 'rain' || aboveId === 'storm') && def.needs?.waterNeighbor) energyDelta += 1;
  if (energyDelta !== 0) {
    updates.push({ kind: 'setEnergy', pos: ctx.pos, energy: tile.creature.energy + energyDelta });
  }

  const matureAge = def.matureAge ?? 0;
  if (def.growsInto && ageNext >= matureAge && healthy && ctx.rng.chance(0.05)) {
    updates.push({ kind: 'transform', pos: ctx.pos, speciesId: def.growsInto });
  }

  if (
    healthy &&
    ageNext >= matureAge &&
    def.spreadChance &&
    ctx.rng.chance(def.spreadChance)
  ) {
    const target = ctx.rng.pick(emptyGrassNeighbors(ctx));
    if (target) {
      ctx.occupiedNext.add(idx(ctx.world.radius, target.q, target.r));
      updates.push({ kind: 'spawn', pos: target, speciesId: def.id });
    }
  }

  return updates;
};

export const consumerBehavior: Behavior = (ctx) => {
  const updates: Update[] = [];
  const tile = getTile(ctx.world, ctx.pos.q, ctx.pos.r);
  if (!tile?.creature) return updates;
  const def = ctx.def;
  const c = tile.creature;

  const ageNext = c.age + 1;
  updates.push({ kind: 'setAge', pos: ctx.pos, age: ageNext });

  if ((def.lifespan ?? Infinity) <= ageNext) {
    updates.push({ kind: 'remove', pos: ctx.pos });
    return updates;
  }

  const tickCost = def.energyPerTick ?? 1;
  let energy = c.energy - tickCost;

  const prey = findPrey(ctx);
  if (prey) {
    energy += def.energyPerEat ?? 5;
    updates.push({ kind: 'remove', pos: prey });
    ctx.occupiedNext.add(idx(ctx.world.radius, prey.q, prey.r));
    if (energy <= 0) {
      updates.push({ kind: 'remove', pos: ctx.pos });
      return updates;
    }
    updates.push({ kind: 'setEnergy', pos: ctx.pos, energy });

    const reproT = def.reproThreshold ?? Infinity;
    if (energy >= reproT) {
      const open = emptyGrassNeighbors(ctx);
      const spot = ctx.rng.pick(open);
      if (spot) {
        ctx.occupiedNext.add(idx(ctx.world.radius, spot.q, spot.r));
        const half = Math.floor(energy / 2);
        updates.push({ kind: 'setEnergy', pos: ctx.pos, energy: energy - half });
        updates.push({ kind: 'spawn', pos: spot, speciesId: def.id, energy: half });
      }
    }
    return updates;
  }

  if (energy <= 0) {
    updates.push({ kind: 'remove', pos: ctx.pos });
    return updates;
  }

  const open = emptyGrassNeighbors(ctx);
  const moveTo = ctx.rng.pick(open);
  if (moveTo) {
    ctx.occupiedNext.add(idx(ctx.world.radius, moveTo.q, moveTo.r));
    updates.push({ kind: 'move', from: ctx.pos, to: moveTo });
    updates.push({ kind: 'setEnergy', pos: moveTo, energy });
  } else {
    updates.push({ kind: 'setEnergy', pos: ctx.pos, energy });
  }

  return updates;
};

export const environmentBehavior: Behavior = () => [];

const fireSpread: Behavior = (ctx) => {
  const updates: Update[] = [];
  const tile = getTile(ctx.world, ctx.pos.q, ctx.pos.r);
  if (!tile?.creature) return updates;
  const above = ctx.world.atmosphere[idx(ctx.world.radius, ctx.pos.q, ctx.pos.r)];
  const wet = above?.speciesId === 'rain' || above?.speciesId === 'storm';
  const decay = wet ? 2 : 1;
  const energy = tile.creature.energy - decay;
  if (energy <= 0) {
    updates.push({ kind: 'remove', pos: ctx.pos });
    return updates;
  }
  updates.push({ kind: 'setEnergy', pos: ctx.pos, energy });

  const spreadChance = wet ? 0.12 : 0.4;
  if (ctx.rng.chance(spreadChance)) {
    const flammable: Pos[] = [];
    for (const n of neighbors(ctx.world, ctx.pos)) {
      const nt = getTile(ctx.world, n.q, n.r);
      if (!nt || nt.terrain !== 'grass') continue;
      if (ctx.occupiedNext.has(idx(ctx.world.radius, n.q, n.r))) continue;
      if (!nt.creature) continue;
      const ndef = ctx.registry.species(nt.creature.speciesId);
      if (ndef?.role === 'producer') flammable.push(n);
    }
    const target = ctx.rng.pick(flammable);
    if (target) {
      ctx.occupiedNext.add(idx(ctx.world.radius, target.q, target.r));
      updates.push({ kind: 'ignite', pos: target, speciesId: 'fire', energy: 4 });
    }
  }
  return updates;
};

registerBehavior('fire-spread', fireSpread);

const windDrift: Behavior = (ctx) => {
  if (!ctx.rng.chance(0.7)) return [];
  const { wind } = ctx.world;
  const choices: Pos[] = [];
  for (const [dq, dr] of NEIGHBOR_OFFSETS) {
    const nq = ctx.pos.q + dq;
    const nr = ctx.pos.r + dr;
    if (!inDisc(ctx.world.radius, nq, nr)) continue;
    const k = idx(ctx.world.radius, nq, nr);
    if (ctx.world.atmosphere[k]) continue;
    if (ctx.occupiedNext.has(k)) continue;
    const weight = dq === wind.dq && dr === wind.dr ? 3 : 1;
    for (let i = 0; i < weight; i++) choices.push({ q: nq, r: nr });
  }
  const target = ctx.rng.pick(choices);
  if (!target) return [];
  ctx.occupiedNext.add(idx(ctx.world.radius, target.q, target.r));
  return [{ kind: 'move', from: ctx.pos, to: target, layer: 'atmosphere' }];
};

const rainDrop: Behavior = (ctx) => {
  const tile = getTile(ctx.world, ctx.pos.q, ctx.pos.r);
  if (!tile || tile.terrain !== 'grass' || tile.creature) return [];
  let waterNeighbor = false;
  for (const n of neighbors(ctx.world, ctx.pos)) {
    if (getTile(ctx.world, n.q, n.r)?.terrain === 'water') {
      waterNeighbor = true;
      break;
    }
  }
  const heavy = ctx.def.id === 'storm';
  const chance = waterNeighbor ? (heavy ? 0.10 : 0.08) : (heavy ? 0.012 : 0.003);
  if (!ctx.rng.chance(chance)) return [];
  return [{ kind: 'setTerrain', pos: ctx.pos, terrain: 'water', layer: 'tile' }];
};

const stormStrike: Behavior = (ctx) => {
  const tile = getTile(ctx.world, ctx.pos.q, ctx.pos.r);
  if (!tile || tile.terrain !== 'grass') return [];
  if (!tile.creature) return [];
  const def = ctx.registry.species(tile.creature.speciesId);
  if (def?.role !== 'producer') return [];
  if (!ctx.rng.chance(0.04)) return [];
  return [{ kind: 'ignite', pos: ctx.pos, speciesId: 'fire', energy: 4, layer: 'tile' }];
};

registerBehavior('wind-drift', windDrift);
registerBehavior('rain-drop', rainDrop);
registerBehavior('storm-strike', stormStrike);

export function behaviorForRole(role: 'producer' | 'consumer' | 'environment'): Behavior {
  switch (role) {
    case 'producer':
      return producerBehavior;
    case 'consumer':
      return consumerBehavior;
    case 'environment':
      return environmentBehavior;
  }
}

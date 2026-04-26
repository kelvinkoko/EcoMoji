import type { Pos, SeedDef, Terrain, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { cloneWorld, getTile, idx, inDisc, neighbors } from './world';
import { seedAtmosphere } from './atmosphere';

export function applySeed(world: World, seed: SeedDef, registry: Registry, rng: RNG): World {
  let next = cloneWorld(world);
  next.day = 0;

  const setTerrain = (p: Pos, terrain: 'grass' | 'water' | 'rock') => {
    if (!inDisc(next.radius, p.q, p.r)) return;
    const t = next.tiles[idx(next.radius, p.q, p.r)];
    if (!t) return;
    t.terrain = terrain;
    if (terrain !== 'grass') t.creature = undefined;
  };

  const placeCreature = (p: Pos, speciesId: string): boolean => {
    if (!inDisc(next.radius, p.q, p.r)) return false;
    const t = next.tiles[idx(next.radius, p.q, p.r)];
    if (!t || t.creature) return false;
    const def = registry.species(speciesId);
    if (!def || def.role === 'environment') return false;
    const habitat = def.habitat ?? 'grass';
    if (t.terrain !== habitat) return false;
    t.creature = { speciesId, energy: def.energyStart ?? 4, age: 0 };
    return true;
  };

  for (const cluster of seed.waterClusters ?? []) {
    const cq = toAxial(cluster.center[0], next.radius);
    const cr = toAxial(cluster.center[1], next.radius);
    const start = clampToDisc(next.radius, cq, cr);
    const tilesToFill = Math.max(1, cluster.size ?? 4);
    growBlob(next, start, tilesToFill, rng).forEach((p) => setTerrain(p, 'water'));
  }

  const rockCount = seed.rocks ?? 0;
  for (let i = 0; i < rockCount; i++) {
    const spot = pickRandomHabitatTile(next, rng, 200, 'grass');
    if (spot) setTerrain(spot, 'rock');
  }

  for (const forest of seed.forests ?? []) {
    const cq = toAxial(forest.center[0], next.radius);
    const cr = toAxial(forest.center[1], next.radius);
    const start = clampToDisc(next.radius, cq, cr);
    const want = Math.max(1, forest.size ?? 5);
    const region = growBlob(next, start, want * 2, rng);
    let placed = 0;
    for (const p of region) {
      if (placed >= want) break;
      if (placeCreature(p, forest.speciesId)) placed++;
    }
  }

  for (const item of seed.plantsNearWater ?? []) {
    let placed = 0;
    let attempts = 0;
    while (placed < item.count && attempts < 500) {
      attempts++;
      const spot = pickRandomHabitatTile(next, rng, 1, 'grass');
      if (!spot) continue;
      if (!hasWaterNeighbor(next, spot)) continue;
      if (placeCreature(spot, item.speciesId)) placed++;
    }
  }

  for (const item of seed.scatter ?? []) {
    const def = registry.species(item.speciesId);
    if (!def) continue;
    const habitat = def.habitat ?? 'grass';
    let placed = 0;
    let attempts = 0;
    while (placed < item.count && attempts < 500) {
      attempts++;
      const spot = pickRandomHabitatTile(next, rng, 1, habitat);
      if (!spot) continue;
      if (placeCreature(spot, item.speciesId)) placed++;
    }
  }

  next = seedAtmosphere(next, rng);
  return next;
}

function toAxial(coord: number, radius: number): number {
  if (coord >= -1 && coord <= 1) return Math.round(coord * radius);
  return Math.round(coord);
}

function clampToDisc(radius: number, q: number, r: number): Pos {
  if (inDisc(radius, q, r)) return { q, r };
  let bestQ = 0;
  let bestR = 0;
  let bestDist = Infinity;
  for (let qq = -radius; qq <= radius; qq++) {
    for (let rr = -radius; rr <= radius; rr++) {
      if (!inDisc(radius, qq, rr)) continue;
      const d = (q - qq) * (q - qq) + (r - rr) * (r - rr);
      if (d < bestDist) {
        bestDist = d;
        bestQ = qq;
        bestR = rr;
      }
    }
  }
  return { q: bestQ, r: bestR };
}

function growBlob(world: World, start: Pos, tileCount: number, rng: RNG): Pos[] {
  const visited = new Set<number>();
  const frontier: Pos[] = [start];
  const out: Pos[] = [];
  while (out.length < tileCount && frontier.length > 0) {
    const i = rng.int(frontier.length);
    const p = frontier.splice(i, 1)[0];
    if (!inDisc(world.radius, p.q, p.r)) continue;
    const k = idx(world.radius, p.q, p.r);
    if (visited.has(k)) continue;
    visited.add(k);
    out.push(p);
    for (const n of neighbors(world, p)) frontier.push(n);
  }
  return out;
}

function pickRandomHabitatTile(
  world: World,
  rng: RNG,
  attempts: number,
  habitat: Terrain
): Pos | undefined {
  const R = world.radius;
  for (let i = 0; i < attempts; i++) {
    const q = rng.int(2 * R + 1) - R;
    const r = rng.int(2 * R + 1) - R;
    if (!inDisc(R, q, r)) continue;
    const t = getTile(world, q, r);
    if (t && t.terrain === habitat && !t.creature) return { q, r };
  }
  return undefined;
}

function hasWaterNeighbor(world: World, pos: Pos): boolean {
  for (const n of neighbors(world, pos)) {
    if (getTile(world, n.q, n.r)?.terrain === 'water') return true;
  }
  return false;
}

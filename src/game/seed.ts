import type { Pos, SeedDef, World } from './types';
import type { Registry } from './registry';
import type { RNG } from './rng';
import { getTile, idx, inBounds, neighbors } from './world';

export function applySeed(world: World, seed: SeedDef, registry: Registry, rng: RNG): World {
  const next: World = {
    size: world.size,
    day: 0,
    weather: 'sun',
    tiles: world.tiles.map((t) => ({ terrain: t.terrain, creature: t.creature ? { ...t.creature } : undefined })),
  };

  const setTerrain = (p: Pos, terrain: 'grass' | 'water' | 'rock') => {
    if (!inBounds(next.size, p.x, p.y)) return;
    const t = next.tiles[idx(next.size, p.x, p.y)];
    t.terrain = terrain;
    if (terrain !== 'grass') t.creature = undefined;
  };

  const placeCreature = (p: Pos, speciesId: string): boolean => {
    if (!inBounds(next.size, p.x, p.y)) return false;
    const t = next.tiles[idx(next.size, p.x, p.y)];
    if (t.terrain !== 'grass' || t.creature) return false;
    const def = registry.species(speciesId);
    if (!def || def.role === 'environment') return false;
    t.creature = { speciesId, energy: def.energyStart ?? 4, age: 0 };
    return true;
  };

  for (const cluster of seed.waterClusters ?? []) {
    const cx = toAbs(cluster.center[0], next.size);
    const cy = toAbs(cluster.center[1], next.size);
    const tilesToFill = Math.max(1, cluster.size ?? 4);
    growBlob(next.size, { x: cx, y: cy }, tilesToFill, rng).forEach((p) => setTerrain(p, 'water'));
  }

  const rockCount = seed.rocks ?? 0;
  for (let i = 0; i < rockCount; i++) {
    const spot = pickRandomGrass(next, rng, 200);
    if (spot) setTerrain(spot, 'rock');
  }

  for (const item of seed.plantsNearWater ?? []) {
    let placed = 0;
    let attempts = 0;
    while (placed < item.count && attempts < 500) {
      attempts++;
      const spot = pickRandomGrass(next, rng, 1);
      if (!spot) break;
      if (!hasWaterNeighbor(next, spot)) continue;
      if (placeCreature(spot, item.speciesId)) placed++;
    }
  }

  for (const item of seed.scatter ?? []) {
    let placed = 0;
    let attempts = 0;
    while (placed < item.count && attempts < 500) {
      attempts++;
      const spot = pickRandomGrass(next, rng, 1);
      if (!spot) break;
      if (placeCreature(spot, item.speciesId)) placed++;
    }
  }

  return next;
}

function toAbs(coord: number, size: number): number {
  if (coord >= 0 && coord <= 1) return Math.min(size - 1, Math.max(0, Math.round(coord * (size - 1))));
  return Math.min(size - 1, Math.max(0, Math.round(coord)));
}

function growBlob(size: number, start: Pos, tileCount: number, rng: RNG): Pos[] {
  const visited = new Set<number>();
  const frontier: Pos[] = [start];
  const out: Pos[] = [];
  while (out.length < tileCount && frontier.length > 0) {
    const i = rng.int(frontier.length);
    const p = frontier.splice(i, 1)[0];
    const k = p.y * size + p.x;
    if (visited.has(k)) continue;
    if (!(p.x >= 0 && p.y >= 0 && p.x < size && p.y < size)) continue;
    visited.add(k);
    out.push(p);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      frontier.push({ x: p.x + dx, y: p.y + dy });
    }
  }
  return out;
}

function pickRandomGrass(world: World, rng: RNG, attempts: number): Pos | undefined {
  for (let i = 0; i < attempts; i++) {
    const x = rng.int(world.size);
    const y = rng.int(world.size);
    const t = getTile(world, x, y);
    if (t.terrain === 'grass' && !t.creature) return { x, y };
  }
  return undefined;
}

function hasWaterNeighbor(world: World, pos: Pos): boolean {
  for (const n of neighbors(world, pos)) {
    if (getTile(world, n.x, n.y).terrain === 'water') return true;
  }
  return false;
}

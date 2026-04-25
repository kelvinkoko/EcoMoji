import type { Pos, Tile, Update, World } from './types';
import type { Registry } from './registry';

const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

export function idx(radius: number, q: number, r: number): number {
  return (q + radius) * (2 * radius + 1) + (r + radius);
}

export function inDisc(radius: number, q: number, r: number): boolean {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= radius;
}

export function decode(radius: number, index: number): Pos {
  const stride = 2 * radius + 1;
  return { q: Math.floor(index / stride) - radius, r: (index % stride) - radius };
}

export function getTile(world: World, q: number, r: number): Tile | null {
  if (!inDisc(world.radius, q, r)) return null;
  return world.tiles[idx(world.radius, q, r)];
}

export function neighbors(world: World, pos: Pos): Pos[] {
  const out: Pos[] = [];
  for (const [dq, dr] of NEIGHBOR_OFFSETS) {
    const nq = pos.q + dq;
    const nr = pos.r + dr;
    if (inDisc(world.radius, nq, nr)) out.push({ q: nq, r: nr });
  }
  return out;
}

export function createWorld(radius: number): World {
  const stride = 2 * radius + 1;
  const tiles: (Tile | null)[] = new Array(stride * stride).fill(null);
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (inDisc(radius, q, r)) tiles[idx(radius, q, r)] = { terrain: 'grass' };
    }
  }
  return { radius, tiles, day: 0, weather: 'sun' };
}

export function cloneWorld(world: World): World {
  return {
    radius: world.radius,
    day: world.day,
    weather: world.weather,
    tiles: world.tiles.map((t) =>
      t === null ? null : { terrain: t.terrain, creature: t.creature ? { ...t.creature } : undefined }
    ),
  };
}

export function applyUpdates(world: World, updates: Update[], registry: Registry): World {
  const next = cloneWorld(world);
  const positionTouched = new Set<number>();

  const touch = (p: Pos): boolean => {
    const k = idx(next.radius, p.q, p.r);
    if (positionTouched.has(k)) return false;
    positionTouched.add(k);
    return true;
  };

  for (const u of updates) {
    switch (u.kind) {
      case 'remove': {
        const t = next.tiles[idx(next.radius, u.pos.q, u.pos.r)];
        if (!t) break;
        if (!touch(u.pos)) break;
        t.creature = undefined;
        break;
      }
      case 'spawn': {
        const t = next.tiles[idx(next.radius, u.pos.q, u.pos.r)];
        if (!t) break;
        if (t.creature || t.terrain !== 'grass') break;
        if (!touch(u.pos)) break;
        const def = registry.species(u.speciesId);
        if (!def) break;
        t.creature = {
          speciesId: u.speciesId,
          energy: u.energy ?? def.energyStart ?? 4,
          age: 0,
        };
        break;
      }
      case 'move': {
        const fromTile = next.tiles[idx(next.radius, u.from.q, u.from.r)];
        const toTile = next.tiles[idx(next.radius, u.to.q, u.to.r)];
        if (!fromTile || !toTile) break;
        if (!fromTile.creature || toTile.creature || toTile.terrain !== 'grass') break;
        if (!touch(u.from) || !touch(u.to)) break;
        toTile.creature = fromTile.creature;
        fromTile.creature = undefined;
        break;
      }
      case 'setEnergy': {
        const t = next.tiles[idx(next.radius, u.pos.q, u.pos.r)];
        if (t?.creature) t.creature.energy = u.energy;
        break;
      }
      case 'setAge': {
        const t = next.tiles[idx(next.radius, u.pos.q, u.pos.r)];
        if (t?.creature) t.creature.age = u.age;
        break;
      }
      case 'transform': {
        const t = next.tiles[idx(next.radius, u.pos.q, u.pos.r)];
        if (!t?.creature) break;
        const def = registry.species(u.speciesId);
        if (!def) break;
        t.creature.speciesId = u.speciesId;
        t.creature.age = 0;
        break;
      }
      case 'setTerrain': {
        const t = next.tiles[idx(next.radius, u.pos.q, u.pos.r)];
        if (!t) break;
        t.terrain = u.terrain;
        if (u.terrain !== 'grass') t.creature = undefined;
        break;
      }
    }
  }

  return next;
}

export function placeAt(world: World, pos: Pos, speciesId: string, registry: Registry): World {
  const def = registry.species(speciesId);
  if (!def) return world;
  if (!inDisc(world.radius, pos.q, pos.r)) return world;
  const next = cloneWorld(world);
  const t = next.tiles[idx(next.radius, pos.q, pos.r)];
  if (!t) return world;
  if (def.role === 'environment' && def.terrain) {
    t.terrain = def.terrain;
    t.creature = undefined;
    return next;
  }
  if (t.terrain !== 'grass') return world;
  if (t.creature) return world;
  t.creature = {
    speciesId: def.id,
    energy: def.energyStart ?? 4,
    age: 0,
  };
  return next;
}

export function clearAt(world: World, pos: Pos): World {
  if (!inDisc(world.radius, pos.q, pos.r)) return world;
  const next = cloneWorld(world);
  const t = next.tiles[idx(next.radius, pos.q, pos.r)];
  if (!t) return world;
  t.creature = undefined;
  t.terrain = 'grass';
  return next;
}

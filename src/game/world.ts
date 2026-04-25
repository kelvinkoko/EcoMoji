import type { Pos, Tile, Update, World } from './types';
import type { Registry } from './registry';

export function idx(size: number, x: number, y: number): number {
  return y * size + x;
}

export function inBounds(size: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size;
}

export function getTile(world: World, x: number, y: number): Tile {
  return world.tiles[idx(world.size, x, y)];
}

export function neighbors(world: World, pos: Pos): Pos[] {
  const out: Pos[] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (inBounds(world.size, nx, ny)) out.push({ x: nx, y: ny });
  }
  return out;
}

export function createWorld(size: number): World {
  const tiles: Tile[] = [];
  for (let i = 0; i < size * size; i++) tiles.push({ terrain: 'grass' });
  return { size, tiles, day: 0, weather: 'sun' };
}

export function cloneWorld(world: World): World {
  return {
    size: world.size,
    day: world.day,
    weather: world.weather,
    tiles: world.tiles.map((t) => ({
      terrain: t.terrain,
      creature: t.creature ? { ...t.creature } : undefined,
    })),
  };
}

export function applyUpdates(world: World, updates: Update[], registry: Registry): World {
  const next = cloneWorld(world);
  const positionTouched = new Set<number>();

  const touch = (p: Pos): boolean => {
    const k = idx(next.size, p.x, p.y);
    if (positionTouched.has(k)) return false;
    positionTouched.add(k);
    return true;
  };

  for (const u of updates) {
    switch (u.kind) {
      case 'remove': {
        const t = next.tiles[idx(next.size, u.pos.x, u.pos.y)];
        if (!touch(u.pos)) break;
        t.creature = undefined;
        break;
      }
      case 'spawn': {
        const t = next.tiles[idx(next.size, u.pos.x, u.pos.y)];
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
        const fromTile = next.tiles[idx(next.size, u.from.x, u.from.y)];
        const toTile = next.tiles[idx(next.size, u.to.x, u.to.y)];
        if (!fromTile.creature || toTile.creature || toTile.terrain !== 'grass') break;
        if (!touch(u.from) || !touch(u.to)) break;
        toTile.creature = fromTile.creature;
        fromTile.creature = undefined;
        break;
      }
      case 'setEnergy': {
        const t = next.tiles[idx(next.size, u.pos.x, u.pos.y)];
        if (t.creature) t.creature.energy = u.energy;
        break;
      }
      case 'setAge': {
        const t = next.tiles[idx(next.size, u.pos.x, u.pos.y)];
        if (t.creature) t.creature.age = u.age;
        break;
      }
      case 'transform': {
        const t = next.tiles[idx(next.size, u.pos.x, u.pos.y)];
        if (!t.creature) break;
        const def = registry.species(u.speciesId);
        if (!def) break;
        t.creature.speciesId = u.speciesId;
        t.creature.age = 0;
        break;
      }
      case 'setTerrain': {
        const t = next.tiles[idx(next.size, u.pos.x, u.pos.y)];
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
  const next = cloneWorld(world);
  const t = next.tiles[idx(next.size, pos.x, pos.y)];
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
  const next = cloneWorld(world);
  const t = next.tiles[idx(next.size, pos.x, pos.y)];
  t.creature = undefined;
  t.terrain = 'grass';
  return next;
}

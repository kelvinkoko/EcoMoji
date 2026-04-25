import type { EndState, Group, ModeDef, World } from './types';
import type { Registry } from './registry';

export interface PopCounts {
  bySpecies: Map<string, number>;
  byGroup: Map<Group, number>;
  totalLife: number;
}

export function countPopulations(world: World, registry: Registry): PopCounts {
  const bySpecies = new Map<string, number>();
  const byGroup = new Map<Group, number>();
  let totalLife = 0;
  for (const t of world.tiles) {
    if (!t || !t.creature) continue;
    const def = registry.species(t.creature.speciesId);
    if (!def) continue;
    if (def.role === 'environment') continue;
    bySpecies.set(def.id, (bySpecies.get(def.id) ?? 0) + 1);
    byGroup.set(def.group, (byGroup.get(def.group) ?? 0) + 1);
    totalLife++;
  }
  return { bySpecies, byGroup, totalLife };
}

export function evaluateEnd(world: World, mode: ModeDef, counts: PopCounts): EndState {
  const w = mode.endWhen as any;
  const score = world.day;

  if (w.never) return { ended: false };
  if (w.allLifeExtinct) {
    if (counts.totalLife === 0 && world.day > 0) {
      return { ended: true, reason: `All life extinct on Day ${world.day}.`, score };
    }
    return { ended: false };
  }
  if (w.anyGroupReachesZero) {
    const groups = w.anyGroupReachesZero as Group[];
    for (const g of groups) {
      if ((counts.byGroup.get(g) ?? 0) === 0 && world.day > 0) {
        return { ended: true, reason: `${capitalize(g)}s went extinct on Day ${world.day}.`, score };
      }
    }
    return { ended: false };
  }
  if (w.speciesReaches) {
    const { id, count } = w.speciesReaches as { id: string; count: number };
    if ((counts.bySpecies.get(id) ?? 0) >= count) {
      return { ended: true, reason: `Reached ${count} ${id}s on Day ${world.day}!`, score };
    }
    return { ended: false };
  }
  if (w.dayReaches) {
    if (world.day >= w.dayReaches) {
      return { ended: true, reason: `Reached Day ${world.day}.`, score };
    }
    return { ended: false };
  }
  return { ended: false };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

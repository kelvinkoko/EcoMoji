export interface RNG {
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: T[]): T | undefined;
  chance(p: number): boolean;
}

export function createRng(seed: number): RNG {
  let state = (seed >>> 0) || 0xc0ffee;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max) => Math.floor(next() * max),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
    chance: (p) => next() < p,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Registry } from '../game/registry';
import { createRng } from '../game/rng';
import { tick } from '../game/simulation';
import type { EndState, ModeDef, Pack, Pos, World } from '../game/types';
import { clearAt, createWorld, placeAt } from '../game/world';
import { countPopulations, evaluateEnd, type PopCounts } from '../game/endConditions';
import { applySeed } from '../game/seed';

const TICK_MS = 600;

export interface SimState {
  world: World;
  paused: boolean;
  speed: number;
  end: EndState;
  counts: PopCounts;
  registry: Registry;
  togglePause(): void;
  setSpeed(n: number): void;
  step(): void;
  reset(): void;
  place(pos: Pos, speciesId: string): void;
  erase(pos: Pos): void;
}

export function useSimulation(pack: Pack, mode: ModeDef, radius: number): SimState {
  const registry = useMemo(() => new Registry(pack), [pack]);
  const rngRef = useRef(createRng(Date.now() & 0xffffffff));
  const buildInitial = useCallback(() => {
    const blank = createWorld(radius);
    return pack.seed ? applySeed(blank, pack.seed, registry, rngRef.current) : blank;
  }, [pack, registry, radius]);
  const [world, setWorld] = useState<World>(buildInitial);
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState(1);

  const counts = useMemo(() => countPopulations(world, registry), [world, registry]);
  const end = useMemo(() => evaluateEnd(world, mode, counts), [world, mode, counts]);

  useEffect(() => {
    if (paused || end.ended) return;
    const interval = TICK_MS / speed;
    const id = window.setInterval(() => {
      setWorld((w) => tick(w, registry, rngRef.current));
    }, interval);
    return () => window.clearInterval(id);
  }, [paused, speed, registry, end.ended]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const step = useCallback(() => {
    setWorld((w) => tick(w, registry, rngRef.current));
  }, [registry]);
  const reset = useCallback(() => {
    rngRef.current = createRng(Date.now() & 0xffffffff);
    setWorld(buildInitial());
    setPaused(true);
  }, [buildInitial]);

  const place = useCallback(
    (pos: Pos, speciesId: string) => {
      setWorld((w) => placeAt(w, pos, speciesId, registry));
    },
    [registry]
  );

  const erase = useCallback((pos: Pos) => {
    setWorld((w) => clearAt(w, pos));
  }, []);

  return {
    world,
    paused,
    speed,
    end,
    counts,
    registry,
    togglePause,
    setSpeed,
    step,
    reset,
    place,
    erase,
  };
}

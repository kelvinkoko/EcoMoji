import type { ModeDef, Pack, SpeciesDef } from './types';

export class Registry {
  private speciesById = new Map<string, SpeciesDef>();
  readonly pack: Pack;

  constructor(pack: Pack) {
    this.pack = pack;
    for (const s of pack.species) this.speciesById.set(s.id, s);
  }

  species(id: string): SpeciesDef | undefined {
    return this.speciesById.get(id);
  }

  allSpecies(): SpeciesDef[] {
    return this.pack.species;
  }

  placeable(): SpeciesDef[] {
    return this.pack.species.filter((s) => s.placeable);
  }

  modes(): ModeDef[] {
    return this.pack.modes;
  }

  mode(id: string): ModeDef | undefined {
    return this.pack.modes.find((m) => m.id === id);
  }
}

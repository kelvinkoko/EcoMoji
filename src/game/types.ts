export type Terrain = 'grass' | 'water' | 'rock';
export type Role = 'producer' | 'consumer' | 'environment';
export type Group = 'plant' | 'herbivore' | 'carnivore' | 'environment';

export interface SpeciesDef {
  id: string;
  emoji: string;
  label: string;
  group: Group;
  role: Role;
  placeable: boolean;
  blocksPlacement?: boolean;
  terrain?: Terrain;
  needs?: { sun?: boolean; waterNeighbor?: boolean };
  spreadChance?: number;
  matureAge?: number;
  growsInto?: string;
  diet?: string[];
  energyStart?: number;
  energyPerEat?: number;
  energyPerTick?: number;
  reproThreshold?: number;
  lifespan?: number;
  speed?: number;
  behaviors?: string[];
}

export type EndWhen =
  | { never: true }
  | { allLifeExtinct: true }
  | { anyGroupReachesZero: Group[] }
  | { speciesReaches: { id: string; count: number } }
  | { dayReaches: number };

export interface ModeDef {
  id: string;
  label: string;
  description: string;
  endWhen: EndWhen;
  score: 'days';
}

export interface SeedScatter {
  speciesId: string;
  count: number;
}

export interface SeedWaterCluster {
  center: [number, number];
  size?: number;
}

export interface SeedDef {
  waterClusters?: SeedWaterCluster[];
  rocks?: number;
  plantsNearWater?: SeedScatter[];
  scatter?: SeedScatter[];
}

export interface Pack {
  name: string;
  version: string;
  species: SpeciesDef[];
  modes: ModeDef[];
  seed?: SeedDef;
}

export interface PackManifest {
  name: string;
  version: string;
  species: string[];
  modes: string[];
  scripts?: string[];
  seed?: string;
}

export interface Creature {
  speciesId: string;
  energy: number;
  age: number;
}

export interface Tile {
  terrain: Terrain;
  creature?: Creature;
}

export interface Pos {
  q: number;
  r: number;
}

export interface World {
  radius: number;
  tiles: (Tile | null)[];
  day: number;
  weather: 'sun' | 'clouds' | 'rain' | 'storm';
}

export type Update =
  | { kind: 'spawn'; pos: Pos; speciesId: string; energy?: number }
  | { kind: 'remove'; pos: Pos }
  | { kind: 'move'; from: Pos; to: Pos }
  | { kind: 'setEnergy'; pos: Pos; energy: number }
  | { kind: 'setAge'; pos: Pos; age: number }
  | { kind: 'transform'; pos: Pos; speciesId: string }
  | { kind: 'setTerrain'; pos: Pos; terrain: Terrain }
  | { kind: 'ignite'; pos: Pos; speciesId: string; energy?: number };

export interface EndState {
  ended: boolean;
  reason?: string;
  score?: number;
}

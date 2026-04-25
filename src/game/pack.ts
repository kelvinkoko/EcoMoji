import type { ModeDef, Pack, PackManifest, SeedDef, SpeciesDef } from './types';

export class PackError extends Error {
  constructor(public file: string, public field: string, message: string) {
    super(`[${file}${field ? ' / ' + field : ''}] ${message}`);
  }
}

const VALID_ROLES = new Set(['producer', 'consumer', 'environment']);
const VALID_GROUPS = new Set(['plant', 'herbivore', 'carnivore', 'environment', 'atmosphere']);
const VALID_TERRAINS = new Set(['grass', 'water', 'rock']);
const VALID_LAYERS = new Set(['tile', 'atmosphere']);

function requireField<T>(obj: any, key: string, file: string): T {
  if (obj == null || obj[key] === undefined || obj[key] === null) {
    throw new PackError(file, key, 'missing required field');
  }
  return obj[key];
}

function validateSpecies(raw: unknown, file: string, index: number): SpeciesDef {
  if (typeof raw !== 'object' || raw === null) {
    throw new PackError(file, `[${index}]`, 'expected an object');
  }
  const r = raw as Record<string, unknown>;
  const id = requireField<string>(r, 'id', file);
  const path = `[${index}:${id}]`;
  if (typeof id !== 'string') throw new PackError(file, `${path}.id`, 'must be a string');
  const role = requireField<string>(r, 'role', file);
  if (!VALID_ROLES.has(role)) throw new PackError(file, `${path}.role`, `must be one of producer|consumer|environment`);
  const group = requireField<string>(r, 'group', file);
  if (!VALID_GROUPS.has(group)) throw new PackError(file, `${path}.group`, 'must be plant|herbivore|carnivore|environment');
  if (r.terrain !== undefined && !VALID_TERRAINS.has(r.terrain as string)) {
    throw new PackError(file, `${path}.terrain`, 'must be grass|water|rock');
  }
  if (r.layer !== undefined && !VALID_LAYERS.has(r.layer as string)) {
    throw new PackError(file, `${path}.layer`, 'must be tile|atmosphere');
  }
  if (typeof r.emoji !== 'string') throw new PackError(file, `${path}.emoji`, 'must be a string');
  if (typeof r.label !== 'string') throw new PackError(file, `${path}.label`, 'must be a string');
  if (typeof r.placeable !== 'boolean') throw new PackError(file, `${path}.placeable`, 'must be a boolean');
  if (r.migrate !== undefined) {
    const m = r.migrate as Record<string, unknown>;
    if (typeof m !== 'object' || m === null) {
      throw new PackError(file, `${path}.migrate`, 'must be an object');
    }
    if (typeof m.chance !== 'number') {
      throw new PackError(file, `${path}.migrate.chance`, 'must be a number');
    }
    if (m.whenBelow !== undefined && typeof m.whenBelow !== 'number') {
      throw new PackError(file, `${path}.migrate.whenBelow`, 'must be a number');
    }
    if (m.needsDiet !== undefined && typeof m.needsDiet !== 'number') {
      throw new PackError(file, `${path}.migrate.needsDiet`, 'must be a number');
    }
  }
  return r as unknown as SpeciesDef;
}

function validateMode(raw: unknown, file: string): ModeDef {
  if (typeof raw !== 'object' || raw === null) throw new PackError(file, '', 'expected an object');
  const r = raw as Record<string, unknown>;
  const id = requireField<string>(r, 'id', file);
  if (typeof id !== 'string') throw new PackError(file, 'id', 'must be a string');
  if (typeof r.label !== 'string') throw new PackError(file, 'label', 'must be a string');
  if (typeof r.description !== 'string') throw new PackError(file, 'description', 'must be a string');
  if (typeof r.endWhen !== 'object' || r.endWhen === null) throw new PackError(file, 'endWhen', 'must be an object');
  return r as unknown as ModeDef;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new PackError(url, '', `HTTP ${res.status} ${res.statusText}`);
  try {
    return await res.json();
  } catch (e) {
    throw new PackError(url, '', `invalid JSON: ${(e as Error).message}`);
  }
}

function resolveAgainst(base: string, path: string): string {
  try {
    return new URL(path, new URL(base, window.location.href)).toString();
  } catch {
    return path;
  }
}

export async function loadPackFromManifest(manifestUrl: string): Promise<Pack> {
  const manifest = (await fetchJson(manifestUrl)) as PackManifest;
  if (typeof manifest.name !== 'string') throw new PackError(manifestUrl, 'name', 'must be a string');
  if (!Array.isArray(manifest.species)) throw new PackError(manifestUrl, 'species', 'must be an array of paths');
  if (!Array.isArray(manifest.modes)) throw new PackError(manifestUrl, 'modes', 'must be an array of paths');

  const species: SpeciesDef[] = [];
  const seen = new Set<string>();
  for (const rawPath of manifest.species) {
    const path = resolveAgainst(manifestUrl, rawPath);
    const arr = await fetchJson(path);
    if (!Array.isArray(arr)) throw new PackError(path, '', 'expected a JSON array of species');
    arr.forEach((raw, i) => {
      const def = validateSpecies(raw, path, i);
      if (seen.has(def.id)) throw new PackError(path, `[${i}].id`, `duplicate species id "${def.id}"`);
      seen.add(def.id);
      species.push(def);
    });
  }

  const modes: ModeDef[] = [];
  const modeIds = new Set<string>();
  for (const rawPath of manifest.modes) {
    const path = resolveAgainst(manifestUrl, rawPath);
    const raw = await fetchJson(path);
    const mode = validateMode(raw, path);
    if (modeIds.has(mode.id)) throw new PackError(path, 'id', `duplicate mode id "${mode.id}"`);
    modeIds.add(mode.id);
    modes.push(mode);
  }

  if (manifest.scripts && manifest.scripts.length > 0) {
    for (const rawSrc of manifest.scripts) {
      const src = resolveAgainst(manifestUrl, rawSrc);
      await new Promise<void>((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = src;
        tag.onload = () => resolve();
        tag.onerror = () => reject(new PackError(src, '', 'failed to load script'));
        document.head.appendChild(tag);
      });
    }
  }

  let seed: SeedDef | undefined;
  if (manifest.seed) {
    const seedPath = resolveAgainst(manifestUrl, manifest.seed);
    const raw = await fetchJson(seedPath);
    seed = validateSeed(raw, seedPath);
  }

  return { name: manifest.name, version: manifest.version ?? '0.0.0', species, modes, seed };
}

function validateSeed(raw: unknown, file: string): SeedDef {
  if (typeof raw !== 'object' || raw === null) throw new PackError(file, '', 'expected an object');
  const r = raw as Record<string, unknown>;
  const out: SeedDef = {};
  if (r.waterClusters !== undefined) {
    if (!Array.isArray(r.waterClusters)) throw new PackError(file, 'waterClusters', 'must be an array');
    out.waterClusters = r.waterClusters.map((c: any, i: number) => {
      if (!Array.isArray(c.center) || c.center.length !== 2) {
        throw new PackError(file, `waterClusters[${i}].center`, 'must be [x, y]');
      }
      return { center: [Number(c.center[0]), Number(c.center[1])], size: c.size != null ? Number(c.size) : undefined };
    });
  }
  if (r.rocks !== undefined) {
    if (typeof r.rocks !== 'number') throw new PackError(file, 'rocks', 'must be a number');
    out.rocks = r.rocks;
  }
  if (r.forests !== undefined) {
    if (!Array.isArray(r.forests)) throw new PackError(file, 'forests', 'must be an array');
    out.forests = r.forests.map((f: any, i: number) => {
      if (!Array.isArray(f.center) || f.center.length !== 2) {
        throw new PackError(file, `forests[${i}].center`, 'must be [x, y]');
      }
      if (typeof f.speciesId !== 'string') {
        throw new PackError(file, `forests[${i}].speciesId`, 'must be a string');
      }
      return {
        center: [Number(f.center[0]), Number(f.center[1])] as [number, number],
        size: f.size != null ? Number(f.size) : undefined,
        speciesId: f.speciesId,
      };
    });
  }
  for (const key of ['plantsNearWater', 'scatter'] as const) {
    if (r[key] !== undefined) {
      if (!Array.isArray(r[key])) throw new PackError(file, key, 'must be an array');
      out[key] = (r[key] as any[]).map((s: any, i: number) => {
        if (typeof s.speciesId !== 'string') throw new PackError(file, `${key}[${i}].speciesId`, 'must be a string');
        if (typeof s.count !== 'number') throw new PackError(file, `${key}[${i}].count`, 'must be a number');
        return { speciesId: s.speciesId, count: s.count };
      });
    }
  }
  return out;
}

export function mergePacks(base: Pack, overlay: Partial<Pack>): Pack {
  const speciesMap = new Map<string, SpeciesDef>();
  for (const s of base.species) speciesMap.set(s.id, s);
  for (const s of overlay.species ?? []) speciesMap.set(s.id, s);
  const modesMap = new Map<string, ModeDef>();
  for (const m of base.modes) modesMap.set(m.id, m);
  for (const m of overlay.modes ?? []) modesMap.set(m.id, m);
  return {
    name: overlay.name ?? base.name,
    version: overlay.version ?? base.version,
    species: [...speciesMap.values()],
    modes: [...modesMap.values()],
    seed: overlay.seed ?? base.seed,
  };
}

export async function loadPackFromFile(file: File): Promise<Partial<Pack>> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new PackError(file.name, '', `invalid JSON: ${(e as Error).message}`);
  }
  const result: Partial<Pack> = {};
  if (parsed.name) result.name = parsed.name;
  if (parsed.version) result.version = parsed.version;
  if (Array.isArray(parsed.species)) {
    result.species = parsed.species.map((raw: unknown, i: number) => validateSpecies(raw, file.name, i));
  }
  if (Array.isArray(parsed.modes)) {
    result.modes = parsed.modes.map((raw: unknown) => validateMode(raw, file.name));
  }
  if (parsed.seed !== undefined) {
    result.seed = validateSeed(parsed.seed, file.name);
  }
  return result;
}

export function exportPack(pack: Pack): string {
  return JSON.stringify(pack, null, 2);
}

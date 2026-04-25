import type { Registry } from '../game/registry';
import type { SpeciesDef } from '../game/types';

export function describeSpecies(def: SpeciesDef, registry: Registry): string[] {
  const lines: string[] = [];

  switch (def.role) {
    case 'producer': {
      const head: string[] = ['Plant'];
      if (def.spreadChance && def.spreadChance >= 0.06) head.push('spreads quickly');
      else if (def.spreadChance) head.push('spreads slowly');
      lines.push(head.join(' · '));
      lines.push(def.needs?.waterNeighbor ? 'Needs water nearby' : 'Drought-tolerant');
      if (def.growsInto) {
        const next = registry.species(def.growsInto);
        if (next) lines.push(`Grows into ${next.emoji} ${next.label}`);
      }
      const eaters = findEaters(def.id, registry);
      if (eaters.length > 0) {
        lines.push(`Eaten by ${eaters.map((s) => `${s.emoji} ${s.label}`).join(', ')}`);
      }
      if (def.lifespan) lines.push(`Lives ~${def.lifespan} days`);
      break;
    }

    case 'consumer': {
      lines.push(def.group === 'herbivore' ? 'Herbivore' : 'Carnivore');
      if (def.diet && def.diet.length > 0) {
        const prey = def.diet
          .map((id) => registry.species(id))
          .filter((s): s is SpeciesDef => !!s)
          .map((s) => `${s.emoji} ${s.label}`);
        if (prey.length > 0) lines.push(`Eats ${prey.join(', ')}`);
      }
      const eaters = findEaters(def.id, registry);
      if (eaters.length > 0) {
        lines.push(`Hunted by ${eaters.map((s) => `${s.emoji} ${s.label}`).join(', ')}`);
      }
      if (def.lifespan) lines.push(`Lives ~${def.lifespan} days`);
      lines.push('Breeds when well fed');
      break;
    }

    case 'environment': {
      if (def.layer === 'atmosphere') {
        if (def.id === 'cloud') {
          lines.push('Drifts on the wind');
          lines.push('Matures into 🌧️ Rain');
          lines.push('Plants below still get diffuse sun');
        } else if (def.id === 'rain') {
          lines.push('Drifts on the wind');
          lines.push('Floods grass next to water');
          lines.push('Matures into ⛈️ Storm');
        } else if (def.id === 'storm') {
          lines.push('Drifts on the wind');
          lines.push('Heavy rain can pool new water');
          lines.push('Lightning can ignite plants below');
        } else {
          lines.push('Drifts on the wind');
        }
        if (def.lifespan) lines.push(`Lasts ~${def.lifespan} ticks`);
      } else if (def.terrain === 'water') {
        lines.push('Water tile');
        lines.push('Plants thrive at the edges');
        lines.push('Evaporates into clouds overhead');
      } else if (def.terrain === 'rock') {
        lines.push('Rock tile');
        lines.push('Nothing can live on it');
      } else if (def.id === 'fire') {
        lines.push('Burns plants and spreads to neighbors');
        lines.push('Started by lightning during storms');
        lines.push('Rain puts it out faster');
      }
      break;
    }
  }

  return lines;
}

function findEaters(speciesId: string, registry: Registry): SpeciesDef[] {
  const out: SpeciesDef[] = [];
  for (const s of registry.allSpecies()) {
    if (s.diet?.includes(speciesId)) out.push(s);
  }
  return out;
}

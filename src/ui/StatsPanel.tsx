import type { Group, ModeDef } from '../game/types';
import type { Registry } from '../game/registry';
import type { PopCounts } from '../game/endConditions';

interface Props {
  registry: Registry;
  counts: PopCounts;
  mode: ModeDef;
}

const GROUP_ORDER: Group[] = ['plant', 'herbivore', 'carnivore'];
const GROUP_LABELS: Record<Group, string> = {
  plant: 'Plants',
  herbivore: 'Herbivores',
  carnivore: 'Carnivores',
  environment: 'Environment',
  atmosphere: 'Atmosphere',
};

export function StatsPanel({ registry, counts, mode }: Props) {
  const grouped = new Map<Group, { id: string; emoji: string; label: string; count: number }[]>();
  for (const def of registry.allSpecies()) {
    if (def.role === 'environment') continue;
    const arr = grouped.get(def.group) ?? [];
    arr.push({
      id: def.id,
      emoji: def.emoji,
      label: def.label,
      count: counts.bySpecies.get(def.id) ?? 0,
    });
    grouped.set(def.group, arr);
  }

  return (
    <aside className="stats-panel">
      <section className="goal">
        <h2>Goal</h2>
        <p>{mode.description}</p>
      </section>
      <section className="counts">
        <h2>Populations</h2>
        {GROUP_ORDER.map((g) => {
          const list = grouped.get(g);
          if (!list) return null;
          const total = counts.byGroup.get(g) ?? 0;
          return (
            <div key={g} className="count-group">
              <h3>
                {GROUP_LABELS[g]} <span className="group-total">{total}</span>
              </h3>
              <ul>
                {list.map((s) => (
                  <li key={s.id}>
                    <span className="emoji">{s.emoji}</span> {s.label}
                    <span className="count">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <div className="count-total">Total life: {counts.totalLife}</div>
      </section>
    </aside>
  );
}

import type { Registry } from '../game/registry';
import type { Group, SpeciesDef } from '../game/types';

interface Props {
  registry: Registry;
  selected: string;
  onSelect: (id: string) => void;
}

const GROUP_ORDER: Group[] = ['plant', 'herbivore', 'carnivore', 'environment'];
const GROUP_LABELS: Record<Group, string> = {
  plant: 'Plants',
  herbivore: 'Herbivores',
  carnivore: 'Carnivores',
  environment: 'Environment',
};

export function Toolbar({ registry, selected, onSelect }: Props) {
  const placeable = registry.placeable();
  const grouped = new Map<Group, SpeciesDef[]>();
  for (const s of placeable) {
    const arr = grouped.get(s.group) ?? [];
    arr.push(s);
    grouped.set(s.group, arr);
  }

  return (
    <aside className="toolbar">
      <h2>Palette</h2>
      <button
        className={'tool tool-erase' + (selected === 'erase' ? ' selected' : '')}
        onClick={() => onSelect('erase')}
      >
        <span className="tool-emoji">🧽</span> Erase
      </button>

      {GROUP_ORDER.map((g) => {
        const list = grouped.get(g);
        if (!list || list.length === 0) return null;
        return (
          <div key={g} className="tool-group">
            <h3>{GROUP_LABELS[g]}</h3>
            <div className="tool-list">
              {list.map((s) => (
                <button
                  key={s.id}
                  className={'tool' + (selected === s.id ? ' selected' : '')}
                  onClick={() => onSelect(s.id)}
                  title={s.label}
                >
                  <span className="tool-emoji">{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

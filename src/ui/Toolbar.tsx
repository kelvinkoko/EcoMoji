import type { Registry } from '../game/registry';
import type { Group, SpeciesDef } from '../game/types';
import { describeSpecies } from './describe';

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

const ERASE_TOOLTIP = ['Eraser', 'Removes the creature or terrain on a tile'];

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
        <Tooltip title="Eraser" lines={ERASE_TOOLTIP.slice(1)} />
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
                >
                  <span className="tool-emoji">{s.emoji}</span> {s.label}
                  <Tooltip title={`${s.emoji} ${s.label}`} lines={describeSpecies(s, registry)} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function Tooltip({ title, lines }: { title: string; lines: string[] }) {
  return (
    <span className="tool-tip" role="tooltip">
      <span className="tool-tip-title">{title}</span>
      {lines.map((l, i) => (
        <span key={i} className="tool-tip-line">
          {l}
        </span>
      ))}
    </span>
  );
}

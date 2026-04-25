import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Registry } from '../game/registry';
import type { Group, SpeciesDef } from '../game/types';
import { describeSpecies } from './describe';

interface Props {
  registry: Registry;
  selected: string;
  onSelect: (id: string) => void;
}

const GROUP_ORDER: Group[] = ['plant', 'herbivore', 'carnivore', 'aquatic', 'environment', 'atmosphere'];
const GROUP_LABELS: Record<Group, string> = {
  plant: 'Plants',
  herbivore: 'Herbivores',
  carnivore: 'Carnivores',
  aquatic: 'Aquatic',
  environment: 'Environment',
  atmosphere: 'Atmosphere',
};

const ERASE_TIP = ['Removes the creature or terrain on a tile'];

interface HoverState {
  title: string;
  lines: string[];
  x: number;
  y: number;
}

export function Toolbar({ registry, selected, onSelect }: Props) {
  const placeable = registry.placeable();
  const grouped = new Map<Group, SpeciesDef[]>();
  for (const s of placeable) {
    const arr = grouped.get(s.group) ?? [];
    arr.push(s);
    grouped.set(s.group, arr);
  }

  const [hover, setHover] = useState<HoverState | null>(null);

  const showFor = (
    e: React.MouseEvent<HTMLButtonElement>,
    title: string,
    lines: string[]
  ) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ title, lines, x: r.right + 10, y: r.top + r.height / 2 });
  };

  const hide = () => setHover(null);

  return (
    <aside className="toolbar">
      <h2>Palette</h2>
      <div className="tool-grid">
        <button
          className={'tool tool-erase' + (selected === 'erase' ? ' selected' : '')}
          onClick={() => onSelect('erase')}
          onMouseEnter={(e) => showFor(e, '🧽 Eraser', ERASE_TIP)}
          onMouseLeave={hide}
          onFocus={(e) => showFor(e as unknown as React.MouseEvent<HTMLButtonElement>, '🧽 Eraser', ERASE_TIP)}
          onBlur={hide}
          aria-label="Eraser"
        >
          <span className="tool-emoji">🧽</span>
        </button>
      </div>

      {GROUP_ORDER.map((g) => {
        const list = grouped.get(g);
        if (!list || list.length === 0) return null;
        return (
          <div key={g} className="tool-group">
            <h3>{GROUP_LABELS[g]}</h3>
            <div className="tool-grid">
              {list.map((s) => {
                const lines = describeSpecies(s, registry);
                const title = `${s.emoji} ${s.label}`;
                return (
                  <button
                    key={s.id}
                    className={'tool' + (selected === s.id ? ' selected' : '')}
                    onClick={() => onSelect(s.id)}
                    onMouseEnter={(e) => showFor(e, title, lines)}
                    onMouseLeave={hide}
                    onFocus={(e) => showFor(e as unknown as React.MouseEvent<HTMLButtonElement>, title, lines)}
                    onBlur={hide}
                    aria-label={s.label}
                  >
                    <span className="tool-emoji">{s.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {hover && createPortal(
        <div
          className="tool-tip"
          role="tooltip"
          style={{ left: hover.x, top: hover.y }}
        >
          <span className="tool-tip-title">{hover.title}</span>
          {hover.lines.map((l, i) => (
            <span key={i} className="tool-tip-line">
              {l}
            </span>
          ))}
        </div>,
        document.body
      )}
    </aside>
  );
}

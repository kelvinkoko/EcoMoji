import { useRef, useState } from 'react';
import type { ModeDef, Pack } from '../game/types';
import { exportPack } from '../game/pack';

interface Props {
  pack: Pack;
  onStart: (mode: ModeDef, radius: number) => void;
  onImportFile: (file: File) => Promise<void>;
}

export function StartScreen({ pack, onStart, onImportFile }: Props) {
  const [radius, setRadius] = useState(10);
  const fileInput = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const text = exportPack(pack);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pack.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="start-screen">
      <header className="start-header">
        <h1>🌳 EcoMoji</h1>
        <p>An emoji ecosystem simulator. Build a world. Watch it live.</p>
      </header>

      <section className="modes">
        <h2>Choose a mode</h2>
        <div className="mode-grid">
          {pack.modes.map((m) => (
            <button key={m.id} className="mode-card" onClick={() => onStart(m, radius)}>
              <h3>{m.label}</h3>
              <p>{m.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="settings">
        <label>
          World size:&nbsp;
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            <option value={7}>Small (169 hexes)</option>
            <option value={10}>Medium (331 hexes)</option>
            <option value={13}>Large (547 hexes)</option>
          </select>
        </label>
      </section>

      <section className="pack-info">
        <h2>Pack: {pack.name}</h2>
        <p>
          {pack.species.length} species · {pack.modes.length} modes · v{pack.version}
        </p>
        <div className="pack-buttons">
          <button onClick={() => fileInput.current?.click()}>Import pack…</button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
          <button onClick={onExport}>Export pack</button>
        </div>
        <details className="species-list">
          <summary>Loaded species</summary>
          <ul>
            {pack.species.map((s) => (
              <li key={s.id}>
                <span className="emoji">{s.emoji}</span> {s.label}{' '}
                <code>{s.id}</code>
                <small> · {s.group}</small>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <footer className="start-footer">
        <p>
          Edit <code>public/config/*.json</code> and refresh to mod the game — no rebuild needed.
        </p>
      </footer>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ModeDef, Pack } from '../game/types';
import { exportPack } from '../game/pack';
import { useSimulation } from '../hooks/useSimulation';
import { Grid } from './Grid';

interface Props {
  pack: Pack;
  onStart: (mode: ModeDef, radius: number) => void;
  onImportFile: (file: File) => Promise<void>;
}

const PREVIEW_RADIUS = 5;

const SIZE_OPTIONS: { radius: number; label: string }[] = [
  { radius: 7, label: 'Small' },
  { radius: 10, label: 'Medium' },
  { radius: 13, label: 'Large' },
];

function PreviewWorld({ pack }: { pack: Pack }) {
  const previewMode = useMemo<ModeDef>(
    () => ({
      id: '__preview__',
      label: 'Preview',
      description: '',
      endWhen: { never: true },
      score: 'days',
    }),
    []
  );
  const sim = useSimulation(pack, previewMode, PREVIEW_RADIUS);
  const { paused, togglePause, reset, counts } = sim;

  useEffect(() => {
    if (paused) togglePause();
  }, [paused, togglePause]);

  useEffect(() => {
    if (counts.totalLife === 0) {
      const id = window.setTimeout(() => reset(), 1500);
      return () => window.clearTimeout(id);
    }
  }, [counts.totalLife, reset]);

  return (
    <div className="landing-preview" aria-hidden="true">
      <Grid world={sim.world} registry={sim.registry} onTileClick={() => {}} />
    </div>
  );
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
    <div className="landing">
      <header className="landing-hero">
        <h1>🌳 EcoMoji</h1>
        <p>Build an ecosphere with emoji and watch it live.</p>
      </header>

      <PreviewWorld pack={pack} />

      <section className="landing-section">
        <h2>World size</h2>
        <div className="size-row">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.radius}
              className={'size-chip' + (radius === opt.radius ? ' selected' : '')}
              onClick={() => setRadius(opt.radius)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>Pick a mode to start</h2>
        <div className="mode-grid">
          {pack.modes.map((m) => (
            <button key={m.id} className="mode-card" onClick={() => onStart(m, radius)}>
              <h3>{m.label}</h3>
              <p>{m.description}</p>
            </button>
          ))}
        </div>
      </section>

      <details className="landing-advanced">
        <summary>Mod the game</summary>
        <p>
          {pack.name} · {pack.species.length} species · {pack.modes.length} modes · v{pack.version}
        </p>
        <p className="muted">
          Edit <code>public/config/*.json</code> and refresh — no rebuild needed.
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
      </details>
    </div>
  );
}

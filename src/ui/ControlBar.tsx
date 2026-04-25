import type { ModeDef } from '../game/types';

interface Props {
  mode: ModeDef;
  day: number;
  weather: 'sun' | 'rain';
  paused: boolean;
  speed: number;
  onTogglePause: () => void;
  onSetSpeed: (n: number) => void;
  onStep: () => void;
  onReset: () => void;
  onExit: () => void;
}

export function ControlBar(p: Props) {
  return (
    <header className="control-bar">
      <button onClick={p.onExit} title="Back to start screen">←</button>
      <div className="control-mode">{p.mode.label}</div>
      <button onClick={p.onTogglePause} className="control-play">
        {p.paused ? '▶ Play' : '⏸ Pause'}
      </button>
      {p.paused && <button onClick={p.onStep} title="Step one tick">⏭ Step</button>}
      <div className="control-speed">
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            className={p.speed === s ? 'selected' : ''}
            onClick={() => p.onSetSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
      <div className="control-day">
        Day {p.day} {p.weather === 'rain' ? '🌧️' : '☀️'}
      </div>
      <button onClick={p.onReset}>🔄 Reset</button>
    </header>
  );
}

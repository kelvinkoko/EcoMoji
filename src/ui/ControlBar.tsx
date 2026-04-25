import type { ModeDef, WeatherKind } from '../game/types';

interface Props {
  mode: ModeDef;
  day: number;
  weather: WeatherKind;
  paused: boolean;
  speed: number;
  onTogglePause: () => void;
  onSetSpeed: (n: number) => void;
  onStep: () => void;
  onReset: () => void;
  onExit: () => void;
}

const WEATHER_EMOJI: Record<WeatherKind, string> = {
  sun: '☀️',
  clouds: '☁️',
  rain: '🌧️',
  storm: '⛈️',
};
const WEATHER_LABEL: Record<WeatherKind, string> = {
  sun: 'Sunny',
  clouds: 'Cloudy',
  rain: 'Raining — lakes may grow',
  storm: 'Storm — lightning may strike',
};

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
      <div className="control-day" title={WEATHER_LABEL[p.weather]}>
        Day {p.day} {WEATHER_EMOJI[p.weather]}
      </div>
      <button onClick={p.onReset} title="Roll a fresh seed, wind, and weather">🌍 New world</button>
    </header>
  );
}

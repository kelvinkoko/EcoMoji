import { useState } from 'react';
import { usePack } from './hooks/usePack';
import { StartScreen } from './ui/StartScreen';
import { GameScreen } from './ui/GameScreen';
import { PackErrorOverlay } from './ui/PackErrorOverlay';
import type { ModeDef } from './game/types';

interface RunConfig {
  mode: ModeDef;
  radius: number;
}

export default function App() {
  const packState = usePack();
  const [run, setRun] = useState<RunConfig | null>(null);

  if (packState.error) {
    return <PackErrorOverlay error={packState.error} onRetry={packState.reload} />;
  }
  if (packState.loading || !packState.pack) {
    return (
      <div className="loading">
        <div className="loading-emoji">🌱</div>
        <div>Loading EcoMoji…</div>
      </div>
    );
  }

  if (!run) {
    return (
      <StartScreen
        pack={packState.pack}
        onStart={(mode, radius) => setRun({ mode, radius })}
        onImportFile={packState.importFile}
      />
    );
  }

  return (
    <GameScreen
      pack={packState.pack}
      mode={run.mode}
      radius={run.radius}
      onExit={() => setRun(null)}
    />
  );
}

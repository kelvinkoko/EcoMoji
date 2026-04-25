import { useState } from 'react';
import type { ModeDef, Pack } from '../game/types';
import { useSimulation } from '../hooks/useSimulation';
import { Toolbar } from './Toolbar';
import { Grid } from './Grid';
import { ControlBar } from './ControlBar';
import { StatsPanel } from './StatsPanel';
import { EndOverlay } from './EndOverlay';

interface Props {
  pack: Pack;
  mode: ModeDef;
  size: number;
  onExit: () => void;
}

export function GameScreen({ pack, mode, size, onExit }: Props) {
  const sim = useSimulation(pack, mode, size);
  const [selectedTool, setSelectedTool] = useState<string>('erase');

  const onTileClick = (x: number, y: number) => {
    if (selectedTool === 'erase') {
      sim.erase({ x, y });
      return;
    }
    sim.place({ x, y }, selectedTool);
  };

  return (
    <div className="game-screen">
      <ControlBar
        mode={mode}
        day={sim.world.day}
        weather={sim.world.weather}
        paused={sim.paused}
        speed={sim.speed}
        onTogglePause={sim.togglePause}
        onSetSpeed={sim.setSpeed}
        onStep={sim.step}
        onReset={sim.reset}
        onExit={onExit}
      />
      <div className="game-body">
        <Toolbar registry={sim.registry} selected={selectedTool} onSelect={setSelectedTool} />
        <Grid world={sim.world} registry={sim.registry} onTileClick={onTileClick} />
        <StatsPanel registry={sim.registry} counts={sim.counts} mode={mode} />
      </div>
      {sim.end.ended && (
        <EndOverlay
          reason={sim.end.reason ?? 'Game over.'}
          score={sim.end.score ?? 0}
          onPlayAgain={sim.reset}
          onExit={onExit}
        />
      )}
    </div>
  );
}

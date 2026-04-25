import { memo } from 'react';
import type { World } from '../game/types';
import type { Registry } from '../game/registry';
import { TileView } from './Tile';

interface Props {
  world: World;
  registry: Registry;
  onTileClick: (x: number, y: number) => void;
}

export const Grid = memo(function Grid({ world, registry, onTileClick }: Props) {
  const cells: JSX.Element[] = [];
  for (let y = 0; y < world.size; y++) {
    for (let x = 0; x < world.size; x++) {
      const tile = world.tiles[y * world.size + x];
      cells.push(
        <TileView
          key={`${x}-${y}`}
          tile={tile}
          registry={registry}
          onClick={() => onTileClick(x, y)}
        />
      );
    }
  }
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${world.size}, 1fr)` }}
    >
      {cells}
    </div>
  );
});

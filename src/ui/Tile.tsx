import { memo } from 'react';
import type { Tile } from '../game/types';
import type { Registry } from '../game/registry';

interface Props {
  tile: Tile;
  registry: Registry;
  onClick: () => void;
}

export const TileView = memo(function TileView({ tile, registry, onClick }: Props) {
  let content = '';
  if (tile.creature) {
    content = registry.species(tile.creature.speciesId)?.emoji ?? '';
  }
  const cls = ['tile', `terrain-${tile.terrain}`];
  return (
    <button className={cls.join(' ')} onClick={onClick} aria-label={`tile ${tile.terrain}`}>
      <span className="tile-content">{content}</span>
    </button>
  );
});

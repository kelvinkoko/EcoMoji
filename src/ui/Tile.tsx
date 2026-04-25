import { memo } from 'react';
import type { Tile } from '../game/types';
import type { Registry } from '../game/registry';

interface Props {
  tile: Tile;
  registry: Registry;
  cx: number;
  cy: number;
  corners: string;
  onPress: () => void;
  onEnter: () => void;
}

export const TileView = memo(function TileView({ tile, registry, cx, cy, corners, onPress, onEnter }: Props) {
  const emoji = tile.creature ? registry.species(tile.creature.speciesId)?.emoji ?? '' : '';
  return (
    <g
      className="hex"
      transform={`translate(${cx.toFixed(3)} ${cy.toFixed(3)})`}
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onMouseEnter={onEnter}
    >
      <polygon className={`hex-cell terrain-${tile.terrain}`} points={corners} />
      {emoji && (
        <text
          className="hex-emoji"
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {emoji}
        </text>
      )}
    </g>
  );
});

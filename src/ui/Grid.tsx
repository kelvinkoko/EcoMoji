import { memo } from 'react';
import type { World } from '../game/types';
import type { Registry } from '../game/registry';
import { decode, idx, inDisc } from '../game/world';
import { TileView } from './Tile';

interface Props {
  world: World;
  registry: Registry;
  onTileClick: (q: number, r: number) => void;
}

const HEX_SIZE = 22;
const SQRT3 = Math.sqrt(3);

export function hexCenter(q: number, r: number): { cx: number; cy: number } {
  return { cx: HEX_SIZE * SQRT3 * (q + r / 2), cy: HEX_SIZE * 1.5 * r };
}

export function hexCornerPath(): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(HEX_SIZE * Math.cos(a)).toFixed(3)},${(HEX_SIZE * Math.sin(a)).toFixed(3)}`);
  }
  return pts.join(' ');
}

export const Grid = memo(function Grid({ world, registry, onTileClick }: Props) {
  const R = world.radius;
  const w = HEX_SIZE * SQRT3 * (2 * R + 1);
  const h = HEX_SIZE * (1.5 * (2 * R) + 2);
  const viewBox = `${-w / 2} ${-h / 2} ${w} ${h}`;
  const corners = hexCornerPath();

  const cells: JSX.Element[] = [];
  for (let q = -R; q <= R; q++) {
    for (let r = -R; r <= R; r++) {
      if (!inDisc(R, q, r)) continue;
      const tile = world.tiles[idx(R, q, r)];
      if (!tile) continue;
      const { cx, cy } = hexCenter(q, r);
      cells.push(
        <TileView
          key={`${q},${r}`}
          tile={tile}
          registry={registry}
          cx={cx}
          cy={cy}
          corners={corners}
          onClick={() => onTileClick(q, r)}
        />
      );
    }
  }

  const atmosphere: JSX.Element[] = [];
  for (let i = 0; i < world.atmosphere.length; i++) {
    const cell = world.atmosphere[i];
    if (!cell) continue;
    const def = registry.species(cell.speciesId);
    if (!def) continue;
    const { q, r } = decode(R, i);
    const { cx, cy } = hexCenter(q, r);
    atmosphere.push(
      <text
        key={`atm-${i}`}
        className={`weather-marker weather-${cell.speciesId}`}
        x={cx}
        y={cy - HEX_SIZE * 0.55}
        textAnchor="middle"
        dominantBaseline="central"
        pointerEvents="none"
      >
        {def.emoji}
      </text>
    );
  }

  return (
    <div className="grid-wrap">
      <svg
        className="grid-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="grid"
      >
        {cells}
        <g className="weather-layer" pointerEvents="none">{atmosphere}</g>
      </svg>
    </div>
  );
});

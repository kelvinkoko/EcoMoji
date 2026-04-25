import { memo, useMemo } from 'react';
import type { Pos, World } from '../game/types';
import type { Registry } from '../game/registry';
import { idx, inDisc } from '../game/world';
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

const WEATHER_EMOJI: Record<World['weather'], string | null> = {
  sun: null,
  clouds: '☁️',
  rain: '🌧️',
  storm: '⛈️',
};
const WEATHER_COUNT: Record<World['weather'], number> = {
  sun: 0,
  clouds: 7,
  rain: 12,
  storm: 14,
};

function weatherPositions(R: number, day: number, count: number): Pos[] {
  const out: Pos[] = [];
  const seen = new Set<number>();
  let seed = ((day + 1) * 2654435761) >>> 0;
  let attempts = 0;
  while (out.length < count && attempts < count * 6) {
    attempts++;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const q = (seed % (2 * R + 1)) - R;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const r = (seed % (2 * R + 1)) - R;
    if (!inDisc(R, q, r)) continue;
    const k = (q + R) * (2 * R + 1) + (r + R);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ q, r });
  }
  return out;
}

export const Grid = memo(function Grid({ world, registry, onTileClick }: Props) {
  const R = world.radius;
  const w = HEX_SIZE * SQRT3 * (2 * R + 1);
  const h = HEX_SIZE * (1.5 * (2 * R) + 2);
  const viewBox = `${-w / 2} ${-h / 2} ${w} ${h}`;
  const corners = hexCornerPath();

  const weatherEmoji = WEATHER_EMOJI[world.weather];
  const weatherDots = useMemo(
    () => (weatherEmoji ? weatherPositions(R, world.day, WEATHER_COUNT[world.weather]) : []),
    [R, world.day, world.weather, weatherEmoji]
  );

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

  return (
    <div className="grid-wrap">
      <svg
        className="grid-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="grid"
      >
        {cells}
        {weatherEmoji && (
          <g className={`weather-layer weather-${world.weather}`} pointerEvents="none">
            {weatherDots.map((p, i) => {
              const { cx, cy } = hexCenter(p.q, p.r);
              return (
                <text
                  key={i}
                  className="weather-marker"
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {weatherEmoji}
                </text>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { boardBounds, dividerEnd, dividerStart, outlinePoints, spiralPoints, SpiralConfig, startPosition } from '../game/spiral';
import type { Surface } from '../game/surfaces';
import { useStrings } from '../i18n/useStrings';
import type { Effect, Player } from '../game/useGame';

type Props = {
  cfg: SpiralConfig;
  surface: Surface;
  wet: boolean;
  size: number;
  players: Player[];
  current: number;
  movingStone: { x: number; y: number } | null;
  aim: number;
  power: number;
  canAim: boolean;
  onAim: (angle: number) => void;
  lastLanding?: { x: number; y: number } | null; // where this player's last kick stopped
  effect?: Effect | null;
};

const INK = '#2a1a0c';
const MARGIN = 8; // world units of ground around the chalk
// The guide shows direction only; judging the distance is the skill.
const GUIDE_LENGTH = 110;
const SHOE_GAP = 3; // between toe and stone at rest
const SHOE_PULL = 40; // how far back the shoe goes at full power
const SHOE_SCALE = 1.35;
const SHOE_TOE = 24 * SHOE_SCALE; // x of the toe tip in the shoe drawing
const FONT = 'Helvetica, Arial, sans-serif';

// Top-down sneaker, toe pointing along +x with its tip at x = SHOE_TOE.
const SHOE_OUTLINE =
  'M -24 -7 C -24 -11 -10 -12 4 -12 C 18 -12 24 -6 24 0 C 24 6 18 12 4 12 C -10 12 -24 11 -24 7 Z';

// An irregular pebble outline inside radius r (collision stays a circle).
function pebblePath(r: number, seed: number): string {
  const pts: { x: number; y: number }[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.86 + 0.14 * Math.abs(Math.sin(seed * 12.9898 + i * 78.233));
    pts.push({ x: Math.cos(a) * r * k, y: Math.sin(a) * r * k * 0.92 });
  }
  // Smooth through the points with quadratic curves between midpoints.
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m1 = mid(pts[(i + n - 1) % n], p);
    const m2 = mid(p, pts[(i + 1) % n]);
    d += `${i ? '' : `M${m1.x.toFixed(1)} ${m1.y.toFixed(1)} `}Q${p.x.toFixed(1)} ${p.y.toFixed(1)} ${m2.x.toFixed(1)} ${m2.y.toFixed(1)} `;
  }
  return d + 'Z';
}

function Stone({ x, y, r, color, seed, faded }: { x: number; y: number; r: number; color: string; seed: number; faded?: boolean }) {
  const d = useMemo(() => pebblePath(r, seed), [r, seed]);
  return (
    <G transform={`translate(${x} ${y})`} opacity={faded ? 0.5 : 1}>
      {!faded && <Path d={d} fill="#000" opacity={0.3} transform="translate(2 3)" />}
      <Path d={d} fill={color} stroke={INK} strokeWidth={faded ? 1.5 : 2.5} />
      <Ellipse cx={-r * 0.3} cy={-r * 0.32} rx={r * 0.38} ry={r * 0.24} fill="#fff" opacity={0.3} />
    </G>
  );
}

// Short burst where a kick stopped: dust, splash, a red puff for a fail,
// gold sparks for a win.
const EFFECT_MS = 700;
function ImpactEffect({ effect }: { effect: Effect }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const k = Math.min(1, (now - start) / EFFECT_MS);
      setT(k);
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [effect.id]);
  if (t >= 1) return null;
  const fade = 1 - t;
  const { x, y, kind } = effect;
  if (kind === 'splash') {
    return (
      <G>
        {[0, 0.25].map((lag) => {
          const k = Math.max(0, t - lag);
          return <Ellipse key={lag} cx={x} cy={y} rx={10 + k * 40} ry={6 + k * 24} fill="none" stroke="#d9ecff" strokeWidth={3} opacity={fade * 0.9} />;
        })}
      </G>
    );
  }
  const color = kind === 'fail' ? '#e74c3c' : kind === 'win' ? '#f2c14e' : '#c9a46c';
  const count = kind === 'win' ? 14 : 9;
  const reach = kind === 'win' ? 60 : 30;
  return (
    <G>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + effect.id;
        const d = 8 + t * reach * (0.7 + 0.3 * Math.sin(i * 3.7));
        return <Circle key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} r={(kind === 'win' ? 4 : 5) * (1 - t * 0.6)} fill={color} opacity={fade * 0.85} />;
      })}
    </G>
  );
}

function toPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export function Board({ cfg, surface, wet, size, players, current, movingStone, aim, power, canAim, onAim, lastLanding, effect }: Props) {
  const t = useStrings();
  // Square view centred on the drawing (the spiral itself is lopsided).
  const view0 = useMemo(() => {
    const b = boardBounds(cfg);
    const side = Math.max(b.maxX - b.minX, b.maxY - b.minY) + MARGIN * 2;
    return { x: (b.minX + b.maxX - side) / 2, y: (b.minY + b.maxY - side) / 2, side };
  }, [cfg]);
  const scale = size / view0.side;
  const view = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });

  const spiralPath = useMemo(() => toPath(spiralPoints(cfg)), [cfg]);
  const homePath = useMemo(() => `${toPath(outlinePoints(cfg, cfg.centreRadius - 6))} Z`, [cfg]);
  const startX = useMemo(() => startPosition(cfg).x, [cfg]);

  const me = players[current];

  // Keep the latest props reachable from the PanResponder created once.
  const latest = useRef({ canAim, onAim, scale, view0, me });
  latest.current = { canAim, onAim, scale, view0, me };

  const responder = useMemo(() => {
    // Point the aim from the stone towards the finger.
    const aimAt = (pageX: number, pageY: number) => {
      const { scale, view0, me, onAim } = latest.current;
      const wx = (pageX - origin.current.x) / scale + view0.x;
      const wy = (pageY - origin.current.y) / scale + view0.y;
      if (Math.hypot(wx - me.x, wy - me.y) > 1) onAim(Math.atan2(wy - me.y, wx - me.x));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.canAim,
      onMoveShouldSetPanResponder: () => latest.current.canAim,
      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        view.current?.measureInWindow((x, y) => {
          origin.current = { x, y };
          aimAt(pageX, pageY);
        });
      },
      onPanResponderMove: (e) => aimAt(e.nativeEvent.pageX, e.nativeEvent.pageY),
    });
  }, []);

  const stone = movingStone ?? me;
  const deg = (aim * 180) / Math.PI;
  const shoeBack = cfg.stoneRadius + SHOE_GAP + power * SHOE_PULL + SHOE_TOE;
  const ink = surface.line;
  const line = { stroke: ink, strokeWidth: 5, strokeLinecap: 'round' as const };

  return (
    <View ref={view} style={{ width: size, height: size }} {...responder.panHandlers}>
      <Svg width={size} height={size} viewBox={`${view0.x} ${view0.y} ${view0.side} ${view0.side}`}>
        <Ground surface={surface} wet={wet} box={view0} />

        {/* home */}
        <Path d={homePath} fill="#f2c14e" opacity={0.35} />
        <SvgText y={5} fontSize={Math.min(14, ((cfg.centreRadius - 8) * 2) / (t.board.home.length * 0.62))} fontWeight="bold" fontFamily={FONT} fill={ink} textAnchor="middle">
          {t.board.home}
        </SvgText>

        {/* chalk: spiral and divider (stopping at home) */}
        <Path d={spiralPath} fill="none" strokeLinejoin="round" {...line} />
        <Line x1={-dividerEnd(cfg, 'left')} y1={0} x2={-dividerStart(cfg, 'left')} y2={0} {...line} />
        <Line x1={dividerStart(cfg, 'right')} y1={0} x2={dividerEnd(cfg, 'right')} y2={0} {...line} />

        {/* start marker, in the open mouth of the spiral above the entrance */}
        <SvgText x={startX} y={-12} fontSize={13} fontWeight="bold" fontFamily={FONT} fill={ink} textAnchor="middle">
          {t.board.start}
        </SvgText>

        {/* chalk cross where this player's last kick stopped */}
        {canAim && lastLanding && (
          <G transform={`translate(${lastLanding.x} ${lastLanding.y})`} stroke={ink} strokeWidth={2.5} strokeLinecap="round" opacity={0.55}>
            <Line x1={-6} y1={-6} x2={6} y2={6} />
            <Line x1={-6} y1={6} x2={6} y2={-6} />
          </G>
        )}

        {/* other players' stones */}
        {players.map((p, i) =>
          i === current ? null : <Stone key={i} x={p.x} y={p.y} r={cfg.stoneRadius} color={p.color} seed={i + 1} faded />,
        )}

        {canAim && (
          <G transform={`translate(${me.x} ${me.y}) rotate(${deg})`}>
            {/* aim guide: direction only */}
            <Line x1={cfg.stoneRadius + 6} y1={0} x2={GUIDE_LENGTH} y2={0} stroke={ink} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" opacity={0.9} />
            <Circle cx={GUIDE_LENGTH} cy={0} r={4} fill={ink} opacity={0.9} />
            {/* the shoe, toe towards the stone, pulls back with power */}
            <G transform={`translate(${-shoeBack} 0) scale(${SHOE_SCALE})`}>
              {/* sole peeking out, then the upper */}
              <Path d={SHOE_OUTLINE} fill="#3b2a1a" transform="translate(1 1.5) scale(1.04)" />
              <Path d={SHOE_OUTLINE} fill="#f5f0e6" stroke={INK} strokeWidth={2.5} />
              <Path d="M 12 -8 C 20 -6 22 6 12 8" fill="none" stroke="#d8d0c0" strokeWidth={3} />
              <Ellipse cx={-20} cy={0} rx={3} ry={6} fill={me.color} />
              <Path d="M -18 -8 C -6 -9 6 -9 14 -5" stroke={me.color} strokeWidth={4} fill="none" strokeLinecap="round" />
              <Path d="M -18 8 C -6 9 6 9 14 5" stroke={me.color} strokeWidth={4} fill="none" strokeLinecap="round" />
              {[-8, -2, 4].map((x) => (
                <Line key={x} x1={x} y1={-4} x2={x} y2={4} stroke={INK} strokeWidth={2} strokeLinecap="round" />
              ))}
            </G>
          </G>
        )}

        {effect && <ImpactEffect key={effect.id} effect={effect} />}

        {/* current stone */}
        <Stone x={stone.x} y={stone.y} r={cfg.stoneRadius} color={me.color} seed={current + 1} />
      </Svg>
    </View>
  );
}

type Box = { x: number; y: number; side: number };

// Deterministic scatter so the texture doesn't jump between renders.
function scatter(count: number, box: Box, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: count }, () => ({
    x: box.x + rnd() * box.side,
    y: box.y + rnd() * box.side,
    r: rnd(),
  }));
}

const TILE = 64;

// The patch of ground the spiral is drawn on, plus rain when wet.
function Ground({ surface, wet, box }: { surface: Surface; wet: boolean; box: Box }) {
  const specks = useMemo(() => scatter(260, box, 7), [box]);
  const puddles = useMemo(() => scatter(7, box, 99), [box]);
  const drops = useMemo(() => scatter(90, box, 1234), [box]);
  const tiles = useMemo(() => {
    const out: number[] = [];
    for (let v = Math.ceil(box.x / TILE) * TILE; v < box.x + box.side; v += TILE) out.push(v);
    return out;
  }, [box]);
  const rows = useMemo(() => {
    const out: number[] = [];
    for (let v = Math.ceil(box.y / TILE) * TILE; v < box.y + box.side; v += TILE) out.push(v);
    return out;
  }, [box]);
  const end = { x: box.x + box.side, y: box.y + box.side };

  return (
    <G>
      <Rect x={box.x} y={box.y} width={box.side} height={box.side} rx={16} fill={surface.ground} />
      {surface.texture === 'speckle' &&
        specks.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={1 + p.r * 2.2} fill={surface.grain} opacity={0.7} />)}
      {surface.texture === 'tiles' && (
        <G stroke={surface.grain} strokeWidth={2}>
          {tiles.map((x) => (
            <Line key={`c${x}`} x1={x} y1={box.y} x2={x} y2={end.y} />
          ))}
          {rows.map((y) => (
            <Line key={`r${y}`} x1={box.x} y1={y} x2={end.x} y2={y} />
          ))}
        </G>
      )}
      {wet && (
        <G>
          <Rect x={box.x} y={box.y} width={box.side} height={box.side} rx={16} fill="#1b2a3a" opacity={0.28} />
          {puddles.map((p, i) => (
            <Ellipse key={i} cx={p.x} cy={p.y} rx={26 + p.r * 30} ry={12 + p.r * 12} fill="#a9c6dd" opacity={0.25} />
          ))}
          {drops.map((p, i) => (
            <Line key={i} x1={p.x} y1={p.y} x2={p.x - 5} y2={p.y + 14} stroke="#d9ecff" strokeWidth={1.5} opacity={0.45} />
          ))}
        </G>
      )}
    </G>
  );
}

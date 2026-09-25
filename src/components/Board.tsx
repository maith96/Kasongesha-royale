import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { boardBounds, dividerEnd, dividerStart, outlinePoints, spiralPoints, SpiralConfig, startPosition } from '../game/spiral';
import type { Player } from '../game/useGame';

type Props = {
  cfg: SpiralConfig;
  size: number;
  players: Player[];
  current: number;
  movingStone: { x: number; y: number } | null;
  aim: number;
  power: number;
  canAim: boolean;
  onAim: (angle: number) => void;
};

export const CHALK = '#fdf6e3';
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

function toPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

export function Board({ cfg, size, players, current, movingStone, aim, power, canAim, onAim }: Props) {
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
  const line = { stroke: CHALK, strokeWidth: 5, strokeLinecap: 'round' as const };

  return (
    <View ref={view} style={{ width: size, height: size }} {...responder.panHandlers}>
      <Svg width={size} height={size} viewBox={`${view0.x} ${view0.y} ${view0.side} ${view0.side}`}>
        {/* home */}
        <Path d={homePath} fill="#f2c14e" opacity={0.35} />
        <SvgText y={5} fontSize={14} fontWeight="bold" fontFamily={FONT} fill={CHALK} textAnchor="middle">
          HOME
        </SvgText>

        {/* chalk: spiral and divider (stopping at home) */}
        <Path d={spiralPath} fill="none" strokeLinejoin="round" {...line} />
        <Line x1={-dividerEnd(cfg, 'left')} y1={0} x2={-dividerStart(cfg, 'left')} y2={0} {...line} />
        <Line x1={dividerStart(cfg, 'right')} y1={0} x2={dividerEnd(cfg, 'right')} y2={0} {...line} />

        {/* start marker, in the open mouth of the spiral above the entrance */}
        <SvgText x={startX} y={-12} fontSize={13} fontWeight="bold" fontFamily={FONT} fill={CHALK} textAnchor="middle">
          START ↓
        </SvgText>

        {/* other players' stones */}
        {players.map((p, i) =>
          i === current ? null : (
            <Circle key={i} cx={p.x} cy={p.y} r={cfg.stoneRadius} fill={p.color} opacity={0.45} stroke={INK} strokeWidth={1.5} />
          ),
        )}

        {canAim && (
          <G transform={`translate(${me.x} ${me.y}) rotate(${deg})`}>
            {/* aim guide: direction only */}
            <Line x1={cfg.stoneRadius + 6} y1={0} x2={GUIDE_LENGTH} y2={0} stroke={CHALK} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" opacity={0.9} />
            <Circle cx={GUIDE_LENGTH} cy={0} r={4} fill={CHALK} opacity={0.9} />
            {/* the shoe, toe towards the stone, pulls back with power */}
            <G transform={`translate(${-shoeBack} 0) scale(${SHOE_SCALE})`}>
              <Path d={SHOE_OUTLINE} fill="#f5f0e6" stroke={INK} strokeWidth={2.5} />
              <Path d="M -18 -8 C -6 -9 6 -9 14 -5" stroke={me.color} strokeWidth={4} fill="none" strokeLinecap="round" />
              <Path d="M -18 8 C -6 9 6 9 14 5" stroke={me.color} strokeWidth={4} fill="none" strokeLinecap="round" />
              {[-8, -2, 4].map((x) => (
                <Line key={x} x1={x} y1={-4} x2={x} y2={4} stroke={INK} strokeWidth={2} strokeLinecap="round" />
              ))}
            </G>
          </G>
        )}

        {/* current stone with a shadow */}
        <Circle cx={stone.x + 2} cy={stone.y + 3} r={cfg.stoneRadius} fill="#000" opacity={0.3} />
        <Circle cx={stone.x} cy={stone.y} r={cfg.stoneRadius} fill={me.color} stroke={INK} strokeWidth={2.5} />
        <Circle cx={stone.x - 3} cy={stone.y - 3} r={cfg.stoneRadius / 3} fill="#fff" opacity={0.35} />
      </Svg>
    </View>
  );
}

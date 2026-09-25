import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { dividerEnd, outerRadius, spiralPoints, SpiralConfig } from '../game/spiral';
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

const CHALK = '#fffaf0';
const MARGIN = 20;
// The guide shows direction only; judging the distance is the skill.
const GUIDE_LENGTH = 70;
const SHOE_LENGTH = 38;
const SHOE_WIDTH = 20;
const SHOE_GAP = 3; // between toe and stone at rest
const SHOE_PULL = 34; // how far back the shoe goes at full power

export function Board({ cfg, size, players, current, movingStone, aim, power, canAim, onAim }: Props) {
  const outer = outerRadius(cfg);
  const half = outer + MARGIN;
  const scale = size / (half * 2);
  const view = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });

  const spiralPath = useMemo(() => {
    const pts = spiralPoints(cfg);
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [cfg]);

  const me = players[current];

  // Keep the latest props reachable from the PanResponder created once.
  const latest = useRef({ canAim, onAim, scale, half, me });
  latest.current = { canAim, onAim, scale, half, me };

  const responder = useMemo(() => {
    // Point the aim from the stone towards the finger.
    const aimAt = (pageX: number, pageY: number) => {
      const { scale, half, me, onAim } = latest.current;
      const wx = (pageX - origin.current.x) / scale - half;
      const wy = (pageY - origin.current.y) / scale - half;
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

  return (
    <View ref={view} style={{ width: size, height: size }} {...responder.panHandlers}>
      <Svg width={size} height={size} viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}>
        {/* home */}
        <Circle r={cfg.centreRadius - 4} fill="#f4d58d" opacity={0.6} />
        {/* spiral line */}
        <Path d={spiralPath} stroke={CHALK} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* divider, stopping at the home circle */}
        <Line x1={-dividerEnd(cfg, 'left')} y1={0} x2={-cfg.centreRadius} y2={0} stroke={CHALK} strokeWidth={4} strokeLinecap="round" />
        <Line x1={cfg.centreRadius} y1={0} x2={dividerEnd(cfg, 'right')} y2={0} stroke={CHALK} strokeWidth={4} strokeLinecap="round" />

        {players.map((p, i) =>
          i === current ? null : (
            <Circle key={i} cx={p.x} cy={p.y} r={cfg.stoneRadius} fill={p.color} opacity={0.35} />
          ),
        )}

        {canAim && (
          <Line
            x1={me.x + Math.cos(aim) * (cfg.stoneRadius + 4)}
            y1={me.y + Math.sin(aim) * (cfg.stoneRadius + 4)}
            x2={me.x + Math.cos(aim) * GUIDE_LENGTH}
            y2={me.y + Math.sin(aim) * GUIDE_LENGTH}
            stroke={me.color}
            strokeWidth={3}
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
        )}

        <Circle cx={stone.x} cy={stone.y} r={cfg.stoneRadius} fill={me.color} stroke="#3b2a1a" strokeWidth={2} />

        {/* the shoe, behind the stone with its toe pointing where you aim */}
        {canAim && (
          <G transform={`translate(${me.x} ${me.y}) rotate(${(aim * 180) / Math.PI})`}>
            <Rect
              x={-(cfg.stoneRadius + SHOE_GAP + power * SHOE_PULL + SHOE_LENGTH)}
              y={-SHOE_WIDTH / 2}
              width={SHOE_LENGTH}
              height={SHOE_WIDTH}
              rx={7}
              fill="#5b3a1e"
              stroke="#2a1a0c"
              strokeWidth={2}
            />
          </G>
        )}
      </Svg>
    </View>
  );
}

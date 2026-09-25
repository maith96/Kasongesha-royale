import { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { dividerEnd, outerRadius, spiralPoints, SpiralConfig } from '../game/spiral';
import { slideDistance, type Player } from '../game/useGame';

type Props = {
  cfg: SpiralConfig;
  size: number;
  players: Player[];
  current: number;
  movingStone: { x: number; y: number } | null;
  canAim: boolean;
  onPush: (dx: number, dy: number) => void;
};

const CHALK = '#fffaf0';
const MARGIN = 20;

export function Board({ cfg, size, players, current, movingStone, canAim, onPush }: Props) {
  const outer = outerRadius(cfg);
  const half = outer + MARGIN;
  const scale = size / (half * 2);
  const [aim, setAim] = useState<{ dx: number; dy: number } | null>(null);

  const spiralPath = useMemo(() => {
    const pts = spiralPoints(cfg);
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [cfg]);

  // Keep the latest props reachable from the PanResponder created once.
  const latest = useRef({ canAim, onPush, scale });
  latest.current = { canAim, onPush, scale };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => latest.current.canAim,
        onMoveShouldSetPanResponder: () => latest.current.canAim,
        onPanResponderMove: (_, g) => {
          const s = latest.current.scale;
          setAim({ dx: g.dx / s, dy: g.dy / s });
        },
        onPanResponderRelease: (_, g) => {
          const s = latest.current.scale;
          setAim(null);
          if (latest.current.canAim) latest.current.onPush(g.dx / s, g.dy / s);
        },
        onPanResponderTerminate: () => setAim(null),
      }),
    [],
  );

  const me = players[current];
  const aimLen = aim ? slideDistance(Math.hypot(aim.dx, aim.dy)) : 0;
  const aimAngle = aim ? Math.atan2(aim.dy, aim.dx) : 0;

  return (
    <View style={{ width: size, height: size }} {...responder.panHandlers}>
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

        {aim && (
          <Line
            x1={me.x}
            y1={me.y}
            x2={me.x + Math.cos(aimAngle) * aimLen}
            y2={me.y + Math.sin(aimAngle) * aimLen}
            stroke={me.color}
            strokeWidth={3}
            strokeDasharray="8 6"
          />
        )}

        <Circle
          cx={movingStone?.x ?? me.x}
          cy={movingStone?.y ?? me.y}
          r={cfg.stoneRadius}
          fill={me.color}
          stroke="#3b2a1a"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

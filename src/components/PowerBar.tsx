import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { useStrings } from '../i18n/useStrings';

type Props = {
  height: number;
  color: string;
  enabled: boolean;
  onShoot: (power: number) => void;
  onPowerChange?: (power: number) => void;
};

// Pool-style power: drag down to pull the shoe back, let go to kick.
export function PowerBar({ height, color, enabled, onShoot, onPowerChange }: Props) {
  const t = useStrings();
  const [power, setPowerState] = useState(0);
  const latest = useRef({ enabled, onShoot, onPowerChange, height });
  latest.current = { enabled, onShoot, onPowerChange, height };
  const setPower = (p: number) => {
    setPowerState(p);
    latest.current.onPowerChange?.(p);
  };
  const toPower = (dy: number) => Math.max(0, Math.min(1, dy / latest.current.height));

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => latest.current.enabled,
        onMoveShouldSetPanResponder: () => latest.current.enabled,
        onPanResponderGrant: () => setPower(0),
        onPanResponderMove: (_, g) => setPower(toPower(g.dy)),
        onPanResponderRelease: (_, g) => {
          const p = toPower(g.dy);
          setPower(0);
          if (latest.current.enabled && p > 0.02) latest.current.onShoot(p);
        },
        onPanResponderTerminate: () => setPower(0),
      }),
    [],
  );

  return (
    <View style={[styles.wrap, !enabled && styles.disabled]} {...responder.panHandlers}>
      <Text style={styles.label}>{power > 0 ? `${Math.round(power * 100)}%` : t.board.power}</Text>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { height: `${power * 100}%`, backgroundColor: color }]} />
        <View style={[styles.handle, { top: power * (height - HANDLE) }]} />
      </View>
      <Text style={styles.label}>↓</Text>
    </View>
  );
}

const CHALK = '#fdf6e3';
const INK = '#2a1a0c';
const HANDLE = 26;

const styles = StyleSheet.create({
  // Generous padding so the thumb can grab the bar easily.
  wrap: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4, gap: 6 },
  disabled: { opacity: 0.35 },
  label: { color: CHALK, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  track: {
    width: 44,
    borderRadius: 22,
    backgroundColor: '#00000044',
    borderWidth: 3,
    borderColor: CHALK,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.75 },
  handle: {
    position: 'absolute',
    left: 3,
    right: 3,
    height: HANDLE - 6,
    marginTop: 3,
    borderRadius: 10,
    backgroundColor: CHALK,
    borderWidth: 2,
    borderColor: INK,
  },
});

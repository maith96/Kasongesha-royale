import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

type Props = {
  color: string;
  enabled: boolean;
  onShoot: (power: number) => void;
  onPowerChange?: (power: number) => void;
};

// Pool-style kick pad: drag down anywhere on it to pull the shoe back, let go to kick.
export function KickPad({ color, enabled, onShoot, onPowerChange }: Props) {
  const [power, setPowerState] = useState(0);
  const [height, setHeight] = useState(200);
  const latest = useRef({ enabled, onShoot, onPowerChange, height });
  latest.current = { enabled, onShoot, onPowerChange, height };
  const setPower = (p: number) => {
    setPowerState(p);
    latest.current.onPowerChange?.(p);
  };
  // Full power is a pull of most of the pad's height.
  const toPower = (dy: number) => Math.max(0, Math.min(1, dy / (latest.current.height * 0.8)));

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
    <View
      style={[styles.pad, !enabled && styles.disabled]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      {...responder.panHandlers}
    >
      <View style={[styles.fill, { height: `${power * 100}%`, backgroundColor: color }]} />
      <Text style={styles.title}>{power > 0 ? `${Math.round(power * 100)}%` : 'KICK PAD'}</Text>
      <Text style={styles.hint}>{power > 0 ? 'Let go to kick' : 'Drag down  ↓  then let go'}</Text>
    </View>
  );
}

const CHALK = '#fdf6e3';

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    minHeight: 140,
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: CHALK,
    backgroundColor: '#00000022',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabled: { opacity: 0.35 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.55 },
  title: { color: CHALK, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  hint: { color: CHALK, fontSize: 16, fontWeight: '600', opacity: 0.85 },
});

import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

type Props = {
  height: number;
  color: string;
  enabled: boolean;
  onShoot: (power: number) => void;
};

// Pool-style power: drag down to pull back, let go to push.
export function PowerBar({ height, color, enabled, onShoot }: Props) {
  const [power, setPower] = useState(0);
  const latest = useRef({ enabled, onShoot, height, power });
  latest.current = { enabled, onShoot, height, power };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => latest.current.enabled,
        onMoveShouldSetPanResponder: () => latest.current.enabled,
        onPanResponderGrant: () => setPower(0),
        onPanResponderMove: (_, g) => {
          setPower(Math.max(0, Math.min(1, g.dy / latest.current.height)));
        },
        onPanResponderRelease: (_, g) => {
          const p = Math.max(0, Math.min(1, g.dy / latest.current.height));
          setPower(0);
          if (latest.current.enabled && p > 0.02) latest.current.onShoot(p);
        },
        onPanResponderTerminate: () => setPower(0),
      }),
    [],
  );

  return (
    <View style={styles.wrap} {...responder.panHandlers}>
      <Text style={styles.label}>POWER</Text>
      <View style={[styles.track, { height }, !enabled && styles.disabled]}>
        <View style={[styles.fill, { height: `${power * 100}%`, backgroundColor: color }]} />
        <View style={[styles.handle, { top: power * (height - 22) }]} />
      </View>
      <Text style={styles.hint}>↓</Text>
    </View>
  );
}

const INK = '#3b2a1a';

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  label: { color: INK, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  track: {
    width: 36,
    borderRadius: 18,
    backgroundColor: '#fffaf0',
    borderWidth: 2,
    borderColor: INK,
    overflow: 'hidden',
  },
  disabled: { opacity: 0.4 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.8 },
  handle: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 18,
    marginTop: 2,
    borderRadius: 9,
    backgroundColor: INK,
  },
  hint: { color: INK, fontSize: 18, fontWeight: '800' },
});

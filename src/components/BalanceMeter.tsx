import { StyleSheet, Text, View } from 'react-native';

import { useStrings } from '../i18n/useStrings';

// Shows how steady you are on one leg. The needle swings; release your swipe
// near the middle for an accurate push. In the red zone your foot touches down.
export function BalanceMeter({ wobble, footDownAt }: { wobble: number; footDownAt: number }) {
  const t = useStrings();
  const red = `${((1 - footDownAt) / 2) * 100}%` as const;
  const left = `${((wobble + 1) / 2) * 100}%` as const;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t.board.balance}</Text>
      <View style={styles.bar}>
        <View style={[styles.red, { left: 0, width: red }]} />
        <View style={[styles.red, { right: 0, width: red }]} />
        <View style={styles.centre} />
        <View style={[styles.needle, { left }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingHorizontal: 16 },
  label: { color: '#3b2a1a', fontWeight: '600', marginBottom: 4 },
  bar: {
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fffaf0',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#3b2a1a',
  },
  red: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#e74c3c' },
  centre: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: '#27864a' },
  needle: { position: 'absolute', top: -2, bottom: -2, width: 4, marginLeft: -2, backgroundColor: '#3b2a1a' },
});

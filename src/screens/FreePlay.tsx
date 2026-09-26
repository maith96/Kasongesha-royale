import { Pressable, StyleSheet, Text, View } from 'react-native';

import { STAGES } from '../game/stages';
import { SURFACES } from '../game/surfaces';
import { Picker } from '../ui/Picker';
import { ui } from '../ui/theme';

export type FreePlayOptions = { stage: number; surface: number; wet: boolean; kicksPerTurn: number };

type Props = {
  options: FreePlayOptions;
  onChange: (o: FreePlayOptions) => void;
  onStart: (players: number) => void;
  onBack: () => void;
};

export function FreePlay({ options, onChange, onStart, onBack }: Props) {
  const set = (patch: Partial<FreePlayOptions>) => onChange({ ...options, ...patch });
  const { stage, surface, wet, kicksPerTurn } = options;
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={ui.link}>‹ Back</Text>
        </Pressable>
        <Text style={ui.heading}>Free play</Text>
        <Text style={ui.rule}>Pick any board and play alone or pass the phone around.</Text>
      </View>
      <View style={styles.right}>
        <Picker items={STAGES} value={stage} onChange={(i) => set({ stage: i })} />
        <Picker items={SURFACES} value={surface} onChange={(i) => set({ surface: i })} />
        <View style={styles.optionRow}>
          <Pressable style={[ui.choice, styles.wet, wet && ui.choiceActive]} onPress={() => set({ wet: !wet })}>
            <Text style={[ui.choiceText, styles.big, wet && ui.choiceTextActive]}>{wet ? '🌧  Rainy' : '☀️  Dry'}</Text>
          </Pressable>
          <View style={[ui.choice, styles.kpt]}>
            <Text style={[ui.choiceText, ui.choiceTextActive]}>Kicks / turn</Text>
            {[1, 2, 3].map((k) => (
              <Pressable key={k} style={[styles.kptButton, k === kicksPerTurn && ui.choiceActive]} onPress={() => set({ kicksPerTurn: k })}>
                <Text style={[ui.choiceText, styles.big, k === kicksPerTurn && ui.choiceTextActive]}>{k}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.playGrid}>
          {[1, 2, 3, 4].map((n) => (
            <Pressable key={n} style={[ui.button, styles.playButton]} onPress={() => onStart(n)}>
              <Text style={ui.buttonText}>{n === 1 ? 'Practice' : `${n} players`}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 40 },
  left: { gap: 12, width: 220 },
  right: { gap: 8, width: 300 },
  optionRow: { flexDirection: 'row', gap: 8 },
  wet: { flex: 1, paddingVertical: 8 },
  big: { fontSize: 14 },
  kpt: { flex: 1.4, flexDirection: 'row', justifyContent: 'space-between', gap: 4, paddingHorizontal: 8 },
  kptButton: { width: 30, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  playGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: 300 },
  playButton: { minWidth: 0, width: 146, paddingVertical: 10 },
});

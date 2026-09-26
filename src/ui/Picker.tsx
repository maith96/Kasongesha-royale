import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHALK, ui } from './theme';

// A row of icon + label choices.
export function Picker({
  items,
  value,
  onChange,
}: {
  items: { icon: string; name: string }[];
  value: number;
  onChange: (i: number) => void;
}) {
  return (
    <View style={styles.row}>
      {items.map((s, i) => (
        <Pressable key={s.name} style={[ui.choice, styles.item, i === value && ui.choiceActive]} onPress={() => onChange(i)}>
          <Text style={[styles.icon, i === value && ui.choiceTextActive]}>{s.icon}</Text>
          <Text style={[ui.choiceText, i === value && ui.choiceTextActive]}>{s.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  item: { flex: 1, paddingVertical: 8 },
  icon: { color: CHALK, fontSize: 20, opacity: 0.6 },
});

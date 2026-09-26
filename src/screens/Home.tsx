import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GOLD, ui } from '../ui/theme';

type Props = { stars: number; maxStars: number; onCampaign: () => void; onFreePlay: () => void };

export function Home({ stars, maxStars, onCampaign, onFreePlay }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Text style={ui.title}>Kasongesha{'\n'}Royale</Text>
        <View style={ui.card}>
          <Text style={ui.rule}>🎯  Touch the board to aim</Text>
          <Text style={ui.rule}>👟  Pull the power bar down, let go to kick</Text>
          <Text style={ui.rule}>🪨  Never stop on a line (sliding over is fine)</Text>
          <Text style={ui.rule}>🏁  First home wins. Mistake = back to start!</Text>
        </View>
      </View>
      <View style={styles.right}>
        <Pressable style={[ui.button, styles.big]} onPress={onCampaign}>
          <Text style={ui.buttonText}>Campaign</Text>
          <Text style={styles.sub}>
            <Text style={{ color: GOLD }}>★</Text> {stars} / {maxStars}
          </Text>
        </Pressable>
        <Pressable style={[ui.button, styles.big]} onPress={onFreePlay}>
          <Text style={ui.buttonText}>Free play</Text>
          <Text style={styles.sub}>Any board · 1–4 players</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 40 },
  left: { alignItems: 'center', gap: 16, flexShrink: 1 },
  right: { gap: 14, width: 280 },
  big: { paddingVertical: 16 },
  sub: { color: '#5b3d22', fontSize: 13, fontWeight: '700', marginTop: 2 },
});


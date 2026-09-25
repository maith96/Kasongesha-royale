import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceMeter } from './src/components/BalanceMeter';
import { Board } from './src/components/Board';
import { PowerBar } from './src/components/PowerBar';
import { progressFraction } from './src/game/rules';
import { BALANCE_ENABLED, cfg, useGame } from './src/game/useGame';

export default function App() {
  const [players, setPlayers] = useState<number | null>(null);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        {players === null ? (
          <Menu onStart={setPlayers} />
        ) : (
          <Game playerCount={players} onExit={() => setPlayers(null)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Menu({ onStart }: { onStart: (n: number) => void }) {
  return (
    <View style={styles.menu}>
      <View style={styles.menuLeft}>
        <Text style={styles.title}>Kasongesha{'\n'}Royale</Text>
        <View style={styles.rulesCard}>
          <Text style={styles.rule}>🎯  Touch the board to aim</Text>
          <Text style={styles.rule}>👟  Pull the power bar down, let go to kick</Text>
          <Text style={styles.rule}>🪨  Never stop on a line (sliding over is fine)</Text>
          <Text style={styles.rule}>🏁  First home wins. Mistake = back to start!</Text>
        </View>
      </View>
      <View style={styles.menuRight}>
        {[1, 2, 3, 4].map((n) => (
          <Pressable key={n} style={styles.button} onPress={() => onStart(n)}>
            <Text style={styles.buttonText}>{n === 1 ? 'Practice' : `${n} players`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Game({ playerCount, onExit }: { playerCount: number; onExit: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const g = useGame(playerCount);
  const me = g.players[g.current];
  const [power, setPower] = useState(0);
  useEffect(() => setPower(0), [g.current]);
  const usableHeight = height - insets.top - insets.bottom;
  const boardSize = Math.min(usableHeight - 8, width - insets.left - insets.right - SIDE_PANEL - POWER_BAR, 720);

  return (
    <View style={styles.game}>
      <View style={styles.side}>
        <View style={styles.links}>
          <Pressable onPress={onExit} hitSlop={12}>
            <Text style={styles.link}>‹ Menu</Text>
          </Pressable>
          <Pressable onPress={g.restart} hitSlop={12}>
            <Text style={styles.link}>↻</Text>
          </Pressable>
        </View>

        <View style={styles.chips}>
          {g.players.map((p, i) => (
            <View key={i} style={[styles.chip, i === g.current && { borderColor: p.color, backgroundColor: '#00000033' }]}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={[styles.chipText, i === g.current && styles.chipTextActive]}>
                {playerCount === 1 ? 'You' : `P${i + 1}`}
              </Text>
              <Text style={[styles.chipText, i === g.current && styles.chipTextActive]}>
                {Math.round(progressFraction(cfg, p.x, p.y) * 100)}%
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.banner, BANNER[g.tone]]}>
          <Text style={styles.bannerText} numberOfLines={4}>
            {g.message || ' '}
          </Text>
        </View>

        {g.phase === 'won' && (
          <Pressable style={[styles.button, styles.smallButton]} onPress={g.restart}>
            <Text style={styles.buttonText}>Play again</Text>
          </Pressable>
        )}
        {BALANCE_ENABLED && <BalanceMeter wobble={g.phase === 'aim' ? g.wobble : 0} footDownAt={g.footDownAt} />}
      </View>

      <View style={styles.boardArea}>
        <Board
          cfg={cfg}
          size={boardSize}
          players={g.players}
          current={g.current}
          movingStone={g.movingStone}
          aim={g.aim}
          power={power}
          canAim={g.phase === 'aim'}
          onAim={g.setAim}
        />
      </View>

      <PowerBar
        height={boardSize * 0.72}
        color={me.color}
        enabled={g.phase === 'aim'}
        onShoot={g.push}
        onPowerChange={setPower}
      />
    </View>
  );
}

const CHALK = '#fdf6e3';
const INK = '#2a1a0c';
const SIDE_PANEL = 170;
const POWER_BAR = 76;

const BANNER = StyleSheet.create({
  info: { backgroundColor: '#00000022' },
  good: { backgroundColor: '#2e7d4f' },
  bad: { backgroundColor: '#b23a2e' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#7a5634' },
  menu: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 40 },
  menuLeft: { alignItems: 'center', gap: 16, flexShrink: 1 },
  menuRight: { gap: 12 },
  title: { fontSize: 44, fontWeight: '900', color: CHALK, textAlign: 'center' },
  rulesCard: { backgroundColor: '#00000033', borderRadius: 16, padding: 16, gap: 8 },
  rule: { color: CHALK, fontSize: 15, lineHeight: 20 },
  button: {
    backgroundColor: CHALK,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  smallButton: { minWidth: 0, paddingHorizontal: 16 },
  buttonText: { color: INK, fontSize: 18, fontWeight: '800' },
  game: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  side: { width: SIDE_PANEL, alignSelf: 'stretch', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: CHALK, fontSize: 18, fontWeight: '700' },
  chips: { gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: INK },
  chipText: { color: CHALK, fontSize: 14, fontWeight: '600', opacity: 0.7 },
  chipTextActive: { opacity: 1, fontWeight: '900' },
  banner: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  bannerText: { color: CHALK, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

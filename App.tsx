import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BalanceMeter } from './src/components/BalanceMeter';
import { Board } from './src/components/Board';
import { progressFraction } from './src/game/rules';
import { cfg, useGame } from './src/game/useGame';

export default function App() {
  const [players, setPlayers] = useState<number | null>(null);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
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
      <Text style={styles.title}>Kasongesha{'\n'}Royale</Text>
      <Text style={styles.rules}>
        Push your stone along the spiral to the centre.{'\n'}
        Don't let it stop on a line.{'\n'}
        Cut across the middle to the same ring on the other side for a shortcut.{'\n'}
        Any mistake: back to start!
      </Text>
      {[1, 2, 3, 4].map((n) => (
        <Pressable key={n} style={styles.button} onPress={() => onStart(n)}>
          <Text style={styles.buttonText}>{n === 1 ? 'Practice' : `${n} players`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Game({ playerCount, onExit }: { playerCount: number; onExit: () => void }) {
  const { width } = useWindowDimensions();
  const g = useGame(playerCount);
  const me = g.players[g.current];

  return (
    <View style={styles.game}>
      <View style={styles.header}>
        <Pressable onPress={onExit}>
          <Text style={styles.link}>‹ Menu</Text>
        </Pressable>
        <Text style={[styles.turn, { color: me.color }]}>{me.name}</Text>
        <Pressable onPress={g.restart}>
          <Text style={styles.link}>Restart</Text>
        </Pressable>
      </View>

      <View style={styles.progress}>
        {g.players.map((p, i) => (
          <View key={i} style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: p.color, width: `${progressFraction(cfg, p.x, p.y) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <Board
        cfg={cfg}
        size={Math.min(width, 520)}
        players={g.players}
        current={g.current}
        movingStone={g.movingStone}
        canAim={g.phase === 'aim'}
        onPush={g.push}
      />

      <Text style={styles.message}>{g.message}</Text>

      {g.phase === 'won' ? (
        <Pressable style={styles.button} onPress={g.restart}>
          <Text style={styles.buttonText}>Play again</Text>
        </Pressable>
      ) : (
        <BalanceMeter wobble={g.phase === 'aim' ? g.wobble : 0} footDownAt={g.footDownAt} />
      )}
    </View>
  );
}

const INK = '#3b2a1a';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#c9a46c' },
  menu: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 44, fontWeight: '900', color: INK, textAlign: 'center', marginBottom: 8 },
  rules: { color: INK, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  button: {
    backgroundColor: INK,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: { color: '#fffaf0', fontSize: 18, fontWeight: '700' },
  game: { flex: 1, alignItems: 'center', gap: 8 },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  link: { color: INK, fontSize: 16, fontWeight: '600' },
  turn: { fontSize: 20, fontWeight: '800' },
  progress: { width: '100%', paddingHorizontal: 16, gap: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#fffaf055' },
  progressFill: { height: 6, borderRadius: 3 },
  message: { color: INK, fontSize: 18, fontWeight: '700', textAlign: 'center', minHeight: 26, paddingHorizontal: 16 },
});

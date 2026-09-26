import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PointsLine, Standing } from '../game/match';
import { Strings } from '../i18n';
import { useStrings } from '../i18n/useStrings';
import type { Player } from '../game/useGame';

type Props = {
  results: Standing[];
  players: Player[];
  par: number;
  next: { label: string; onPress: () => void } | null;
  onReplay: () => void;
  onRematch: () => void;
  onMenu: () => void;
};

const CHALK = '#fdf6e3';

function pointsLabel(s: Strings['results'], b: PointsLine): string {
  switch (b.kind) {
    case 'win':
      return s.win;
    case 'home':
      return s.home;
    case 'underPar':
      return s.underPar(b.count);
    case 'shortcuts':
      return s.shortcuts(b.count);
    case 'streaks':
      return s.streaks(b.count);
  }
}
const INK = '#2a1a0c';

function Stars({ n }: { n: number }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(n)}
      <Text style={styles.starOff}>{'★'.repeat(3 - n)}</Text>
    </Text>
  );
}

export function Results({ results, players, par, next, onReplay, onRematch, onMenu }: Props) {
  const t = useStrings();
  const s = t.results;
  const solo = results.length === 1;
  const winners = results.filter((r) => r.winner);
  const title = solo
    ? s.soloTitle
    : winners.length > 1
      ? s.draw(winners.map((w) => players[w.player].name).join(' & '))
      : s.wins(players[winners[0]?.player ?? results[0].player].name);

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {solo ? (
          <View style={styles.soloBox}>
            <Stars n={results[0].stars} />
            <Text style={styles.soloLine}>
              {t.common.kicks(results[0].kicks)} · {t.common.par(par)}
            </Text>
          </View>
        ) : (
          <Text style={styles.sub}>{t.common.par(par)}</Text>
        )}

        <ScrollView style={styles.table} contentContainerStyle={{ gap: 6 }}>
          {results.map((r) => {
            const p = players[r.player];
            return (
              <View key={r.player} style={[styles.row, r.winner && styles.rowWinner]}>
                <Text style={styles.rank}>{r.rank}</Text>
                <View style={[styles.dot, { backgroundColor: p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {p.name}
                    {r.finished ? '' : `  ·  ${s.ofTheWay(Math.round(r.progress * 100))}`}
                  </Text>
                  <Text style={styles.breakdown}>
                    {t.common.kicks(r.kicks)} · {t.common.fails(r.fails)}
                    {r.breakdown.length ? '  ·  ' + r.breakdown.map((b) => `${pointsLabel(s, b)} +${b.points}`).join(', ') : ''}
                  </Text>
                </View>
                <Text style={styles.points}>{r.points}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.buttons}>
          {next && (
            <Pressable style={styles.button} onPress={next.onPress}>
              <Text style={styles.buttonText}>{next.label}</Text>
            </Pressable>
          )}
          <Pressable style={styles.button} onPress={onRematch}>
            <Text style={styles.buttonText}>{solo ? s.retry : s.rematch}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.ghost]} onPress={onReplay}>
            <Text style={[styles.buttonText, { color: CHALK }]}>{s.watchReplay}</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.ghost]} onPress={onMenu}>
            <Text style={[styles.buttonText, { color: CHALK }]}>{s.menu}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '100%',
    backgroundColor: '#5b3d22',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: CHALK,
    padding: 16,
    gap: 8,
  },
  title: { color: CHALK, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  sub: { color: CHALK, opacity: 0.8, textAlign: 'center' },
  soloBox: { alignItems: 'center' },
  stars: { color: '#f2c14e', fontSize: 34, letterSpacing: 4 },
  starOff: { color: '#ffffff33' },
  soloLine: { color: CHALK, fontSize: 15, fontWeight: '700' },
  table: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#00000033',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rowWinner: { backgroundColor: '#2e7d4f' },
  rank: { color: CHALK, fontSize: 18, fontWeight: '900', width: 18, textAlign: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: INK },
  name: { color: CHALK, fontSize: 15, fontWeight: '800' },
  breakdown: { color: CHALK, fontSize: 12, opacity: 0.85 },
  points: { color: '#f2c14e', fontSize: 22, fontWeight: '900', minWidth: 44, textAlign: 'right' },
  buttons: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  button: { backgroundColor: CHALK, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  ghost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: CHALK },
  buttonText: { color: INK, fontSize: 16, fontWeight: '800' },
});

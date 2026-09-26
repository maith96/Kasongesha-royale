import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isUnlocked, LEVELS, maxStars, Progress, totalStars } from '../game/campaign';
import { STAGES } from '../game/stages';
import { SURFACES } from '../game/surfaces';
import { nameOf } from '../i18n';
import { useStrings } from '../i18n/useStrings';
import { CHALK, GOLD, INK, ui } from '../ui/theme';

type Props = { progress: Progress; onPlay: (levelIndex: number) => void; onBack: () => void };

export function Campaign({ progress, onPlay, onBack }: Props) {
  const t = useStrings();
  const total = totalStars(progress);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={ui.link}>{t.common.back}</Text>
        </Pressable>
        <Text style={ui.heading}>{t.campaign.title}</Text>
        <Text style={styles.total}>
          <Text style={{ color: GOLD }}>★</Text> {total} / {maxStars()}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {LEVELS.map((lvl, i) => {
          const open = isUnlocked(progress, i);
          const stars = progress.stars[lvl.id] ?? 0;
          const stage = STAGES[lvl.stage];
          const ground = SURFACES[lvl.surface];
          return (
            <Pressable
              key={lvl.id}
              disabled={!open}
              onPress={() => onPlay(i)}
              style={[styles.card, lvl.bonusStars !== undefined && styles.bonus, !open && styles.locked]}
            >
              <Text style={styles.num}>{lvl.bonusStars !== undefined ? t.campaign.bonus(lvl.id.slice(1)) : t.campaign.level(lvl.id)}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {nameOf(t.levels, lvl.id)}
              </Text>
              <Text style={styles.board}>
                {stage.icon} {ground.icon}
                {lvl.wet ? ' 🌧' : ''}
              </Text>
              {open ? (
                <Text style={styles.stars}>
                  {'★'.repeat(stars)}
                  <Text style={styles.starOff}>{'★'.repeat(3 - stars)}</Text>
                  <Text style={styles.par}>  {t.campaign.par(lvl.par)}</Text>
                </Text>
              ) : (
                <Text style={styles.lock}>🔒 {lvl.bonusStars !== undefined ? `${lvl.bonusStars} ★` : t.campaign.finishPrevious}</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  total: { color: CHALK, fontSize: 18, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingBottom: 20 },
  card: {
    width: 150,
    backgroundColor: CHALK,
    borderRadius: 14,
    padding: 10,
    gap: 2,
  },
  bonus: { backgroundColor: '#f7e3b0' },
  locked: { opacity: 0.45 },
  num: { color: '#7a5634', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  name: { color: INK, fontSize: 15, fontWeight: '900' },
  board: { fontSize: 16 },
  stars: { color: '#d99a00', fontSize: 16 },
  starOff: { color: '#00000022' },
  par: { color: '#7a5634', fontSize: 11, fontWeight: '700' },
  lock: { color: INK, fontSize: 12, fontWeight: '700' },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { STAGES } from '../game/stages';
import { SURFACES } from '../game/surfaces';
import { PLAYER_COLORS } from '../game/useGame';
import { nameOf } from '../i18n';
import { useStrings } from '../i18n/useStrings';
import { myUid, OnlineError, signIn, startMatch, submitKick, watchMatch } from '../online/api';
import { boardFor, MatchDoc, MIN_PLAYERS } from '../online/model';
import { useOnlineGame } from '../online/useOnlineGame';
import { CHALK, GOLD, INK, ui } from '../ui/theme';
import { GameView, MatchConfig } from './GameScreen';

type Props = { code: string; onExit: () => void };

// Follows one online match: lobby while waiting, then the game.
export function OnlineMatch({ code, onExit }: Props) {
  const t = useStrings();
  const [doc, setDoc] = useState<MatchDoc | null | undefined>(undefined);
  const [uid, setUid] = useState<string | null>(myUid());
  const [error, setError] = useState('');

  useEffect(() => {
    signIn().then((u) => setUid(u.uid)).catch(() => setError(t.online.errors.network));
    return watchMatch(code, setDoc, () => setError(t.online.errors.network));
  }, [code, t]);

  if (error) return <Centered text={error} onExit={onExit} />;
  if (doc === undefined || !uid) return <Centered text={t.online.connecting} spinner onExit={onExit} />;
  if (doc === null) return <Centered text={t.online.errors['not-found']} onExit={onExit} />;
  if (doc.status === 'waiting') return <Lobby doc={doc} uid={uid} onExit={onExit} />;
  return <OnlineGame doc={doc} uid={uid} onExit={onExit} />;
}

function OnlineGame({ doc, uid, onExit }: { doc: MatchDoc; uid: string; onExit: () => void }) {
  const t = useStrings();
  const submit = useCallback((expected: number, kick: { angle: number; power: number }) => submitKick(doc.code, expected, kick), [doc.code]);
  const g = useOnlineGame(doc, uid, submit);
  const { par, settings } = boardFor(doc.config);
  const stage = STAGES[doc.config.stage];
  const config: MatchConfig = {
    title: t.stageTitle(doc.config.stage + 1, nameOf(t.stages, stage.name)),
    stage: doc.config.stage,
    surface: doc.config.surface,
    wet: doc.config.wet,
    par,
    playerCount: doc.players.length,
    kicksPerTurn: doc.config.kicksPerTurn,
    firstPlayer: 0,
  };
  return <GameView config={config} g={g} settings={settings} onExit={onExit} next={null} showNames />;
}

function Lobby({ doc, uid, onExit }: { doc: MatchDoc; uid: string; onExit: () => void }) {
  const t = useStrings();
  const isHost = doc.hostUid === uid;
  const canStart = isHost && doc.players.length >= MIN_PLAYERS;
  const [starting, setStarting] = useState(false);
  const stage = STAGES[doc.config.stage];
  const ground = SURFACES[doc.config.surface];

  const start = async () => {
    setStarting(true);
    try {
      await startMatch(doc.code);
    } catch (e) {
      if (!(e instanceof OnlineError)) setStarting(false);
    }
  };

  return (
    <View style={styles.lobby}>
      <View style={styles.left}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={ui.link}>{t.online.leave}</Text>
        </Pressable>
        <Text style={styles.label}>{t.online.codeLabel}</Text>
        <Text style={styles.code} selectable>
          {doc.code}
        </Text>
        <Pressable style={[ui.button, styles.small]} onPress={() => Share.share({ message: t.online.shareMessage(doc.code) })}>
          <Text style={ui.buttonText}>{t.online.share}</Text>
        </Pressable>
        <Text style={styles.setup}>
          {stage.icon} {nameOf(t.stages, stage.name)} · {ground.icon} {nameOf(t.surfaces, ground.name)}
          {doc.config.wet ? ` · 🌧 ${t.wet}` : ''} · {t.freePlay.kicksPerTurn} {doc.config.kicksPerTurn}
        </Text>
      </View>
      <View style={[ui.card, styles.right]}>
        <Text style={styles.label}>{t.online.seats(doc.players.length, doc.maxPlayers)}</Text>
        {doc.players.map((p, i) => (
          <View key={p.uid} style={styles.player}>
            <View style={[styles.dot, { backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }]} />
            <Text style={styles.playerName}>{p.name}</Text>
            {p.uid === doc.hostUid && <Text style={styles.badge}>{t.online.hostBadge}</Text>}
            {p.uid === uid && <Text style={styles.badge}>{t.online.you}</Text>}
          </View>
        ))}
        {isHost ? (
          <Pressable style={[ui.button, styles.small, !canStart && styles.disabled]} disabled={!canStart || starting} onPress={start}>
            <Text style={ui.buttonText}>{canStart ? t.online.start : t.online.waitingForFriend}</Text>
          </Pressable>
        ) : (
          <View style={styles.waitRow}>
            <ActivityIndicator color={CHALK} />
            <Text style={styles.label}>{t.online.waitingForHost}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Centered({ text, spinner, onExit }: { text: string; spinner?: boolean; onExit: () => void }) {
  const t = useStrings();
  return (
    <View style={styles.centered}>
      {spinner && <ActivityIndicator color={CHALK} size="large" />}
      <Text style={styles.label}>{text}</Text>
      <Pressable onPress={onExit} hitSlop={12}>
        <Text style={ui.link}>{t.common.back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lobby: { flex: 1, flexDirection: 'row', padding: 20, gap: 24, alignItems: 'center' },
  left: { flex: 1, gap: 10 },
  right: { width: 300, gap: 10 },
  label: { color: CHALK, fontSize: 15, fontWeight: '700' },
  code: { color: GOLD, fontSize: 56, fontWeight: '900', letterSpacing: 10 },
  small: { minWidth: 0, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 20 },
  setup: { color: CHALK, fontSize: 14, opacity: 0.85 },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: INK },
  playerName: { color: CHALK, fontSize: 17, fontWeight: '800' },
  badge: { color: INK, backgroundColor: CHALK, borderRadius: 6, paddingHorizontal: 6, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  waitRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
});

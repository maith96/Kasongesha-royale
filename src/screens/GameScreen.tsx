import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { isMuted, setMuted } from '../audio/sounds';
import { BalanceMeter } from '../components/BalanceMeter';
import { Board } from '../components/Board';
import { PowerBar } from '../components/PowerBar';
import { Results } from '../components/Results';
import type { MatchSettings, Standing } from '../game/match';
import { buildReplay } from '../game/replay';
import { progressFraction } from '../game/rules';
import { STAGES } from '../game/stages';
import { friction, SURFACES } from '../game/surfaces';
import { BALANCE_ENABLED, GameState, useGame } from '../game/useGame';
import { useReplay } from '../game/useReplay';
import { nameOf } from '../i18n';
import { useStrings } from '../i18n/useStrings';
import { CHALK, INK, ui } from '../ui/theme';

export type MatchConfig = {
  title: string; // e.g. "Level 4 · Market square" or "Stage 2 · Square"
  stage: number;
  surface: number;
  wet: boolean;
  par: number;
  playerCount: number;
  kicksPerTurn: number;
  firstPlayer: number;
};

type Props = {
  config: MatchConfig;
  onRestart: () => void;
  onRematch: () => void;
  onExit: () => void;
  // Offered on the results screen, e.g. "Next level ▶". Worked out after onFinished.
  next: { label: string; onPress: () => void } | null;
  onFinished?: (results: Standing[]) => void;
};

// A local game: solo, campaign or pass-and-play on one phone.
export function GameScreen(props: Props) {
  const { stage, surface, wet, par, playerCount, kicksPerTurn, firstPlayer } = props.config;
  const [settings] = useState<MatchSettings>(() => ({ kicksPerTurn: playerCount === 1 ? 1 : kicksPerTurn, par }));
  const fr = friction(SURFACES[surface], wet);
  const g = useGame(playerCount, STAGES[stage].cfg, fr, settings, firstPlayer, wet);
  return <GameView {...props} g={g} settings={settings} />;
}

type ViewProps = {
  config: MatchConfig;
  g: GameState; // from useGame or useOnlineGame
  settings: MatchSettings;
  onExit: () => void;
  onRestart?: () => void; // hidden when absent (online)
  onRematch?: () => void;
  next: { label: string; onPress: () => void } | null;
  onFinished?: (results: Standing[]) => void;
  showNames?: boolean; // online: real names on the player chips
};

// The game screen itself: side panel, board, power bar, results and replay.
export function GameView({ config, g, settings, onExit, onRestart, onRematch, next, onFinished, showNames }: ViewProps) {
  const { title, stage, surface, wet, par, playerCount, firstPlayer } = config;
  const t = useStrings();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { cfg, icon } = STAGES[stage];
  const ground = SURFACES[surface];
  const fr = friction(ground, wet);
  const [power, setPower] = useState(0);
  useEffect(() => setPower(0), [g.current]);

  // Report the result once.
  const reported = useRef(false);
  useEffect(() => {
    if (g.results && !reported.current) {
      reported.current = true;
      onFinished?.(g.results);
    }
  }, [g.results, onFinished]);

  // Replay mode: rebuild the match from its kick log and play it back.
  const [replaying, setReplaying] = useState(false);
  const replay = useMemo(
    () => (replaying ? buildReplay(cfg, fr, settings, playerCount, firstPlayer, g.log) : null),
    [replaying, cfg, fr, settings, playerCount, firstPlayer, g.log],
  );
  const r = useReplay(replay, playerCount, cfg);
  const watching = replaying && r !== null;

  const players = watching ? g.players.map((p, i) => ({ ...p, ...r.positions[i] })) : g.players;
  const focus = watching ? r.focus : g.focus;
  const me = players[focus];
  const message = watching ? r.message : g.message;
  const tone = watching ? r.tone : g.tone;
  const boardSize = Math.max(0, Math.min(area.width, area.height - BOARD_PAD * 2));

  // Shake the board on a failed kick.
  const shake = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (g.effect?.kind !== 'fail') return;
    Animated.sequence(
      [10, -9, 7, -5, 3, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true })),
    ).start();
  }, [g.effect, shake]);

  const [muted, setMutedState] = useState(isMuted());
  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <View style={styles.game}>
      <View style={styles.side}>
        <View style={styles.links}>
          <Pressable onPress={onExit} hitSlop={12}>
            <Text style={ui.link}>{t.common.menu}</Text>
          </Pressable>
          <View style={styles.linkGroup}>
            <Pressable onPress={toggleMute} hitSlop={10}>
              <Text style={ui.link}>{muted ? '🔇' : '🔊'}</Text>
            </Pressable>
            {!watching && onRestart && (
              <Pressable onPress={onRestart} hitSlop={10}>
                <Text style={ui.link}>↻</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.stageLabel} numberOfLines={2}>
          {icon}  {title}
        </Text>
        <Text style={styles.surfaceLabel}>
          {ground.icon} {nameOf(t.surfaces, ground.name)}
          {wet ? `  🌧 ${t.wet}` : ''}
          {`  ·  ${playerCount > 1 ? t.common.round(watching ? r.round : g.round) : t.common.par(par)}`}
        </Text>

        <View style={styles.chips}>
          {players.map((p, i) => (
            <View key={i} style={[styles.chip, i === focus && { borderColor: p.color, backgroundColor: '#00000033' }]}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={[styles.chipText, i === focus && styles.chipTextActive]}>{playerCount === 1 ? t.common.you : showNames ? p.name : t.common.playerShort(i + 1)}</Text>
              {!watching && (
                <Text style={[styles.chipText, styles.chipStat, i === focus && styles.chipTextActive]}>
                  {p.finished ? '🏁' : `${Math.round(progressFraction(cfg, p.x, p.y) * 100)}%`} · {t.common.kicks(p.kicks)}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={[styles.banner, BANNER[tone]]}>
          <Text style={styles.bannerText} numberOfLines={4}>
            {message || ' '}
          </Text>
        </View>

        {watching && (
          <View style={styles.controls}>
            <Text style={styles.replayLabel}>
              {t.replay.label(r.index + 1, r.count)}
            </Text>
            <View style={styles.controlRow}>
              <Pressable style={styles.ctrl} onPress={r.togglePause}>
                <Text style={styles.ctrlText}>{r.paused ? '▶' : '❚❚'}</Text>
              </Pressable>
              <Pressable style={styles.ctrl} onPress={r.toggleSpeed}>
                <Text style={styles.ctrlText}>{r.speed}×</Text>
              </Pressable>
              <Pressable style={styles.ctrl} onPress={r.skip}>
                <Text style={styles.ctrlText}>⏭</Text>
              </Pressable>
              <Pressable style={styles.ctrl} onPress={r.restart}>
                <Text style={styles.ctrlText}>⟲</Text>
              </Pressable>
            </View>
            <Pressable style={[ui.button, styles.closeReplay]} onPress={() => setReplaying(false)}>
              <Text style={[ui.buttonText, { fontSize: 15 }]}>{t.replay.close}</Text>
            </Pressable>
          </View>
        )}

        {BALANCE_ENABLED && !watching && <BalanceMeter wobble={g.phase === 'aim' ? g.wobble : 0} footDownAt={g.footDownAt} />}
      </View>

      <View style={styles.boardArea} onLayout={(e) => setArea(e.nativeEvent.layout)}>
        {boardSize > 0 && (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <Board
            cfg={cfg}
            surface={ground}
            wet={wet}
            size={boardSize}
            players={players}
            current={focus}
            movingStone={watching ? r.movingStone : g.movingStone}
            aim={g.aim}
            power={power}
            canAim={!watching && g.phase === 'aim'}
            onAim={g.setAim}
            lastLanding={watching ? null : g.lastLanding}
            effect={watching ? null : g.effect}
          />
          </Animated.View>
        )}
      </View>

      {/* same width as the left panel so the board sits in the middle of the screen */}
      <View style={styles.powerSide}>
        <PowerBar
          height={Math.max(120, area.height * 0.72)}
          color={me.color}
          enabled={!watching && g.phase === 'aim'}
          onShoot={g.push}
          onPowerChange={setPower}
        />
      </View>

      {g.results && !replaying && (
        <Results
          results={g.results}
          players={g.players}
          par={par}
          next={next}
          onReplay={() => setReplaying(true)}
          onRematch={onRematch}
          onMenu={onExit}
        />
      )}
    </View>
  );
}

const SIDE_PANEL = 170;
const BOARD_PAD = 4;

const BANNER = StyleSheet.create({
  info: { backgroundColor: '#00000022' },
  good: { backgroundColor: '#2e7d4f' },
  bad: { backgroundColor: '#b23a2e' },
});

const styles = StyleSheet.create({
  game: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  side: { width: SIDE_PANEL, alignSelf: 'stretch', paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  links: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkGroup: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  stageLabel: { color: CHALK, fontSize: 14, fontWeight: '800' },
  surfaceLabel: { color: CHALK, fontSize: 13, fontWeight: '600', marginTop: -6, opacity: 0.85 },
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
  chipStat: { fontSize: 12 },
  banner: { minHeight: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 10 },
  bannerText: { color: CHALK, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  controls: { gap: 8 },
  replayLabel: { color: CHALK, fontSize: 13, fontWeight: '800' },
  controlRow: { flexDirection: 'row', gap: 6 },
  ctrl: { flex: 1, height: 36, borderRadius: 10, borderWidth: 2, borderColor: CHALK, alignItems: 'center', justifyContent: 'center' },
  ctrlText: { color: CHALK, fontSize: 15, fontWeight: '900' },
  closeReplay: { minWidth: 0, paddingVertical: 8, paddingHorizontal: 10 },
  boardArea: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: BOARD_PAD },
  powerSide: { width: SIDE_PANEL, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'center' },
});

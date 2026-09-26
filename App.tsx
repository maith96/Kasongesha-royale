import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BalanceMeter } from './src/components/BalanceMeter';
import { Board } from './src/components/Board';
import { PowerBar } from './src/components/PowerBar';
import { Results } from './src/components/Results';
import { progressFraction } from './src/game/rules';
import { STAGES } from './src/game/stages';
import { friction, SURFACES } from './src/game/surfaces';
import { BALANCE_ENABLED, useGame } from './src/game/useGame';

export default function App() {
  const [players, setPlayers] = useState<number | null>(null);
  const [stage, setStage] = useState(0);
  const [surface, setSurface] = useState(0);
  const [wet, setWet] = useState(false);
  const [kicksPerTurn, setKicksPerTurn] = useState(1);
  // Bumped to start a fresh match; firstPlayer rotates on rematch.
  const [matchNo, setMatchNo] = useState(0);
  const [firstPlayer, setFirstPlayer] = useState(0);
  const startMatch = (n: number) => {
    setFirstPlayer(0);
    setMatchNo((k) => k + 1);
    setPlayers(n);
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        {/* Fullscreen: hide the status bar and Android nav bar (swipe from an edge to peek) */}
        <StatusBar style="light" hidden />
        <NavigationBar hidden />
        {players === null ? (
          <Menu
            stage={stage}
            onStage={setStage}
            surface={surface}
            onSurface={setSurface}
            wet={wet}
            onWet={setWet}
            kicksPerTurn={kicksPerTurn}
            onKicksPerTurn={setKicksPerTurn}
            onStart={startMatch}
          />
        ) : (
          // Keyed so a new stage or player count starts a fresh game.
          <Game
            key={`${stage}-${surface}-${wet}-${players}-${kicksPerTurn}-${matchNo}`}
            stage={stage}
            surface={surface}
            wet={wet}
            kicksPerTurn={kicksPerTurn}
            firstPlayer={firstPlayer}
            onRestart={() => setMatchNo((k) => k + 1)}
            onRematch={() => {
              setFirstPlayer((f) => (f + 1) % players);
              setMatchNo((k) => k + 1);
            }}
            playerCount={players}
            onNextStage={() => setStage((s) => (s + 1) % STAGES.length)}
            onExit={() => setPlayers(null)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type MenuProps = {
  stage: number;
  onStage: (s: number) => void;
  surface: number;
  onSurface: (s: number) => void;
  wet: boolean;
  onWet: (w: boolean) => void;
  kicksPerTurn: number;
  onKicksPerTurn: (k: number) => void;
  onStart: (n: number) => void;
};

// A row of icon + label choices.
function Picker({ items, value, onChange }: { items: { icon: string; name: string }[]; value: number; onChange: (i: number) => void }) {
  return (
    <View style={styles.stages}>
      {items.map((s, i) => (
        <Pressable key={s.name} style={[styles.stage, i === value && styles.stageActive]} onPress={() => onChange(i)}>
          <Text style={[styles.stageIcon, i === value && styles.stageTextActive]}>{s.icon}</Text>
          <Text style={[styles.stageName, i === value && styles.stageTextActive]}>{s.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Menu({ stage, onStage, surface, onSurface, wet, onWet, kicksPerTurn, onKicksPerTurn, onStart }: MenuProps) {
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
        <Picker items={STAGES} value={stage} onChange={onStage} />
        <Picker items={SURFACES} value={surface} onChange={onSurface} />
        <View style={styles.optionRow}>
          <Pressable style={[styles.wet, wet && styles.stageActive]} onPress={() => onWet(!wet)}>
            <Text style={[styles.stageName, styles.wetText, wet && styles.stageTextActive]}>{wet ? '🌧  Rainy' : '☀️  Dry'}</Text>
          </Pressable>
          <View style={styles.kpt}>
            <Text style={[styles.stageName, styles.stageTextActive]}>Kicks / turn</Text>
            {[1, 2, 3].map((k) => (
              <Pressable key={k} style={[styles.kptButton, k === kicksPerTurn && styles.stageActive]} onPress={() => onKicksPerTurn(k)}>
                <Text style={[styles.stageName, styles.wetText, k === kicksPerTurn && styles.stageTextActive]}>{k}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.playGrid}>
          {[1, 2, 3, 4].map((n) => (
            <Pressable key={n} style={[styles.button, styles.playButton]} onPress={() => onStart(n)}>
              <Text style={styles.buttonText}>{n === 1 ? 'Practice' : `${n} players`}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

type GameProps = {
  stage: number;
  surface: number;
  wet: boolean;
  kicksPerTurn: number;
  firstPlayer: number;
  playerCount: number;
  onRestart: () => void;
  onRematch: () => void;
  onNextStage: () => void;
  onExit: () => void;
};

function Game(props: GameProps) {
  const { stage, surface, wet, kicksPerTurn, firstPlayer, playerCount, onRestart, onRematch, onNextStage, onExit } = props;
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { cfg, name, icon, par } = STAGES[stage];
  const ground = SURFACES[surface];
  const [settings] = useState(() => ({ kicksPerTurn: playerCount === 1 ? 1 : kicksPerTurn, par }));
  const g = useGame(playerCount, cfg, friction(ground, wet), settings, firstPlayer);
  const me = g.players[g.focus];
  const [power, setPower] = useState(0);
  useEffect(() => setPower(0), [g.current]);
  const boardSize = Math.max(0, Math.min(area.width, area.height - BOARD_PAD * 2));

  return (
    <View style={styles.game}>
      <View style={styles.side}>
        <View style={styles.links}>
          <Pressable onPress={onExit} hitSlop={12}>
            <Text style={styles.link}>‹ Menu</Text>
          </Pressable>
          <Pressable onPress={onRestart} hitSlop={12}>
            <Text style={styles.link}>↻</Text>
          </Pressable>
        </View>

        <Text style={styles.stageLabel}>
          {icon}  Stage {stage + 1} · {name}
        </Text>
        <Text style={styles.surfaceLabel}>
          {ground.icon} {ground.name}
          {wet ? '  🌧 Wet' : ''}
          {playerCount > 1 ? `  ·  Round ${g.round}` : `  ·  Par ${par}`}
        </Text>

        <View style={styles.chips}>
          {g.players.map((p, i) => (
            <View key={i} style={[styles.chip, i === g.focus && { borderColor: p.color, backgroundColor: '#00000033' }]}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={[styles.chipText, i === g.focus && styles.chipTextActive]}>
                {playerCount === 1 ? 'You' : `P${i + 1}`}
              </Text>
              <Text style={[styles.chipText, styles.chipStat, i === g.focus && styles.chipTextActive]}>
                {p.finished ? '🏁' : `${Math.round(progressFraction(cfg, p.x, p.y) * 100)}%`} · {p.kicks} kick{p.kicks === 1 ? '' : 's'}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.banner, BANNER[g.tone]]}>
          <Text style={styles.bannerText} numberOfLines={4}>
            {g.message || ' '}
          </Text>
        </View>

        {BALANCE_ENABLED && <BalanceMeter wobble={g.phase === 'aim' ? g.wobble : 0} footDownAt={g.footDownAt} />}
      </View>

      <View style={styles.boardArea} onLayout={(e) => setArea(e.nativeEvent.layout)}>
        {boardSize > 0 && (
          <Board
            cfg={cfg}
            surface={ground}
            wet={wet}
            size={boardSize}
            players={g.players}
            current={g.focus}
            movingStone={g.movingStone}
            aim={g.aim}
            power={power}
            canAim={g.phase === 'aim'}
            onAim={g.setAim}
          />
        )}
      </View>

      {/* same width as the left panel so the board sits in the middle of the screen */}
      <View style={styles.powerSide}>
        <PowerBar
          height={Math.max(120, area.height * 0.72)}
          color={me.color}
          enabled={g.phase === 'aim'}
          onShoot={g.push}
          onPowerChange={setPower}
        />
      </View>

      {g.results && (
        <Results
          results={g.results}
          players={g.players}
          par={par}
          hasNextStage={stage + 1 < STAGES.length}
          onRematch={onRematch}
          onNextStage={onNextStage}
          onMenu={onExit}
        />
      )}
    </View>
  );
}

const CHALK = '#fdf6e3';
const INK = '#2a1a0c';
const SIDE_PANEL = 170;
const BOARD_PAD = 4;

const BANNER = StyleSheet.create({
  info: { backgroundColor: '#00000022' },
  good: { backgroundColor: '#2e7d4f' },
  bad: { backgroundColor: '#b23a2e' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#7a5634' },
  menu: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 40 },
  menuLeft: { alignItems: 'center', gap: 16, flexShrink: 1 },
  menuRight: { gap: 8, width: 300 },
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
  stages: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  stage: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fdf6e355',
  },
  stageActive: { borderColor: CHALK, backgroundColor: '#00000033' },
  stageIcon: { color: CHALK, fontSize: 20, opacity: 0.6 },
  stageName: { color: CHALK, fontSize: 12, fontWeight: '700', opacity: 0.6 },
  stageTextActive: { opacity: 1 },
  stageLabel: { color: CHALK, fontSize: 14, fontWeight: '800' },
  surfaceLabel: { color: CHALK, fontSize: 13, fontWeight: '600', marginTop: -6, opacity: 0.85 },
  wet: { flex: 1, justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: '#fdf6e355', paddingVertical: 8, alignItems: 'center' },
  wetText: { fontSize: 14 },
  optionRow: { flexDirection: 'row', gap: 8 },
  kpt: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fdf6e355',
    paddingHorizontal: 8,
  },
  kptButton: { width: 30, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  chipStat: { fontSize: 12 },
  playGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: 300 },
  playButton: { minWidth: 0, width: 146, paddingVertical: 10 },
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
  boardArea: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: BOARD_PAD },
  powerSide: { width: SIDE_PANEL, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'center' },
});

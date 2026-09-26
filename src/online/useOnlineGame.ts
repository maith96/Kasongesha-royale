import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { playSound } from '../audio/sounds';
import { applyKick, currentPlayer, MatchState, Standing, standings } from '../game/match';
import { Tone, verdictMessage } from '../game/messages';
import { isCloseCall } from '../game/rules';
import { Kick, KickResult, quantizeKick, SIM_DT, simulateKick } from '../game/sim';
import { Effect, GameState, Phase, Player, PLAYER_COLORS } from '../game/useGame';
import { strings } from '../i18n';
import { boardFor, MatchDoc, rebuild } from './model';

const RESULT_PAUSE_MS = 1200;

// Drives an online match. `doc` is the latest snapshot from Firestore. The
// board shows the match rebuilt from the kicks it has animated so far; newer
// kicks (from anyone) are animated one by one. My own kick is animated at
// once and sent with `submit`; if that fails, we resync from the snapshot.
export function useOnlineGame(
  doc: MatchDoc,
  myUid: string,
  submit: (expectedKicks: number, kick: Kick) => Promise<void>,
): GameState {
  // Stable for the whole match (the config never changes once playing), so the
  // callbacks below, and the animation loop, aren't recreated on every render.
  const { stage, surface, wet: isWet, kicksPerTurn } = doc.config;
  const { cfg, friction: fr, settings } = useMemo(
    () => boardFor({ stage, surface, wet: isWet, kicksPerTurn }),
    [stage, surface, isWet, kicksPerTurn],
  );
  const wet = doc.config.wet;
  const count = doc.players.length;
  const [, setTick] = useState(0);
  const redraw = () => setTick((t) => t + 1);

  const docRef = useRef(doc);
  docRef.current = doc;
  // Joining mid-match shows the current position straight away.
  const match = useRef<MatchState>(rebuild(doc));
  const applied = useRef(doc.kicks.length);
  const busy = useRef<'idle' | 'moving' | 'result'>('idle');
  const flight = useRef<{ result: KickResult; kick: Kick; t: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const message = useRef('');
  const tone = useRef<Tone>('info');
  const aim = useRef(0);
  const effect = useRef<Effect | null>(null);
  const lastLanding = useRef<({ x: number; y: number } | null)[]>(Array(count).fill(null));

  const nameOf = (i: number) => doc.players[i]?.name ?? '';
  const isMine = (i: number) => doc.players[i]?.uid === myUid;

  const startKick = useCallback(
    (kick: Kick) => {
      const m = match.current;
      const p = m.players[currentPlayer(m)];
      const result = simulateKick(cfg, fr, { x: p.x, y: p.y }, kick);
      flight.current = { result, kick, t: 0 };
      busy.current = 'moving';
      message.current = '';
      tone.current = 'info';
      playSound('kick');
      if (result.path.length > 20) playSound(wet ? 'splash' : 'slide', Math.min(1, 0.3 + kick.power));
      redraw();
    },
    [cfg, fr, wet],
  );

  // Show whose turn it is, or animate the next kick we haven't shown yet.
  const settle = useCallback(() => {
    if (busy.current !== 'idle') return;
    const d = docRef.current;
    if (applied.current < d.kicks.length) {
      startKick(d.kicks[applied.current]);
      return;
    }
    const m = match.current;
    const t = strings();
    if (!m.over) {
      const who = currentPlayer(m);
      const p = m.players[who];
      aim.current = Math.atan2(p.y, p.x) + Math.PI / 2;
      const of = settings.kicksPerTurn > 1 ? t.turn.kickOf(m.kicksThisTurn + 1, settings.kicksPerTurn) : '';
      message.current = isMine(who) ? t.online.yourTurn + of : t.online.waitingFor(nameOf(who));
      tone.current = 'info';
    }
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKick, settings.kicksPerTurn]);

  const land = useCallback(() => {
    const f = flight.current;
    flight.current = null;
    if (!f) return;
    const before = match.current;
    const who = currentPlayer(before);
    const v = f.result.verdict;
    const end = f.result.end;
    match.current = applyKick(before, cfg, settings, f.kick, v, end).match;
    applied.current += 1;
    const said = verdictMessage(v, isMine(who) ? null : nameOf(who), isCloseCall(cfg, v, end), before.log.length);
    message.current = said.message;
    tone.current = said.tone;
    lastLanding.current[who] = end;
    effect.current = { id: before.log.length, x: end.x, y: end.y, kind: v.ok && v.win ? 'win' : !v.ok ? 'fail' : wet ? 'splash' : 'dust' };
    if (v.ok && v.win) {
      playSound('win');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!v.ok) {
      playSound('fail');
      if (isMine(who)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      playSound(isCloseCall(cfg, v, end) ? 'close' : 'good', 0.7);
    }
    if (wet && v.ok) playSound('splash', 0.5);
    busy.current = 'result';
    redraw();
    timer.current = setTimeout(() => {
      busy.current = 'idle';
      settle();
    }, RESULT_PAUSE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, settings, wet, settle]);

  // A new snapshot: catch up if we're idle.
  useEffect(() => {
    settle();
  }, [doc, settle]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      const f = flight.current;
      if (f) {
        f.t += dt;
        if (f.t / SIM_DT >= f.result.path.length - 1) land();
        redraw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [land]);

  // Pending pauses only stop when the screen closes.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const m = match.current;
  const current = currentPlayer(m);
  const caughtUp = applied.current === doc.kicks.length;
  const myTurn = !m.over && caughtUp && doc.status === 'playing' && doc.turnUid === myUid && isMine(current);
  const idle = busy.current === 'idle';
  const phase: Phase = !idle ? (busy.current === 'moving' ? 'moving' : 'result') : m.over && caughtUp ? 'over' : myTurn ? 'aim' : 'result';

  const setAim = useCallback((angle: number) => {
    aim.current = angle;
    redraw();
  }, []);

  const push = useCallback(
    (power: number) => {
      if (busy.current !== 'idle' || power <= 0) return;
      const d = docRef.current;
      if (applied.current !== d.kicks.length || d.turnUid !== myUid) return;
      const kick = quantizeKick({ angle: aim.current, power });
      const expected = applied.current;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startKick(kick);
      submit(expected, kick).catch(() => {
        // Rejected (someone else moved first, or offline): show the truth.
        if (timer.current) clearTimeout(timer.current);
        flight.current = null;
        match.current = rebuild(docRef.current);
        applied.current = docRef.current.kicks.length;
        busy.current = 'idle';
        message.current = strings().online.errors['not-your-turn'];
        tone.current = 'bad';
        redraw();
        setTimeout(settle, RESULT_PAUSE_MS);
      });
    },
    [myUid, startKick, submit, settle],
  );

  let movingStone: { x: number; y: number } | null = null;
  if (flight.current) {
    const { path } = flight.current.result;
    movingStone = path[Math.min(path.length - 1, Math.floor(flight.current.t / SIM_DT))];
  }
  const players: Player[] = m.players.map((p, i) => ({
    name: nameOf(i),
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    x: p.x,
    y: p.y,
    kicks: p.kicks,
    finished: p.finished,
  }));
  const results: Standing[] | null = m.over && caughtUp && idle ? standings(m, cfg, settings) : null;
  const focus = !idle && m.log.length ? m.log[m.log.length - 1].player : current;
  const mine = doc.players.findIndex((p) => p.uid === myUid);

  return {
    players,
    current,
    focus,
    kicksThisTurn: m.kicksThisTurn,
    round: m.round,
    phase,
    message: message.current,
    tone: tone.current,
    wobble: 0,
    footDownAt: 1,
    movingStone,
    aim: aim.current,
    results,
    effect: effect.current,
    lastLanding: mine >= 0 ? lastLanding.current[mine] : null,
    log: m.log,
    setAim,
    push,
  };
}

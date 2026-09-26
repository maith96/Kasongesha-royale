import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { applyKick, currentPlayer, MatchSettings, MatchState, newMatch, Standing, standings } from './match';
import { playSound } from '../audio/sounds';
import { playerName, Tone, verdictMessage } from './messages';
import { isCloseCall } from './rules';
import { KickResult, quantizeKick, SIM_DT, simulateKick } from './sim';
import { SpiralConfig } from './spiral';

// Balance meter (hopping on one leg) is switched off until it plays well.
export const BALANCE_ENABLED = false;
const WOBBLE_ANGLE = 0.35; // radians of aim error at full wobble
const FOOT_DOWN = 0.9; // wobble beyond this means you lost balance
const RESULT_PAUSE_MS = 1200; // after a kick, before the next one
const TURN_PAUSE_MS = 1600; // a bit longer when the turn passes

export type Player = { name: string; color: string; x: number; y: number; kicks: number; finished: boolean };
export type Phase = 'aim' | 'moving' | 'result' | 'over';
export type { Tone };

// A short visual effect where a kick stopped. `id` changes for every kick.
export type Effect = { id: number; x: number; y: number; kind: 'dust' | 'splash' | 'fail' | 'win' };

export const PLAYER_COLORS = ['#c0392b', '#1f6fb2', '#27864a', '#8e44ad'];


// Default aim: straight ahead along the track (the spiral runs clockwise).
function trackDirection(p: { x: number; y: number }): number {
  return Math.atan2(p.y, p.x) + Math.PI / 2;
}


// The hook is remounted per match (see App), so its arguments are fixed for its
// lifetime. Friction: world units / s², from the surface.
export function useGame(
  playerCount: number,
  cfg: SpiralConfig,
  friction: number,
  settings: MatchSettings,
  firstPlayer: number,
  wet: boolean,
) {
  const [, setTick] = useState(0);
  const redraw = () => setTick((t) => t + 1);
  const match = useRef<MatchState>(newMatch(cfg, playerCount, firstPlayer));
  const phase = useRef<Phase>('aim');
  const tone = useRef<Tone>('info');
  const message = useRef('');
  const aim = useRef(0);
  const wobble = useRef(0);
  const wobbleSpeed = useRef(2.2);
  const flight = useRef<{ result: KickResult; t: number } | null>(null);
  const pending = useRef<{ kick: { angle: number; power: number }; result: KickResult } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effect = useRef<Effect | null>(null);
  // Where each player's last kick stopped (even a failed one), to learn power.
  const lastLanding = useRef<({ x: number; y: number } | null)[]>(Array(playerCount).fill(null));

  const turnMessage = useCallback(() => {
    const m = match.current;
    const who = currentPlayer(m);
    if (playerCount === 1) return `Kick ${m.players[0].kicks + 1}`;
    const of = settings.kicksPerTurn > 1 ? ` · kick ${m.kicksThisTurn + 1} of ${settings.kicksPerTurn}` : '';
    return `${playerName(who, playerCount)}'s turn${of}`;
  }, [playerCount, settings.kicksPerTurn]);

  const startAiming = useCallback(() => {
    const m = match.current;
    const p = m.players[currentPlayer(m)];
    phase.current = 'aim';
    aim.current = trackDirection(p);
    wobbleSpeed.current = 1.8 + Math.random() * 1.6;
    message.current = turnMessage();
    tone.current = 'info';
    redraw();
  }, [turnMessage]);

  // Called when the animation of a kick has finished.
  const land = useCallback(() => {
    const done = pending.current;
    pending.current = null;
    flight.current = null;
    if (!done) return;
    const before = match.current;
    const who = currentPlayer(before);
    const { match: next, turnEnded } = applyKick(before, cfg, settings, done.kick, done.result.verdict, done.result.end);
    match.current = next;
    const v = done.result.verdict;
    const end = done.result.end;
    const close = isCloseCall(cfg, v, end);
    const said = verdictMessage(v, playerCount === 1 ? null : playerName(who, playerCount), close, before.log.length);
    lastLanding.current[who] = end;
    effect.current = {
      id: before.log.length,
      x: end.x,
      y: end.y,
      kind: v.ok && v.win ? 'win' : !v.ok ? 'fail' : wet ? 'splash' : 'dust',
    };
    if (v.ok && v.win) playSound('win');
    else if (!v.ok) playSound('fail');
    else playSound(close ? 'close' : 'good', 0.7);
    if (wet && v.ok) playSound('splash', 0.5);
    message.current = said.message;
    tone.current = said.tone;
    if (v.ok && v.win) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (!v.ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    phase.current = next.over ? 'over' : 'result';
    redraw();
    if (!next.over) {
      timer.current = setTimeout(startAiming, turnEnded && playerCount > 1 ? TURN_PAUSE_MS : RESULT_PAUSE_MS);
    }
  }, [cfg, settings, playerCount, startAiming, wet]);

  // Animation loop: plays the pre-computed path in real time; also wobbles the
  // balance meter when that's switched on.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      clock += dt;
      if (phase.current === 'aim' && BALANCE_ENABLED) {
        const w = wobbleSpeed.current;
        wobble.current = 0.75 * Math.sin(clock * w) + 0.25 * Math.sin(clock * w * 2.7 + 1);
        redraw();
      } else if (phase.current === 'moving' && flight.current) {
        flight.current.t += dt;
        if (flight.current.t / SIM_DT >= flight.current.result.path.length - 1) land();
        redraw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [land]);

  useEffect(() => {
    startAiming();
  }, [startAiming]);

  const setAim = useCallback((angle: number) => {
    if (phase.current !== 'aim') return;
    aim.current = angle;
    redraw();
  }, []);

  // power: 0..1 from the power bar. The stone goes in the aimed direction.
  const push = useCallback(
    (power: number) => {
      if (phase.current !== 'aim' || power <= 0) return;
      const m = match.current;
      const p = m.players[currentPlayer(m)];
      const w = BALANCE_ENABLED ? wobble.current : 0;
      const kick = quantizeKick({ angle: aim.current + w * WOBBLE_ANGLE, power: power * (1 - 0.15 * Math.abs(w)) });
      const result: KickResult =
        Math.abs(w) > FOOT_DOWN
          ? { path: [{ x: p.x, y: p.y }], end: { x: p.x, y: p.y }, verdict: { ok: false, reason: 'foot-down' } }
          : simulateKick(cfg, friction, { x: p.x, y: p.y }, kick);
      pending.current = { kick, result };
      flight.current = { result, t: 0 };
      phase.current = 'moving';
      message.current = '';
      tone.current = 'info';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playSound('kick');
      if (result.path.length > 20) playSound(wet ? 'splash' : 'slide', Math.min(1, 0.3 + kick.power));
      redraw();
    },
    [cfg, friction],
  );

  const m = match.current;
  const current = currentPlayer(m);
  let movingStone: { x: number; y: number } | null = null;
  if (phase.current === 'moving' && flight.current) {
    const { path } = flight.current.result;
    movingStone = path[Math.min(path.length - 1, Math.floor(flight.current.t / SIM_DT))];
  }
  const players: Player[] = m.players.map((p, i) => ({
    name: playerName(i, playerCount),
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    x: p.x,
    y: p.y,
    kicks: p.kicks,
    finished: p.finished,
  }));
  const results: Standing[] | null = m.over ? standings(m, cfg, settings) : null;
  // While a kick's result is showing, keep the kicker in focus even if the turn has passed.
  const showingResult = phase.current === 'result' || phase.current === 'over';
  const focus = showingResult && m.log.length ? m.log[m.log.length - 1].player : current;

  return {
    players,
    current,
    focus,
    kicksThisTurn: m.kicksThisTurn,
    round: m.round,
    phase: phase.current,
    message: message.current,
    tone: tone.current,
    wobble: wobble.current,
    footDownAt: FOOT_DOWN,
    movingStone,
    aim: aim.current,
    results,
    effect: effect.current,
    lastLanding: lastLanding.current[current],
    log: m.log,
    setAim,
    push,
  };
}

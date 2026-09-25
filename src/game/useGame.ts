import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { judgePush, PushTracker, Verdict } from './rules';
import { DEFAULT_SPIRAL, outerRadius, startPosition } from './spiral';

export const cfg = DEFAULT_SPIRAL;

const FRICTION = 520; // world units / s²
const MAX_SPEED = 760; // speed at full power
// Balance meter (hopping on one leg) is switched off until it plays well.
export const BALANCE_ENABLED = false;
const WOBBLE_ANGLE = 0.35; // radians of aim error at full wobble
const FOOT_DOWN = 0.9; // wobble beyond this means you lost balance
const RESULT_PAUSE_MS = 1400;

export type Player = { name: string; color: string; x: number; y: number };
export type Phase = 'aim' | 'moving' | 'result' | 'won';

const COLORS = ['#c0392b', '#1f6fb2', '#27864a', '#8e44ad'];

const FAIL_TEXT: Record<Extract<Verdict, { ok: false }>['reason'], string> = {
  line: 'Umeguza line! Back to start.',
  outside: 'Umetoka nje! Back to start.',
  'foot-down': 'Mguu chini! You lost balance. Back to start.',
};

const INTRO = 'Tap the board to aim, then pull the power bar down and let go.';

// Default aim: straight ahead along the track (the spiral runs clockwise).
function trackDirection(p: { x: number; y: number }): number {
  return Math.atan2(p.y, p.x) + Math.PI / 2;
}

function makePlayers(count: number): Player[] {
  const s = startPosition(cfg);
  return Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    color: COLORS[i % COLORS.length],
    ...s,
  }));
}

export function useGame(playerCount: number) {
  const [, setTick] = useState(0);
  const players = useRef<Player[]>(makePlayers(playerCount));
  const current = useRef(0);
  const phase = useRef<Phase>('aim');
  const message = useRef(INTRO);
  const aim = useRef(trackDirection(players.current[0]));
  const wobble = useRef(0);
  const wobbleSpeed = useRef(2.2);
  const stone = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const pushFrom = useRef({ x: 0, y: 0 });
  const tracker = useRef<PushTracker | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextTurn = useCallback(() => {
    current.current = (current.current + 1) % players.current.length;
    wobbleSpeed.current = 1.8 + Math.random() * 1.6;
    phase.current = 'aim';
    aim.current = trackDirection(players.current[current.current]);
    message.current = `${players.current[current.current].name}, your turn.`;
    setTick((t) => t + 1);
  }, []);

  const finishPush = useCallback(
    (verdict: Verdict) => {
      const p = players.current[current.current];
      if (verdict.ok) {
        p.x = stone.current.x;
        p.y = stone.current.y;
        if (verdict.win) {
          phase.current = 'won';
          message.current = `${p.name} amefika! 🏆`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTick((t) => t + 1);
          return;
        }
        message.current = verdict.shortcut ? 'Shortcut safi! 🔥' : 'Poa!';
      } else {
        Object.assign(p, startPosition(cfg));
        message.current = FAIL_TEXT[verdict.reason];
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      phase.current = 'result';
      setTick((t) => t + 1);
      resultTimer.current = setTimeout(nextTurn, RESULT_PAUSE_MS);
    },
    [nextTurn],
  );

  // Game loop: wobble the balance meter while aiming, slide the stone while moving.
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
        setTick((t) => t + 1);
      } else if (phase.current === 'moving') {
        const s = stone.current;
        const steps = 4;
        for (let i = 0; i < steps; i++) {
          const h = dt / steps;
          const speed = Math.hypot(s.vx, s.vy);
          if (speed < 4) {
            s.vx = s.vy = 0;
            break;
          }
          const decel = Math.min(FRICTION * h, speed);
          s.vx -= (s.vx / speed) * decel;
          s.vy -= (s.vy / speed) * decel;
          s.x += s.vx * h;
          s.y += s.vy * h;
          tracker.current?.step(s.x, s.y);
        }
        const flewOff = Math.hypot(s.x, s.y) > outerRadius(cfg) * 1.5;
        if (flewOff || (s.vx === 0 && s.vy === 0)) {
          finishPush(
            flewOff
              ? { ok: false, reason: 'outside' }
              : judgePush(cfg, pushFrom.current, s, tracker.current?.crossedLine ?? false),
          );
        }
        setTick((t) => t + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      if (resultTimer.current) clearTimeout(resultTimer.current);
    };
  }, [finishPush]);

  const setAim = useCallback((angle: number) => {
    if (phase.current !== 'aim') return;
    aim.current = angle;
    setTick((t) => t + 1);
  }, []);

  // power: 0..1 from the power bar. The stone goes in the aimed direction.
  const push = useCallback(
    (power: number) => {
      if (phase.current !== 'aim' || power <= 0) return;
      const p = players.current[current.current];
      const w = BALANCE_ENABLED ? wobble.current : 0;
      if (Math.abs(w) > FOOT_DOWN) {
        stone.current = { x: p.x, y: p.y, vx: 0, vy: 0 };
        finishPush({ ok: false, reason: 'foot-down' });
        return;
      }
      const angle = aim.current + w * WOBBLE_ANGLE;
      const speed = Math.min(power, 1) * MAX_SPEED * (1 - 0.15 * Math.abs(w));
      stone.current = { x: p.x, y: p.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
      pushFrom.current = { x: p.x, y: p.y };
      tracker.current = new PushTracker(cfg, p.x, p.y);
      phase.current = 'moving';
      message.current = '…';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [finishPush],
  );

  const restart = useCallback(() => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    players.current = makePlayers(playerCount);
    current.current = 0;
    phase.current = 'aim';
    aim.current = trackDirection(players.current[0]);
    message.current = INTRO;
    setTick((t) => t + 1);
  }, [playerCount]);

  return {
    players: players.current,
    current: current.current,
    phase: phase.current,
    message: message.current,
    wobble: wobble.current,
    footDownAt: FOOT_DOWN,
    movingStone: phase.current === 'moving' ? stone.current : null,
    aim: aim.current,
    setAim,
    push,
    restart,
  };
}

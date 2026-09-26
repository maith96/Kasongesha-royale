import { useCallback, useEffect, useRef, useState } from 'react';

import { playerName, Tone, verdictMessage } from './messages';
import type { Replay } from './replay';
import { isCloseCall } from './rules';
import type { SpiralConfig } from './spiral';
import { SIM_DT } from './sim';

const AFTER_KICK_S = 0.9; // pause on each result before the next kick

// Plays a rebuilt match back kick by kick.
export function useReplay(replay: Replay | null, playerCount: number, cfg: SpiralConfig) {
  const [, setTick] = useState(0);
  const step = useRef(0);
  const t = useRef(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const steps = replay?.steps ?? [];
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    step.current = 0;
    t.current = 0;
    setPaused(false);
  }, [replay]);

  useEffect(() => {
    if (!replay) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      const s = replay.steps[step.current];
      if (s && !pausedRef.current) {
        t.current += dt * speedRef.current;
        const slide = (s.path.length - 1) * SIM_DT;
        if (t.current > slide + AFTER_KICK_S && step.current < replay.steps.length - 1) {
          step.current += 1;
          t.current = 0;
        }
        setTick((k) => k + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [replay]);

  const skip = useCallback(() => {
    if (step.current < steps.length - 1) {
      step.current += 1;
      t.current = 0;
    } else {
      t.current = 1e9; // jump to the end of the last kick
    }
    setTick((k) => k + 1);
  }, [steps.length]);

  const restart = useCallback(() => {
    step.current = 0;
    t.current = 0;
    setPaused(false);
    setTick((k) => k + 1);
  }, []);

  // Recomputed every render; the animation loop re-renders each frame.
  const s = steps[step.current];
  if (!s) return null;
  const frame = Math.floor(t.current / SIM_DT);
  const sliding = frame < s.path.length - 1;
  const close = isCloseCall(cfg, s.verdict, s.path[s.path.length - 1]);
  const said = verdictMessage(s.verdict, playerCount === 1 ? null : playerName(s.player, playerCount), close, step.current);
  const tone: Tone = sliding ? 'info' : said.tone;
  return {
    positions: sliding ? s.before : s.after,
    focus: s.player,
    round: s.round,
    movingStone: sliding ? s.path[frame] : null,
    message: sliding ? `${playerName(s.player, playerCount)} · kick ${step.current + 1} of ${steps.length}` : said.message,
    tone,
    index: step.current,
    count: steps.length,
    paused,
    speed,
    togglePause: () => setPaused((p) => !p),
    toggleSpeed: () => setSpeed((v) => (v === 1 ? 2 : 1)),
    skip,
    restart,
  };
}

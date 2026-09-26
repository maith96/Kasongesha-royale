// Online match model. Pure (no Firebase) so it can be unit-tested.
//
// A match document stores only the setup, the players and the kick inputs.
// Every phone rebuilds the match by re-simulating the kicks: the physics is
// deterministic, so everyone sees exactly the same game.

import { applyKick, currentPlayer, MatchSettings, MatchState, newMatch } from '../game/match';
import { Kick, quantizeKick, simulateKick } from '../game/sim';
import { STAGES } from '../game/stages';
import { friction, SURFACES } from '../game/surfaces';

export type OnlineConfig = { stage: number; surface: number; wet: boolean; kicksPerTurn: number };
export type OnlinePlayer = { uid: string; name: string };
export type MatchStatus = 'waiting' | 'playing' | 'over';

export type MatchDoc = {
  code: string;
  hostUid: string;
  config: OnlineConfig;
  maxPlayers: number;
  players: OnlinePlayer[]; // join order = turn order
  status: MatchStatus;
  kicks: Kick[];
  turnUid: string | null; // whose turn it is (so security rules can enforce it)
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const MAX_NAME = 16;

// No 0/O or 1/I/L so codes are easy to read out and type.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function newCode(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return s;
}

export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME).trim();
}

export function boardFor(config: OnlineConfig) {
  const stage = STAGES[config.stage];
  const settings: MatchSettings = { kicksPerTurn: config.kicksPerTurn, par: stage.par };
  return { cfg: stage.cfg, par: stage.par, friction: friction(SURFACES[config.surface], config.wet), settings };
}

// Replay every kick in the document to get the current match state.
export function rebuild(doc: Pick<MatchDoc, 'config' | 'players' | 'kicks'>): MatchState {
  const { cfg, friction: fr, settings } = boardFor(doc.config);
  let m = newMatch(cfg, doc.players.length, 0);
  for (const k of doc.kicks) {
    const p = m.players[currentPlayer(m)];
    const r = simulateKick(cfg, fr, { x: p.x, y: p.y }, k);
    m = applyKick(m, cfg, settings, k, r.verdict, r.end).match;
  }
  return m;
}

// The fields to write when the current player kicks.
export function afterKick(doc: MatchDoc, kick: Kick): Pick<MatchDoc, 'kicks' | 'turnUid' | 'status'> {
  const kicks = [...doc.kicks, quantizeKick(kick)];
  const m = rebuild({ ...doc, kicks });
  return m.over
    ? { kicks, turnUid: null, status: 'over' }
    : { kicks, turnUid: doc.players[currentPlayer(m)].uid, status: 'playing' };
}

// Talking to Firestore for online matches. Rules in firestore.rules decide
// what each call may do; the model (model.ts) decides what to write.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, Unsubscribe } from 'firebase/firestore';

import type { Kick } from '../game/sim';
import { auth, db } from './firebase';
import { afterKick, cleanName, MatchDoc, newCode, normaliseCode, OnlineConfig } from './model';

export class OnlineError extends Error {
  constructor(public reason: 'not-found' | 'full' | 'started' | 'not-your-turn' | 'network') {
    super(reason);
  }
}

// Sign in anonymously once; Firebase keeps the identity on the device.
export function signIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (u) => {
      if (u) {
        stop();
        resolve(u);
      }
    });
    if (!auth.currentUser) signInAnonymously(auth).catch((e) => {
      stop();
      reject(e);
    });
  });
}

const NAME_KEY = 'kasongesha.name.v1';
export async function loadName(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(NAME_KEY)) ?? '';
  } catch {
    return '';
  }
}
export async function saveName(name: string) {
  try {
    await AsyncStorage.setItem(NAME_KEY, name);
  } catch {
    // ignore
  }
}

const matchRef = (code: string) => doc(db, 'matches', code);

export async function createMatch(name: string, config: OnlineConfig, maxPlayers: number): Promise<string> {
  const user = await signIn();
  // Codes are random; retry on the (rare) clash with an existing match.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const ref = matchRef(code);
    if ((await getDoc(ref)).exists()) continue;
    await setDoc(ref, {
      code,
      hostUid: user.uid,
      config,
      maxPlayers,
      players: [{ uid: user.uid, name: cleanName(name) }],
      status: 'waiting',
      kicks: [],
      turnUid: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return code;
  }
  throw new OnlineError('network');
}

export async function joinMatch(rawCode: string, name: string): Promise<string> {
  const user = await signIn();
  const code = normaliseCode(rawCode);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(code));
    if (!snap.exists()) throw new OnlineError('not-found');
    const m = snap.data() as MatchDoc;
    if (m.players.some((p) => p.uid === user.uid)) return; // already in (e.g. rejoining)
    if (m.status !== 'waiting') throw new OnlineError('started');
    if (m.players.length >= m.maxPlayers) throw new OnlineError('full');
    tx.update(matchRef(code), {
      players: [...m.players, { uid: user.uid, name: cleanName(name) }],
      updatedAt: serverTimestamp(),
    });
  });
  return code;
}

export async function startMatch(code: string) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(code));
    const m = snap.data() as MatchDoc;
    if (m.status !== 'waiting') return;
    tx.update(matchRef(code), { status: 'playing', turnUid: m.players[0].uid, updatedAt: serverTimestamp() });
  });
}

// Add my kick. `expectedKicks` guards against acting on a stale view.
export async function submitKick(code: string, expectedKicks: number, kick: Kick) {
  const uid = auth.currentUser?.uid;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(code));
    const m = snap.data() as MatchDoc;
    if (m.status !== 'playing' || m.turnUid !== uid || m.kicks.length !== expectedKicks) {
      throw new OnlineError('not-your-turn');
    }
    tx.update(matchRef(code), { ...afterKick(m, kick), updatedAt: serverTimestamp() });
  });
}

export function watchMatch(code: string, onChange: (m: MatchDoc | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    matchRef(code),
    (snap) => onChange(snap.exists() ? (snap.data() as MatchDoc) : null),
    (e) => onError?.(e),
  );
}

export function myUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

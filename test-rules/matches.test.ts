/// <reference types="node" />
// Firestore security rules tests. Run against the emulator: npm run test:rules
import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-kasongesha',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});
after(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const CODE = 'ABC234';
const as = (uid: string) => env.authenticatedContext(uid).firestore();
const ref = (uid: string, code = CODE) => doc(as(uid), 'matches', code);
const config = { stage: 0, surface: 0, wet: false, kicksPerTurn: 1 };

function newMatch(uid: string, over: Record<string, unknown> = {}) {
  return {
    code: CODE,
    hostUid: uid,
    config,
    maxPlayers: 2,
    players: [{ uid, name: 'Amani' }],
    status: 'waiting',
    kicks: [],
    turnUid: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  };
}

const join = (uid: string, players: object[]) => updateDoc(ref(uid), { players, updatedAt: serverTimestamp() });
const AMANI = { uid: 'a', name: 'Amani' };
const BARAKA = { uid: 'b', name: 'Baraka' };
const kick = { angle: 1.5, power: 0.3 };

// Seed a match that's already playing (bypassing rules).
async function seedPlaying(over: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'matches', CODE), {
      ...newMatch('a'),
      players: [AMANI, BARAKA],
      status: 'playing',
      turnUid: 'a',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    });
  });
}

// --- create ---

test('host can create a match', async () => {
  await assertSucceeds(setDoc(ref('a'), newMatch('a')));
});

test('must be signed in', async () => {
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'matches', CODE), newMatch('a')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'matches', CODE)));
});

test("can't create a match for someone else or with a bad setup", async () => {
  await assertFails(setDoc(ref('a'), newMatch('b')));
  await assertFails(setDoc(ref('a'), newMatch('a', { status: 'playing' })));
  await assertFails(setDoc(ref('a'), newMatch('a', { kicks: [kick] })));
  await assertFails(setDoc(ref('a'), newMatch('a', { maxPlayers: 9 })));
  await assertFails(setDoc(ref('a'), newMatch('a', { config: { ...config, kicksPerTurn: 5 } })));
  await assertFails(setDoc(ref('a'), newMatch('a', { cheat: true })));
  await assertFails(setDoc(ref('a', 'abc234'), newMatch('a', { code: 'abc234' })));
});

// --- join / start ---

test('a friend can join once; a full match refuses more', async () => {
  await setDoc(ref('a'), newMatch('a'));
  await assertSucceeds(join('b', [AMANI, BARAKA]));
  await assertFails(join('b', [AMANI, BARAKA, BARAKA])); // twice
  await assertFails(join('c', [AMANI, BARAKA, { uid: 'c', name: 'Chebet' }])); // full (max 2)
});

test("joining can't change other players or add someone else", async () => {
  await setDoc(ref('a'), newMatch('a'));
  await assertFails(join('b', [{ uid: 'a', name: 'Loser' }, BARAKA]));
  await assertFails(join('b', [AMANI, { uid: 'c', name: 'Chebet' }]));
  await assertFails(updateDoc(ref('b'), { players: [AMANI, BARAKA], status: 'playing', updatedAt: serverTimestamp() }));
});

test('only the host starts, with at least 2 players', async () => {
  await setDoc(ref('a'), newMatch('a'));
  const start = (uid: string) => updateDoc(ref(uid), { status: 'playing', turnUid: 'a', updatedAt: serverTimestamp() });
  await assertFails(start('a')); // alone
  await join('b', [AMANI, BARAKA]);
  await assertFails(start('b')); // not host
  await assertSucceeds(start('a'));
  await assertFails(join('c', [AMANI, BARAKA, { uid: 'c', name: 'Chebet' }])); // started
});

// --- kicks ---

const addKick = (uid: string, kicks: object[], turnUid: string | null, status = 'playing') =>
  updateDoc(ref(uid), { kicks, turnUid, status, updatedAt: serverTimestamp() });

test('the player whose turn it is can add one kick', async () => {
  await seedPlaying();
  await assertSucceeds(addKick('a', [kick], 'b'));
  await assertSucceeds(addKick('b', [kick, kick], 'a'));
});

test("you can't kick out of turn", async () => {
  await seedPlaying();
  await assertFails(addKick('b', [kick], 'a'));
});

test("kicks can't be rewritten, removed or added two at a time", async () => {
  await seedPlaying({ kicks: [kick], turnUid: 'b' });
  await assertFails(addKick('b', [{ angle: 0, power: 0.9 }, kick], 'a')); // edits history
  await assertFails(addKick('b', [], 'a'));
  await assertFails(addKick('b', [kick, kick, kick], 'a'));
});

test('kicks must look like kicks', async () => {
  await seedPlaying();
  await assertFails(addKick('a', [{ angle: 1, power: 5 }], 'b'));
  await assertFails(addKick('a', [{ angle: 1, power: 0.3, x: 0 }], 'b'));
  await assertFails(addKick('a', [{ angle: 'left', power: 0.3 }], 'b'));
});

test('turn can only pass to a player, or end the match', async () => {
  await seedPlaying();
  await assertFails(addKick('a', [kick], 'zzz'));
  await assertFails(addKick('a', [kick], null)); // null only when over
  await assertSucceeds(addKick('a', [kick], null, 'over'));
  await assertFails(addKick('a', [kick, kick], 'b')); // over: no more kicks
});

test("a kick can't change the players or setup", async () => {
  await seedPlaying();
  await assertFails(updateDoc(ref('a'), { kicks: [kick], turnUid: 'b', players: [AMANI], updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref('a'), { kicks: [kick], turnUid: 'b', config: { ...config, wet: true }, updatedAt: serverTimestamp() }));
});

test('anyone signed in can read a match; nobody can delete', async () => {
  await seedPlaying();
  await assertSucceeds(getDoc(ref('z')));
  await assertFails(deleteDoc(ref('a')));
});

test('other collections are closed', async () => {
  await assertFails(setDoc(doc(as('a'), 'users', 'a'), { x: 1 }));
  await assertFails(getDoc(doc(as('a'), 'users', 'a')));
});

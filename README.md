# Kasongesha Royale

A mobile game based on **Kasongesha**, the Kenyan spiral hopscotch: hop on one
leg and push your stone along a chalk spiral to the centre.

## Rules

- Push your stone along the spiral track towards the centre.
- The stone must never **stop** on a line (the spiral or the divider).
- A kick may slide over **at most one spiral line** – jumping to the next ring
  is a shortcut; crossing two or more is "Umeruka sana!" and back to start.
  (The divider doesn't count.)
- Hopping on one leg is the **balance meter**: release your swipe near the
  middle for an accurate push. In the red zone your foot touches down.
  (Currently switched off via `BALANCE_ENABLED` in `src/game/useGame.ts`.)
- Any mistake sends your stone back to the start. First to the centre wins.

## Campaign

12 levels that introduce each shape, surface and the rain, plus 3 bonus
levels unlocked by total stars. Finish a level to open the next; your best
stars are saved on the phone. Free play (any board, 1–4 players) is on the
home screen next to it.

## Replays

Every kick's aim and power is recorded. Because the physics is
deterministic, **Watch replay** on the results screen re-runs the match
exactly, with pause, 1×/2× speed and skip.

## Matches

- Players take turns on the same board and watch each other kick.
- **Kicks per turn** (1–3) is set in the menu; a fail ends your turn early.
- **First to HOME wins.** Once someone is home the round is played out so
  everyone has had the same number of turns; if several get home, fewest
  kicks wins, then fewest fails.
- **Points:** win +50, reach HOME +20, +5 per kick under par, +10 per
  shortcut, +5 per clean streak of 3 kicks.
- **Solo:** score kicks against the stage's par for 1–3 stars.
- Rematch rotates who goes first.

## Stages

1. **Circle** – the classic round spiral.
2. **Square** – a square spiral with sharp corners.
3. **Triangle** – a triangular spiral; wide corners, fewer rings.

Pick a stage in the menu; after a win, **Next stage** moves on.

## Surfaces

Pick the ground in the menu; it changes how far the stone slides:

| Surface | Slide (vs dirt) |
|---|---|
| Sand | shortest, stops fast |
| Dirt | baseline |
| Cement | further |
| Tile | furthest, very slippery |

Switch on **Rainy** to make any surface wet: everything slides ~1.7× further.

## Playing

```bash
npm install
npx expo start      # scan the QR code with Expo Go
npm test            # rule/geometry tests
npm run typecheck
```

Controls are pool-style: tap or drag on the board to aim (the dashed line
shows direction only), then pull the power bar down and let go to kick. How
far the stone slides is up to your judgement. 1–4 players, pass-and-play on one phone.

## Online play (Firebase)

**Play online** → host a match (board, surface, weather, kicks per turn,
2–4 players) and share the 6-letter code, or join with a friend's code. The
host starts when everyone's in; players take turns and watch each other's
kicks live.

- Only the kick inputs (aim + power) are stored, in `/matches/{code}`. Every
  phone re-simulates them with the deterministic physics, so all players see
  the same game.
- Players sign in anonymously (kept on the device).
- `firestore.rules` allow: create your own match, join once while waiting,
  host starts, and only the current player appends exactly one valid kick.
  History can't be edited and nothing can be deleted. Tests: `npm run test:rules`.
- **Deploy the rules** after changing them (needs `firebase login` once):
  `npm run deploy:rules`
- Local testing without touching the live project: `npm run emulators`, then
  `EXPO_PUBLIC_FIREBASE_EMULATOR=127.0.0.1 npx expo start`.

Known gap: the rules can't run the physics, so a modified app could claim
the wrong next turn. Server-side replay verification is planned (roadmap 5.10).

## Languages

All player-facing text lives in `src/i18n/` – nothing is hard-coded in the
screens (a test fails if words are written straight into JSX).

- `en.ts` – English (default), which also defines the shape of every language.
- `sw.ts` – Kiswahili, with Kenyan Sheng in the commentary.
- On first launch the phone's language is used if supported, else English;
  players can switch on the Home screen and the choice is remembered.

To add a language, copy `en.ts` to e.g. `fr.ts`, type it as `Strings`
(TypeScript will list any missing keys), translate, and register it in
`src/i18n/index.ts`.

## Sound and art

- Sound effects are synthesised by `scripts/make_sounds.py` into `assets/sounds/`
  (kick, slide, splash, good, close call, fail, win). Mute with 🔊 in the game.
- The app icon, Android adaptive icon, splash and favicon are drawn in
  `scripts/icon.html` and rendered to PNG with a headless browser
  (`?v=icon`, `?v=adaptive`, `?v=splash`).

## Code

- `src/game/spiral.ts` – spiral geometry for any shape (circle or polygon): which ring/half a point is in, distance to lines.
- `src/game/stages.ts` – the stage list (shape, rings, rotation).
- `src/game/surfaces.ts` – surfaces (friction and look) and the wet modifier.
- `src/game/sim.ts` – deterministic, fixed-timestep kick simulation (same result on every phone).
- `src/game/match.ts` – match engine: turns, equal turns, winner, points, stars.
- `src/game/replay.ts`, `useReplay.ts` – rebuild a match from its kick log and play it back.
- `src/game/campaign.ts`, `progressStore.ts` – levels, unlocking, stars; saved with AsyncStorage.
- `src/screens/` – Home, Campaign, Free play, Online and the game screen; `App.tsx` routes between them.
- `src/online/` – Firebase setup, match API, the online match model and `useOnlineGame`.
- `src/audio/sounds.ts` – plays the sound effects (expo-audio), with mute.
- `src/game/rules.ts` – judging a push (line touch, out, shortcut, win).
- `src/game/useGame.ts` – ties the match to the screen: animates kicks, messages, pauses.
- `src/components/` – the board (SVG), power bar, results screen and balance meter.

## Building

EAS builds Android and iOS in the cloud (no Mac needed):

```bash
npx eas-cli@latest build -p android --profile preview   # installable APK
npx eas-cli@latest build -p ios
```

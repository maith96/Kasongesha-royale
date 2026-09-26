# Kasongesha Royale

A mobile game based on **Kasongesha**, the Kenyan spiral hopscotch: hop on one
leg and push your stone along a chalk spiral to the centre.

## Rules

- Push your stone along the spiral track towards the centre.
- The stone may slide over lines, but must never **stop** on one (the spiral
  or the divider). Pushing over lines towards the centre is a shortcut.
- Hopping on one leg is the **balance meter**: release your swipe near the
  middle for an accurate push. In the red zone your foot touches down.
  (Currently switched off via `BALANCE_ENABLED` in `src/game/useGame.ts`.)
- Any mistake sends your stone back to the start. First to the centre wins.

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

## Code

- `src/game/spiral.ts` – spiral geometry for any shape (circle or polygon): which ring/half a point is in, distance to lines.
- `src/game/stages.ts` – the stage list (shape, rings, rotation).
- `src/game/surfaces.ts` – surfaces (friction and look) and the wet modifier.
- `src/game/sim.ts` – deterministic, fixed-timestep kick simulation (same result on every phone).
- `src/game/match.ts` – match engine: turns, equal turns, winner, points, stars.
- `src/game/rules.ts` – judging a push (line touch, out, shortcut, win).
- `src/game/useGame.ts` – ties the match to the screen: animates kicks, messages, pauses.
- `src/components/` – the board (SVG), power bar, results screen and balance meter.

## Building

EAS builds Android and iOS in the cloud (no Mac needed):

```bash
npx eas-cli@latest build -p android --profile preview   # installable APK
npx eas-cli@latest build -p ios
```

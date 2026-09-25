# Kasongesha Royale

A mobile game based on **Kasongesha**, the Kenyan spiral hopscotch: hop on one
leg and push your stone along a chalk spiral to the centre.

## Rules

- Push your stone along the spiral track towards the centre.
- The stone must never stop on a line (the spiral or the divider).
- **Shortcut:** from one half of the spiral you can push the stone across the
  middle to the other half, as long as it lands on the **same ring** (outermost
  to outermost, second to second, …) and not on the divider.
- Hopping on one leg is the **balance meter**: release your swipe near the
  middle for an accurate push. In the red zone your foot touches down.
- Any mistake sends your stone back to the start. First to the centre wins.

## Playing

```bash
npm install
npx expo start      # scan the QR code with Expo Go
npm test            # rule/geometry tests
npm run typecheck
```

Swipe in the direction you want to push; the dashed line shows how far the
stone will slide (before wobble). 1–4 players, pass-and-play on one phone.

## Code

- `src/game/spiral.ts` – spiral geometry: which ring/half a point is in, distance to lines.
- `src/game/rules.ts` – judging a push (line touch, out, shortcut, win).
- `src/game/useGame.ts` – game loop, sliding physics, balance wobble, turns.
- `src/components/` – the board (SVG) and balance meter.

## Building

EAS builds Android and iOS in the cloud (no Mac needed):

```bash
npx eas-cli@latest build -p android --profile preview   # installable APK
npx eas-cli@latest build -p ios
```

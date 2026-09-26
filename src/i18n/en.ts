// English strings. This file defines the shape every language must follow:
// other languages are typed as `Strings`, so a missing key fails typecheck.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const en = {
  languageName: 'English',

  home: {
    rules: [
      '🎯  Touch the board to aim',
      '👟  Pull the power bar down, let go to kick',
      '🪨  Never stop on a line; slide over one at most',
      '🏁  First home wins. Mistake = back to start!',
    ],
    campaign: 'Campaign',
    freePlay: 'Free play',
    freePlaySub: 'Any board · 1–4 players',
  },

  common: {
    back: '‹ Back',
    menu: '‹ Menu',
    you: 'You',
    player: (n: number) => `Player ${n}`,
    playerShort: (n: number) => `P${n}`,
    kicks: (n: number) => plural(n, 'kick', 'kicks'),
    fails: (n: number) => plural(n, 'fail', 'fails'),
    par: (n: number) => `Par ${n}`,
    round: (n: number) => `Round ${n}`,
  },

  freePlay: {
    title: 'Free play',
    intro: 'Pick any board and play alone or pass the phone around.',
    rainy: '🌧  Rainy',
    dry: '☀️  Dry',
    kicksPerTurn: 'Kicks / turn',
    practice: 'Practice',
    players: (n: number) => `${n} players`,
  },

  campaign: {
    title: 'Campaign',
    level: (id: string) => `Level ${id}`,
    bonus: (n: string) => `Bonus ${n}`,
    par: (n: number) => `par ${n}`,
    finishPrevious: 'Finish previous',
  },

  stages: { Circle: 'Circle', Square: 'Square', Triangle: 'Triangle' },
  surfaces: { Dirt: 'Dirt', Sand: 'Sand', Cement: 'Cement', Tile: 'Tile' },
  stageTitle: (n: number, name: string) => `Stage ${n} · ${name}`,
  wet: 'Wet',

  levels: {
    '1': 'School yard',
    '2': 'Diani beach',
    '3': 'Estate parking',
    '4': 'Market square',
    '5': 'Church compound',
    '6': 'Hotel lobby',
    '7': 'Village path',
    '8': 'Lake shore',
    '9': 'Mall floor',
    '10': 'Rainy school yard',
    '11': 'Wet car park',
    '12': 'Flooded lobby',
    B1: 'Monsoon beach',
    B2: 'Slippery mall',
    B3: 'Storm yard',
  },

  board: { home: 'HOME', start: 'START ↓', power: 'POWER', balance: 'Balance (one leg)' },

  turn: {
    solo: (kick: number) => `Kick ${kick}`,
    player: (name: string) => `${name}'s turn`,
    kickOf: (k: number, n: number) => ` · kick ${k} of ${n}`,
    replayKick: (name: string, k: number, n: number) => `${name} · kick ${k} of ${n}`,
  },

  // Several lines per event, picked by kick number so replays match.
  verdict: {
    good: ['Nice!', 'Clean!', 'Great kick!', 'Well done!', 'Smooth!'],
    shortcut: ['Great shortcut! 🔥', 'What a jump! 🔥', 'Kasongesha! 🔥'],
    close: ['Close one! 😅', 'Phew, just made it! 😅', 'That was tight! 😅'],
    line: ['You touched the line!', 'Oops, on the line!', 'Caught by the line!'],
    outside: ['Out of the spiral!', 'Way out!'],
    tooFar: ['Too far! Only one line per kick.'],
    footDown: ['Foot down! You lost balance.'],
    backToStart: 'Back to start.',
    win: (name: string | null) => (name ? `${name} made it home! 🏆` : 'You made it home! 🏆'),
  },

  results: {
    soloTitle: 'Home! 🏆',
    wins: (name: string) => `${name} wins! 🏆`,
    draw: (names: string) => `Draw! ${names}`,
    ofTheWay: (pct: number) => `${pct}% of the way`,
    win: 'Win',
    home: 'Home',
    underPar: (n: number) => `${n} under par`,
    shortcuts: (n: number) => plural(n, 'shortcut', 'shortcuts'),
    streaks: (n: number) => plural(n, 'clean streak', 'clean streaks'),
    nextLevel: 'Next level ▶',
    nextStage: 'Next stage ▶',
    retry: 'Retry ↻',
    rematch: 'Rematch ↻',
    watchReplay: 'Watch replay',
    menu: 'Menu',
  },

  online: {
    title: 'Play online',
    sub: 'With friends · invite code',
    yourName: 'Your name',
    namePlaceholder: 'e.g. Amani',
    host: 'Host a match',
    players: (n: number) => `${n} players`,
    create: 'Create match',
    joinTitle: 'Join a friend',
    codePlaceholder: 'CODE',
    join: 'Join',
    connecting: 'Connecting…',
    codeLabel: 'Match code',
    share: 'Share code',
    shareMessage: (code: string) => `Play Kasongesha Royale with me! Join with code ${code}`,
    seats: (n: number, max: number) => `Players ${n}/${max}`,
    hostBadge: 'host',
    you: 'you',
    start: 'Start match',
    waitingForFriend: 'Waiting for a friend to join…',
    waitingForHost: 'Waiting for the host to start…',
    yourTurn: 'Your turn',
    waitingFor: (name: string) => `Waiting for ${name}…`,
    leave: '‹ Leave',
    errors: {
      name: 'Enter your name first.',
      code: 'Enter the 6-letter code.',
      'not-found': 'No match with that code.',
      full: 'That match is full.',
      started: 'That match has already started.',
      'not-your-turn': 'Out of sync, updating…',
      network: "Couldn't connect. Check your internet and try again.",
    },
  },

  replay: {
    label: (i: number, n: number) => `▶ Replay · ${i}/${n}`,
    close: 'Close replay',
  },
};

export type Strings = typeof en;

import type { Strings } from './en';

// Kiswahili, with a bit of Kenyan Sheng in the commentary.

const count = (n: number, one: string, many: string) => (n === 1 ? `${one} 1` : `${many} ${n}`);

export const sw: Strings = {
  languageName: 'Kiswahili',

  home: {
    rules: [
      '🎯  Gusa uwanja kulenga',
      '👟  Vuta NGUVU chini, achilia upige teke',
      '🪨  Usisimame kwenye mstari; ruka mstari mmoja tu',
      '🏁  Wa kwanza nyumbani ashinda. Kosa = rudi mwanzo!',
    ],
    campaign: 'Safari',
    freePlay: 'Cheza huru',
    freePlaySub: 'Uwanja wowote · wachezaji 1–4',
  },

  common: {
    back: '‹ Rudi',
    menu: '‹ Menyu',
    you: 'Wewe',
    player: (n) => `Mchezaji ${n}`,
    playerShort: (n) => `M${n}`,
    kicks: (n) => count(n, 'teke', 'mateke'),
    fails: (n) => count(n, 'kosa', 'makosa'),
    par: (n) => `Par ${n}`,
    round: (n) => `Raundi ${n}`,
  },

  freePlay: {
    title: 'Cheza huru',
    intro: 'Chagua uwanja wowote, cheza peke yako au pasiana simu.',
    rainy: '🌧  Mvua',
    dry: '☀️  Jua',
    kicksPerTurn: 'Mateke / zamu',
    practice: 'Mazoezi',
    players: (n) => `Wachezaji ${n}`,
  },

  campaign: {
    title: 'Safari',
    level: (id) => `Kiwango ${id}`,
    bonus: (n) => `Ziada ${n}`,
    par: (n) => `par ${n}`,
    finishPrevious: 'Maliza kilichotangulia',
  },

  stages: { Circle: 'Duara', Square: 'Mraba', Triangle: 'Pembetatu' },
  surfaces: { Dirt: 'Udongo', Sand: 'Mchanga', Cement: 'Saruji', Tile: 'Vigae' },
  stageTitle: (n, name) => `Hatua ${n} · ${name}`,
  wet: 'Maji',

  levels: {
    '1': 'Uwanja wa shule',
    '2': 'Ufuo wa Diani',
    '3': 'Maegesho ya estate',
    '4': 'Uwanja wa soko',
    '5': 'Kiwanja cha kanisa',
    '6': 'Ukumbi wa hoteli',
    '7': 'Njia ya kijijini',
    '8': 'Ufuo wa ziwa',
    '9': 'Sakafu ya mall',
    '10': 'Shule wakati wa mvua',
    '11': 'Maegesho yenye maji',
    '12': 'Ukumbi uliofurika',
    B1: 'Ufuo wa masika',
    B2: 'Mall inayoteleza',
    B3: 'Uwanja wa dhoruba',
  },

  board: { home: 'NYUMBANI', start: 'ANZA ↓', power: 'NGUVU', balance: 'Salio (mguu moja)' },

  turn: {
    solo: (kick) => `Teke ${kick}`,
    player: (name) => `Zamu ya ${name}`,
    kickOf: (k, n) => ` · teke ${k} kati ya ${n}`,
    replayKick: (name, k, n) => `${name} · teke ${k} kati ya ${n}`,
  },

  verdict: {
    good: ['Poa!', 'Safi!', 'Fiti sana!', 'Uko sawa!', 'Freshi!'],
    shortcut: ['Shortcut safi! 🔥', 'Umeruka poa! 🔥', 'Kasongesha! 🔥'],
    close: ['Karibu uguze! 😅', 'Aii, karibu! 😅', 'Ulikuwa karibu! 😅'],
    line: ['Umeguza line!', 'Aii, umeguza!', 'Line imekushika!'],
    outside: ['Umetoka nje!', 'Nje kabisa!'],
    tooFar: ['Umeruka sana! Mstari mmoja tu kwa teke.'],
    footDown: ['Mguu chini! Umepoteza salio.'],
    backToStart: 'Rudi mwanzo.',
    win: (name) => (name ? `${name} amefika! 🏆` : 'Umefika! 🏆'),
  },

  results: {
    soloTitle: 'Umefika! 🏆',
    wins: (name) => `${name} ameshinda! 🏆`,
    draw: (names) => `Sare! ${names}`,
    ofTheWay: (pct) => `${pct}% ya njia`,
    win: 'Ushindi',
    home: 'Nyumbani',
    underPar: (n) => `${n} chini ya par`,
    shortcuts: (n) => count(n, 'njia fupi', 'njia fupi'),
    streaks: (n) => count(n, 'mfululizo safi', 'mfululizo safi'),
    nextLevel: 'Kiwango kijacho ▶',
    nextStage: 'Hatua ijayo ▶',
    retry: 'Jaribu tena ↻',
    rematch: 'Rudia mechi ↻',
    watchReplay: 'Tazama marudio',
    menu: 'Menyu',
  },

  online: {
    title: 'Cheza mtandaoni',
    sub: 'Na marafiki · kodi ya mwaliko',
    yourName: 'Jina lako',
    namePlaceholder: 'mf. Amani',
    host: 'Anzisha mechi',
    players: (n) => `Wachezaji ${n}`,
    create: 'Unda mechi',
    joinTitle: 'Jiunge na rafiki',
    codePlaceholder: 'KODI',
    join: 'Jiunge',
    connecting: 'Inaunganisha…',
    codeLabel: 'Kodi ya mechi',
    share: 'Shiriki kodi',
    shareMessage: (code) => `Cheza Kasongesha Royale nami! Jiunge kwa kodi ${code}`,
    seats: (n, max) => `Wachezaji ${n}/${max}`,
    hostBadge: 'mwenyeji',
    you: 'wewe',
    start: 'Anza mechi',
    waitingForFriend: 'Tunasubiri rafiki ajiunge…',
    waitingForHost: 'Tunasubiri mwenyeji aanze…',
    yourTurn: 'Zamu yako',
    waitingFor: (name) => `Tunamsubiri ${name}…`,
    leave: '‹ Ondoka',
    errors: {
      name: 'Andika jina lako kwanza.',
      code: 'Andika kodi ya herufi 6.',
      'not-found': 'Hakuna mechi yenye kodi hiyo.',
      full: 'Mechi hiyo imejaa.',
      started: 'Mechi hiyo imeshaanza.',
      'not-your-turn': 'Haiko sawa, inasasisha…',
      network: 'Imeshindwa kuunganisha. Angalia intaneti ujaribu tena.',
    },
  },

  replay: {
    label: (i, n) => `▶ Marudio · ${i}/${n}`,
    close: 'Funga marudio',
  },
};

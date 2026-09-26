import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// Short effects synthesised by scripts/make_sounds.py.
const SOURCES = {
  kick: require('../../assets/sounds/kick.wav'),
  slide: require('../../assets/sounds/slide.wav'),
  splash: require('../../assets/sounds/splash.wav'),
  good: require('../../assets/sounds/good.wav'),
  close: require('../../assets/sounds/close.wav'),
  fail: require('../../assets/sounds/fail.wav'),
  win: require('../../assets/sounds/win.wav'),
};

export type SoundName = keyof typeof SOURCES;

// Players live for the whole app, so they're created once and never released.
const players: Partial<Record<SoundName, AudioPlayer>> = {};
let muted = false;
let modeSet = false;

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

// Sound is a nice-to-have: never let it break the game.
export function playSound(name: SoundName, volume = 1) {
  if (muted) return;
  try {
    if (!modeSet) {
      modeSet = true;
      // Game effects: play even with the ring switch off, alongside the user's music.
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      players[name] = p;
    }
    p.volume = volume;
    p.seekTo(0);
    p.play();
  } catch {
    // ignore
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_PROGRESS, Progress } from './campaign';

const KEY = 'kasongesha.progress.v1';

// Storage can fail (private mode on web, full disk); the game still works,
// progress just isn't kept.
export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.stars === 'object' ? { stars: parsed.stars } : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

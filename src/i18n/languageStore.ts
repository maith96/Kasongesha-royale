import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { Lang, LANGUAGES, matchLanguage } from './index';

const KEY = 'kasongesha.language.v1';

// The saved choice, else the phone's language if we have it, else English.
export async function loadLanguage(): Promise<Lang> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved && saved in LANGUAGES) return saved as Lang;
  } catch {
    // fall through to the device language
  }
  try {
    return matchLanguage(getLocales()[0]?.languageCode);
  } catch {
    return 'en';
  }
}

export async function saveLanguage(lang: Lang): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, lang);
  } catch {
    // ignore
  }
}

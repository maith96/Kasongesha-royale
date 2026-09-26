// Tiny i18n: a current language, the strings for it, and change listeners.
// No React here so game logic (and tests) can use it too; see useStrings.ts.

import { en, Strings } from './en';
import { sw } from './sw';

export const LANGUAGES = { en, sw } satisfies Record<string, Strings>;
export type Lang = keyof typeof LANGUAGES;
export const LANGUAGE_CODES = Object.keys(LANGUAGES) as Lang[];

let current: Lang = 'en';
const listeners = new Set<() => void>();

export function getLanguage(): Lang {
  return current;
}

export function setLanguage(lang: Lang) {
  if (lang === current) return;
  current = lang;
  listeners.forEach((f) => f());
}

export function subscribe(f: () => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

export function strings(): Strings {
  return LANGUAGES[current];
}

// Best supported language for a device language code like "sw" or "en".
export function matchLanguage(code: string | null | undefined): Lang {
  return code && code in LANGUAGES ? (code as Lang) : 'en';
}

// Look up a name that may be missing in a table (e.g. unknown level id).
export function nameOf(table: Record<string, string>, key: string): string {
  return table[key] ?? key;
}

export type { Strings };

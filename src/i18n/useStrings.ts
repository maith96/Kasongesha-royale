import { useSyncExternalStore } from 'react';

import { getLanguage, strings, subscribe } from './index';

// Re-renders the component when the language changes.
export function useStrings() {
  useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return strings();
}

// iOS / Android: keep the (anonymous) sign-in across app restarts, so a
// player keeps the same identity in their matches.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// Only in the React Native build of Firebase Auth (which Metro picks); the
// published typings list the generic build first, so TypeScript can't see it.
// @ts-expect-error -- see above
import { getReactNativePersistence } from '@firebase/auth';

export function initAuth(app: FirebaseApp) {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app); // already initialised (e.g. after a fast refresh)
  }
}

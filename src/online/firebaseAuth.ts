// Web: Firebase's default browser persistence.
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export function initAuth(app: FirebaseApp) {
  return getAuth(app);
}

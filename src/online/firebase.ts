import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { initAuth } from './firebaseAuth';

// Web app config for the "kasongesha" Firebase project. These values are
// public by design; access is controlled by firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyBodSRUI9a7OiYiv-t6d3OTpFMdXxmFBwc',
  authDomain: 'kasongesha.firebaseapp.com',
  projectId: 'kasongesha',
  storageBucket: 'kasongesha.firebasestorage.app',
  messagingSenderId: '433471721306',
  appId: '1:433471721306:web:c4b5d8b2eea3cffd0d2d63',
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = initAuth(app);
export const db = getFirestore(app);

// For local testing against the Firebase emulators (never in a store build):
// EXPO_PUBLIC_FIREBASE_EMULATOR=127.0.0.1 npx expo start
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR;
if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}

// Firebase for both the public website and the admin. The web config is public by design:
// what protects the data is firestore.rules, not this key.
import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite'

// Local testing only (npm run dev with VITE_USE_EMULATORS=1): a throwaway demo project on the emulators.
const emulated = Boolean(import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS)

// The Lordnoble Cosmetics Firebase project's web app config (Firebase console → Project settings → Your apps),
// set in .env.local. See .env.example.
const env = import.meta.env
const projectId = env.VITE_FIREBASE_PROJECT_ID || 'lordnoblecosmetics'
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId: emulated ? 'demo-lordnoble' : projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
}

export const app = initializeApp(config)
export const db = getFirestore(app)
if (emulated) connectFirestoreEmulator(db, '127.0.0.1', 8080)

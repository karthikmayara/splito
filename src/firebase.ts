// ─────────────────────────────────────────────────────────────
// firebase.ts — Initialize Firebase services
//
// This file runs ONCE when the app loads. It reads config from
// .env variables and exports db + auth so other files can import
// them directly without re-initializing.
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase config — values come from your .env file
// VITE_ prefix is required for Vite to expose them to the browser
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialize the Firebase app (only runs once)
const app = initializeApp(firebaseConfig)

// ── Firestore database ────────────────────────────────────────
// This is where all users, groups, and expenses are stored
// Free tier: 1GB storage, 50k reads/day, 20k writes/day
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

// ── Authentication ────────────────────────────────────────────
// Handles sign in / sign out / session persistence
export const auth = getAuth(app)

// Google sign-in provider — simplest way for users to log in
// No password management needed
export const googleProvider = new GoogleAuthProvider()
// Ask Google for the user's profile + email
googleProvider.addScope('profile')
googleProvider.addScope('email')
// Force account selection popup
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// ── Storage ───────────────────────────────────────────────────
// Used to store receipt photos
// Free tier: 5GB storage
export const storage = getStorage(app)

export default app

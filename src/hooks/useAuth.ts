// ─────────────────────────────────────────────────────────────
// useAuth.ts — Firebase Auth listener hook
//
// Firebase Auth is persistent: when the user closes and reopens
// the app, they stay logged in automatically.
//
// This hook:
// 1. Listens for auth state changes (login, logout, page reload)
// 2. Fetches or creates the user's Firestore profile
// 3. Updates global state so all components see the current user
//
// Use this hook ONCE in App.tsx. All other components just
// read currentUser from the store.
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '@/firebase'
import { useStore } from '@/store/useStore'
import type { User } from '@/types'

export function useAuth() {
  const { setCurrentUser, setAuthLoading } = useStore()

  useEffect(() => {
    // Handle redirect result from mobile login BEFORE listening for state
    getRedirectResult(auth).catch((error) => {
      console.error('Error during redirect sign in:', error)
      useStore.getState().setError(error.message || 'Error signing in with Google. Please try again.')
    })

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in — fetch or create their Firestore profile
        try {
          const userRef = doc(db, 'users', firebaseUser.uid)
          const userSnap = await getDoc(userRef)

          if (userSnap.exists()) {
            // Existing user — load their profile
            setCurrentUser({ id: firebaseUser.uid, ...userSnap.data() } as User)
          } else {
            // First time login — create their profile in Firestore
            const newUser: Omit<User, 'id'> = {
              name:      firebaseUser.displayName || 'Unknown',
              email:     firebaseUser.email || '',
              avatar:    firebaseUser.photoURL || undefined,
              createdAt: Date.now(),
            }
            await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() })
            setCurrentUser({ id: firebaseUser.uid, ...newUser })
          }
        } catch (error: any) {
          console.error('Error fetching/creating user profile:', error)
          useStore.getState().setError('Failed to load user profile. Please check your connection.')
          // Graceful fallback: set local user so they aren't completely blocked
          setCurrentUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Unknown',
            email: firebaseUser.email || '',
            createdAt: Date.now(),
          })
        }
      } else {
        // User is logged out
        setCurrentUser(null)
      }

      // Auth check complete — hide loading screen
      setAuthLoading(false)
    })

    // Cleanup: stop listening when the component unmounts
    return () => unsubscribe()
  }, [setCurrentUser, setAuthLoading])
}

// ── Sign in with Google ───────────────────────────────────────
// Opens a Google sign-in popup
// Returns the user or throws an error
export async function signInWithGoogle(): Promise<void> {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const useRedirect = isMobile && window.location.protocol === 'https:'

  try {
    if (useRedirect) {
      await signInWithRedirect(auth, googleProvider)
    } else {
      await signInWithPopup(auth, googleProvider)
    }
    // onAuthStateChanged will handle updating the store
  } catch (error: any) {
    // User closed the popup — not a real error
    if (error.code === 'auth/popup-closed-by-user') return
    
    // Explicitly throw other errors so Login.tsx can catch them
    throw error
  }
}

// ── Sign in / up with Email ──────────────────────────────────
export async function signUpWithEmail(name: string, email: string, pass: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email, pass)
  
  // Set the display name on the Firebase user
  await updateProfile(user, { displayName: name })
  
  // We explicitly overwrite the firestore profile because it might have 
  // been created prematurely by onAuthStateChanged with name="Unknown"
  const userRef = doc(db, 'users', user.uid)
  await setDoc(userRef, { name }, { merge: true })
  
  // Update local state directly so UI picks it up immediately
  const store = useStore.getState()
  if (store.currentUser) {
    store.setCurrentUser({ ...store.currentUser, name })
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, pass)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

// ── Sign out ──────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
  // onAuthStateChanged will set currentUser to null automatically
}

// ── Delete Account ────────────────────────────────────────────
// Fulfills DPDP Act 2023 compliance.
export async function deleteAccount(): Promise<void> {
  if (!auth.currentUser) return
  const uid = auth.currentUser.uid
  
  // 1. Delete Firestore user document FIRST.
  // Once the Auth account is deleted, security rules will block this.
  await deleteDoc(doc(db, 'users', uid))
  
  // 2. Delete the actual Authentication credential.
  await deleteUser(auth.currentUser)
}

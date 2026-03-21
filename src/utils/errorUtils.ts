// ─────────────────────────────────────────────────────────────
// errorUtils.ts — Centralized error parsing
//
// Converts raw Firebase error codes into human-readable messages.
// This prevents generic "Failed to save" errors and gives users
// actionable feedback (e.g., "Check your internet connection").
// ─────────────────────────────────────────────────────────────

/**
 * Parses a standard Error or Firebase Error and returns a user-friendly string.
 */
export function parseFirebaseError(error: any): string {
  if (!error) return 'An unknown error occurred. Please try again.'
  
  // If it's a string, just return it
  if (typeof error === 'string') return error

  // Default fallback message
  let message = 'An error occurred. Please try again.'
  
  if (error.code) {
    switch (error.code) {
      // ── Auth Errors ──
      case 'auth/email-not-verified':
        message = 'Please verify your email before logging in. Check your inbox.'
        break
      case 'auth/invalid-credential':
        message = 'Invalid email or password.'
        break
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message = 'Invalid email or password.'
        break
      case 'auth/email-already-in-use':
        message = 'This email is already registered.'
        break
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters.'
        break
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.'
        break
      case 'auth/requires-recent-login':
        message = 'Security check: Please log out and log back in to verify your identity before performing this action.'
        break
      case 'auth/network-request-failed':
        message = 'Network error. Please check your internet connection.'
        break
      case 'auth/popup-blocked':
        message = 'Sign-in popup was blocked by your browser. Please allow popups for this site.'
        break
      case 'auth/popup-closed-by-user':
        message = 'Sign-in was cancelled.'
        break

      // ── Firestore / General Errors ──
      case 'permission-denied':
        message = "You don't have permission to perform this action."
        break
      case 'unavailable':
        message = 'Network error. The service is temporarily unreachable.'
        break
      case 'not-found':
        message = 'The requested resource was not found. It may have been deleted.'
        break
      default:
        // If there's an explicit message on the error object, use it as fallback
        if (error.message) message = error.message
        break
    }
  } else if (error.message) {
    message = error.message
  }

  return message
}

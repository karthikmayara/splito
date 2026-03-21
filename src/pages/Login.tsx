// ─────────────────────────────────────────────────────────────
// Login.tsx — Sign in page
//
// Shown when user is not logged in.
// Only option is Google sign-in (no password management needed).
// After login, Firebase auth listener in useAuth.ts handles
// creating the user profile and redirecting to dashboard.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { signInWithGoogle, signUpWithEmail, loginWithEmail, resetPassword } from '@/hooks/useAuth'
import { parseFirebaseError } from '@/utils/errorUtils'

export default function Login() {
  const { currentUser, authLoading } = useStore()
  const [searchParams] = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/'
  
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Email Auth State
  // Email Auth State
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // If already logged in, skip this page entirely and navigate to returnUrl
  if (!authLoading && currentUser) {
    return <Navigate to={returnUrl} replace />
  }

  async function handleGoogleSignIn() {
    setIsSigningIn(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      console.error('Auth error code:', err.code)
      console.error('Auth error message:', err.message)
      setError(parseFirebaseError(err))
      setIsSigningIn(false)
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    if (mode !== 'forgot' && !password) return
    if (mode === 'signup' && !name) {
      setError('Please enter your name.')
      return
    }

    setIsSigningIn(true)
    setError(null)
    try {
      if (mode === 'signup') {
        await signUpWithEmail(name, email, password)
      } else if (mode === 'login') {
        await loginWithEmail(email, password)
      } else if (mode === 'forgot') {
        await resetPassword(email)
        setError('Password reset email sent! Check your inbox.')
        setIsSigningIn(false)
        setMode('login')
        return
      }
      // Success—stop loading so button doesn't freeze before redirect
      setIsSigningIn(false)
    } catch (err: any) {
      console.error('Auth error code:', err.code)
      console.error('Auth error message:', err.message)
      setError(parseFirebaseError(err))
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4">

      {/* Background subtle grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Main card */}
      <div className="relative w-full max-w-sm animate-slide-up">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
            <span className="text-3xl">💸</span>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Splito</h1>
          <p className="text-slate-400 text-sm mt-1">Split expenses with roommates</p>
        </div>

        {/* Feature bullets */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6 space-y-3">
          {[
            { icon: '⚡', text: 'Pay instantly via UPI, PhonePe, GPay' },
            { icon: '🔢', text: 'Decimal-precise splits to the paisa' },
            { icon: '👥', text: 'Multiple groups, real-time sync' },
            { icon: '🔗', text: 'Invite via WhatsApp or SMS' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <span className="text-slate-300 text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Email Auth Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3 mb-6">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-colors"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-colors"
            required
          />
          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-colors"
              required
              minLength={6}
            />
          )}
          {mode === 'login' && (
            <div className="flex justify-end mt-1 mb-3">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(null) }}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSigningIn ? 'Please wait...' : (mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link')}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/50"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-800/80 rounded-full text-slate-400 text-xs">OR</span>
          </div>
        </div>

        {/* Sign in button (Google) */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={isSigningIn}
          className="
            w-full flex items-center justify-center gap-3
            bg-white hover:bg-slate-100 active:bg-slate-200
            text-slate-900 font-medium
            py-3 px-6 rounded-xl
            transition-all duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {/* Google logo SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {isSigningIn ? 'Please wait...' : 'Continue with Google'}
        </button>

        {/* Toggle Mode */}
        {mode !== 'forgot' ? (
          <div className="mt-5 text-center text-sm">
            <span className="text-slate-400">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError(null)
              }}
              className="text-green-400 hover:text-green-300 font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        ) : (
          <div className="mt-5 text-center text-sm">
            <button
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className="text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              ← Back to login
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
            <p className="text-red-400 text-sm leading-tight">{error}</p>
          </div>
        )}

        {/* Legal */}
        <p className="text-slate-500 text-xs text-center mt-6 px-4">
          By signing in, you agree to use this app responsibly.
          Your data is stored securely in Firebase.
        </p>
      </div>
    </div>
  )
}

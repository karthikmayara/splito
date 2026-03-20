// ─────────────────────────────────────────────────────────────
// JoinGroup.tsx — Handles /join/:inviteCode routes
//
// Flow:
// 1. Read invite code from URL
// 2. Look up the group in Firestore
// 3. If user is not logged in → show group info + sign-in button
// 4. If user is already a member → redirect to group
// 5. If user is logged in but not a member → add them + redirect
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { getGroupByInviteCode, joinGroup } from '@/utils/firestoreService'
import { signInWithGoogle } from '@/hooks/useAuth'
import type { Group } from '@/types'

export default function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { currentUser, authLoading } = useStore()

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch group by invite code ────────────────────────────
  useEffect(() => {
    if (!inviteCode) {
      setError('Invalid invite link')
      setLoading(false)
      return
    }

    getGroupByInviteCode(inviteCode)
      .then(fetchedGroup => {
        if (!fetchedGroup) {
          setError('This invite link is invalid or has expired')
        } else {
          setGroup(fetchedGroup)
        }
      })
      .catch(() => setError('Failed to load group. Check your connection.'))
      .finally(() => setLoading(false))
  }, [inviteCode])

  // ── Auto-join once user is authenticated ─────────────────
  useEffect(() => {
    if (authLoading || !currentUser || !group) return

    // Already a member — just navigate there
    if (group.members.includes(currentUser.id)) {
      navigate(`/group/${group.id}`, { replace: true })
      return
    }

    // New member — add them and navigate
    setJoining(true)
    joinGroup(group.id, currentUser.id)
      .then(() => navigate(`/group/${group.id}`, { replace: true }))
      .catch(err => {
        console.error(err)
        setError('Failed to join group. Please try again.')
        setJoining(false)
      })
  }, [authLoading, currentUser, group])

  // Loading state
  if (loading || authLoading || joining) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="flex gap-2 justify-center mb-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-green-500"
                style={{ animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
          <p className="text-slate-400 text-sm">
            {joining ? 'Joining group...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-white font-semibold mb-2">Invalid invite link</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-500 hover:bg-green-400 text-black font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!group) return null

  // ── Main view: show group info + sign-in prompt ───────────
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">

        {/* App logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">💸</span>
          <p className="text-slate-400 text-sm mt-2">Splito</p>
        </div>

        {/* Invite card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <p className="text-slate-400 text-sm mb-3">You've been invited to join</p>
          <h2 className="text-white text-2xl font-semibold mb-1">{group.name}</h2>
          {group.description && (
            <p className="text-slate-400 text-sm mb-3">{group.description}</p>
          )}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <span>👥</span>
              <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-sm">
              <span>💰</span>
              <span>{group.currency}</span>
            </div>
          </div>
        </div>

        {/* Sign in to join */}
        {!currentUser ? (
          <>
            <p className="text-slate-400 text-sm text-center mb-4">
              Sign in to join this group
            </p>
            <button
              onClick={async () => {
                try {
                  await signInWithGoogle()
                  // useEffect above will handle the join after auth
                } catch (err) {
                  console.error(err)
                  setError('Sign in failed. Please try again.')
                }
              }}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-3.5 px-6 rounded-xl transition-colors"
            >
              {/* Google logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google to join
            </button>
          </>
        ) : (
          // Logged in but still loading the join
          <p className="text-center text-slate-400 text-sm">Adding you to the group...</p>
        )}
      </div>
    </div>
  )
}

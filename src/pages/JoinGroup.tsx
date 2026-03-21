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
import { parseFirebaseError } from '@/utils/errorUtils'
import type { Group } from '@/types'

export default function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { currentUser, authLoading } = useStore()

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)

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
      .catch((err: any) => {
        if (err?.code === 'permission-denied') {
          setError('Permission denied. Cannot load group data.')
        } else {
          setError('Failed to load group. Check your connection.')
        }
      })
      .finally(() => setLoading(false))
  }, [inviteCode])

  const handleJoinGroup = () => {
    if (!currentUser || !group) return
    
    setJoinError(null)
    setJoining(true)
    joinGroup(group.id, currentUser.id)
      .then(() => navigate(`/group/${group.id}`, { replace: true }))
      .catch(err => {
        console.error(err)
        setJoinError(parseFirebaseError(err))
        setJoining(false)
      })
  }

  // ── Auto-join once user is authenticated ─────────────────
  useEffect(() => {
    if (authLoading || !currentUser || !group) return

    // Already a member — just navigate there
    if (group.members.includes(currentUser.id)) {
      navigate(`/group/${group.id}`, { replace: true })
      return
    }

    // New member — add them and navigate
    handleJoinGroup()
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
    <div className="min-h-[100dvh] bg-[#0f172a] flex flex-col items-center px-4 relative">
      
      {/* Header with Login/Register */}
      {!currentUser && (
        <div className="w-full max-w-5xl mx-auto py-6 flex justify-end">
          <button 
            onClick={() => navigate(`/login?returnUrl=/join/${inviteCode}`)}
            className="text-white font-bold text-sm bg-slate-800 hover:bg-slate-700 px-5 py-2.5 rounded-full transition-colors border border-slate-700"
          >
            Login / Register
          </button>
        </div>
      )}

      {/* Main Content Centered */}
      <div className="w-full max-w-sm animate-slide-up flex-1 flex flex-col justify-center pb-20 mt-10">

        {/* App logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">💸</span>
          <p className="text-slate-400 text-sm mt-2">Splito</p>
        </div>

        {/* Invite card */}
        <div className="bg-slate-800/50 border border-slate-700 shadow-2xl rounded-3xl p-6 mb-6">
          <p className="text-slate-400 text-sm mb-3 font-medium uppercase tracking-widest">You've been invited to join</p>
          <h2 className="text-white text-3xl font-bold mb-2 tracking-tight">{group.name}</h2>
          {group.description && (
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{group.description}</p>
          )}
          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-700/50">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-lg">👥</span>
              <span className="text-white font-bold text-sm">{group.members.length}</span>
              <span className="text-slate-400 text-xs uppercase tracking-wider">members</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-lg">💰</span>
              <span className="text-white font-bold text-sm">{group.currency}</span>
              <span className="text-slate-400 text-xs uppercase tracking-wider">currency</span>
            </div>
          </div>
        </div>

        {/* Sign in to join / Join Status */}
        {!currentUser ? (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm text-center mb-4 font-medium">
              Create an account or log in to view expenses and settle up.
            </p>
            <button
              onClick={() => navigate(`/login?returnUrl=/join/${inviteCode}`)}
              className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-green-500/20 active:scale-95"
            >
              Continue to Login / Register
            </button>
          </div>
        ) : joinError ? (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-red-400 text-sm font-medium mb-1">Failed to join group</p>
              <p className="text-red-400/80 text-xs">{joinError}</p>
            </div>
            <button
              onClick={handleJoinGroup}
              className="w-full flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-95"
            >
              Retry Joining
            </button>
          </div>
        ) : (
          <p className="text-center text-slate-400 text-sm font-medium animate-pulse">Adding you to the group...</p>
        )}
      </div>
    </div>
  )
}

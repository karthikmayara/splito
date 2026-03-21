// ─────────────────────────────────────────────────────────────
// Dashboard.tsx — Main screen after login
//
// Shows:
// - Net balance across ALL groups (you owe / you are owed)
// - List of all groups the user is in
// - Quick action: create new group
// - User profile with UPI ID setup
//
// Real-time: Firestore listener updates groups automatically
// when any member adds an expense.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, User, Settings, TrendingUp, TrendingDown, Users, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { signOut, deleteAccount } from '@/hooks/useAuth'
import {
  createGroup,
  updateUserProfile,
} from '@/utils/firestoreService'
import { subscribeToGroupExpenses, subscribeToGroupSettlements } from '@/utils/firestoreService'
import { minimizeDebts, formatAmount } from '@/utils/splitCalculator'
import { parseFirebaseError } from '@/utils/errorUtils'
import type { Group, Expense, Settlement } from '@/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentUser, groups } = useStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  // Per-group expenses for balance calculation
  // Key: groupId, Value: Expense[]
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({})
  const [allSettlements, setAllSettlements] = useState<Record<string, Settlement[]>>({})

  const [showArchived, setShowArchived] = useState(false)

  const activeGroups = groups.filter(g => !g.isArchived)
  const archivedGroups = groups.filter(g => g.isArchived)

  // ── Subscribe to expenses for each group ─────────────────
  // We need expenses to calculate net balances shown on dashboard
  useEffect(() => {
    if (groups.length === 0) return

    const unsubscribers = groups.flatMap(group => [
      subscribeToGroupExpenses(group.id, (expenses) => {
        setAllExpenses(prev => ({ ...prev, [group.id]: expenses }))
      }),
      subscribeToGroupSettlements(group.id, (settlements) => {
        setAllSettlements(prev => ({ ...prev, [group.id]: settlements }))
      })
    ])

    return () => unsubscribers.forEach(unsub => unsub())
  }, [groups.map(g => g.id).join(',')])

  // ── Calculate net balance across all groups ───────────────
  // Positive = others owe you, Negative = you owe others
  function calculateNetBalance(): number {
    if (!currentUser) return 0

    return groups.reduce((total, group) => {
      const expenses = allExpenses[group.id] || []
      const settlements = allSettlements[group.id] || []

      if (expenses.length === 0 && settlements.length === 0) return total

      const debts = minimizeDebts(expenses, group.members, settlements)

      // Sum up what this user owes and is owed in this group
      const groupNet = debts.reduce((net, debt) => {
        if (debt.toUserId === currentUser.id) return net + debt.amountCents
        if (debt.fromUserId === currentUser.id) return net - debt.amountCents
        return net
      }, 0)

      return total + groupNet
    }, 0)
  }

  const netBalance = calculateNetBalance()
  const isOwed = netBalance > 0
  const isSettled = netBalance === 0

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#0f172a]/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💸</span>
            <span className="font-semibold text-white">Splito</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={async () => { await signOut(); navigate('/login') }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* ── Net Balance Card ─────────────────────────── */}
        <div className={`
          rounded-2xl p-6 border
          ${isSettled
            ? 'bg-slate-800/50 border-slate-700'
            : isOwed
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }
        `}>
          <p className="text-slate-400 text-sm mb-1">Overall balance</p>
          <div className="flex items-end gap-3">
            <p className={`text-4xl font-semibold amount ${isSettled ? 'text-slate-300' : isOwed ? 'text-green-400' : 'text-red-400'
              }`}>
              {formatAmount(Math.abs(netBalance))}
            </p>
            {!isSettled && (
              <div className={`flex items-center gap-1 mb-1 ${isOwed ? 'text-green-400' : 'text-red-400'}`}>
                {isOwed ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="text-sm">{isOwed ? 'you are owed' : 'you owe'}</span>
              </div>
            )}
            {isSettled && <span className="text-slate-400 text-sm mb-1">all settled up 🎉</span>}
          </div>
        </div>

        {/* ── Groups Section ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-medium">Your groups</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-black text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              New group
            </button>
          </div>

          {activeGroups.length === 0 ? (
            // Empty state
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-5 border border-green-500/20">
                <span className="text-4xl translate-x-1">🚀</span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Welcome to Splito!</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-xs">
                You're not part of any active groups. Create your first group to start splitting expenses easily.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-500 hover:bg-green-400 active:bg-green-600 text-black font-medium py-3 px-6 rounded-xl transition-colors shadow-lg shadow-green-500/20 flex items-center gap-2"
              >
                <Plus size={18} />
                Create your first group
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGroups.map((group, i) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  expenses={allExpenses[group.id] || []}
                  settlements={allSettlements[group.id] || []}
                  currentUserId={currentUser!.id}
                  animationDelay={i * 50}
                  onClick={() => navigate(`/group/${group.id}`)}
                />
              ))}
            </div>
          )}

          {/* ── Archived Groups ──────────────────────────── */}
          {archivedGroups.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center justify-between w-full text-left bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 transition-colors hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <Archive size={16} className="text-slate-400" />
                  <span className="text-slate-300 font-medium">Archived Groups ({archivedGroups.length})</span>
                </div>
                {showArchived ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              {showArchived && (
                <div className="mt-3 space-y-3">
                  {archivedGroups.map((group, i) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      expenses={allExpenses[group.id] || []}
                      settlements={allSettlements[group.id] || []}
                      currentUserId={currentUser!.id}
                      animationDelay={i * 50}
                      onClick={() => navigate(`/group/${group.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Group Modal ───────────────────────── */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          currentUserId={currentUser!.id}
        />
      )}

      {/* ── Profile Modal ────────────────────────────── */}
      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  )
}

// ── Group Card ────────────────────────────────────────────────
function GroupCard({
  group,
  expenses,
  settlements,
  currentUserId,
  animationDelay,
  onClick,
}: {
  group: Group
  expenses: Expense[]
  settlements: Settlement[]
  currentUserId: string
  animationDelay: number
  onClick: () => void
}) {
  const { usersCache } = useStore()

  // Calculate this user's balance in this specific group
  const debts = minimizeDebts(expenses, group.members, settlements)
  const groupNet = debts.reduce((net, debt) => {
    if (debt.toUserId === currentUserId) return net + debt.amountCents
    if (debt.fromUserId === currentUserId) return net - debt.amountCents
    return net
  }, 0)

  const isOwed = groupNet > 0
  const isEven = groupNet === 0

  // Show member avatars (up to 4)
  const visibleMembers = group.members.slice(0, 4)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-2xl p-4 transition-all duration-150 animate-slide-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{group.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Users size={12} className="text-slate-500" />
            <span className="text-slate-400 text-xs">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 text-xs">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Balance for this group */}
        <div className="text-right ml-3 flex-shrink-0">
          {isEven ? (
            <span className="text-slate-500 text-sm">settled</span>
          ) : (
            <>
              <p className={`text-sm font-medium amount ${isOwed ? 'text-green-400' : 'text-red-400'}`}>
                {isOwed ? '+' : '-'}{formatAmount(Math.abs(groupNet), group.currency)}
              </p>
              <p className="text-slate-500 text-xs">
                {isOwed ? 'owed to you' : 'you owe'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Member avatar strip */}
      <div className="flex items-center gap-1 mt-3">
        {visibleMembers.map(memberId => {
          const user = usersCache[memberId]
          return (
            <div
              key={memberId}
              className="w-6 h-6 rounded-full bg-slate-600 border border-slate-700 overflow-hidden flex items-center justify-center"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-300">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          )
        })}
        {group.members.length > 4 && (
          <span className="text-slate-500 text-xs ml-1">+{group.members.length - 4} more</span>
        )}
      </div>
    </button>
  )
}

// ── Create Group Modal ────────────────────────────────────────
function CreateGroupModal({
  onClose,
  currentUserId,
}: {
  onClose: () => void
  currentUserId: string
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState<Group['currency']>('INR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Group name is required'); return }
    setLoading(true)
    try {
      const group = await createGroup(name.trim(), currency, currentUserId, description.trim())
      onClose()
      navigate(`/group/${group.id}`)
    } catch (err) {
      console.error(err)
      setError(parseFirebaseError(err))
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white font-semibold text-lg mb-5">Create a group</h2>

      <div className="space-y-4">
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Group name *</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Flat 4B expenses, Goa trip..."
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors"
            maxLength={50}
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's this group for?"
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors"
            maxLength={100}
          />
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Currency</label>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value as Group['currency'])}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 transition-colors"
          >
            <option value="INR">₹ Indian Rupee (INR)</option>
            <option value="USD">$ US Dollar (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
            <option value="GBP">£ British Pound (GBP)</option>
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-medium transition-colors disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Create group'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Profile Modal ─────────────────────────────────────────────
function ProfileModal({ onClose }: { onClose: () => void }) {
  const { currentUser, setCurrentUser } = useStore()
  const [upiId, setUpiId] = useState(currentUser?.upiId || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave() {
    if (!currentUser) return
    const idToSave = upiId.trim()

    if (idToSave) {
      if (!idToSave.includes('@')) {
        alert("Invalid UPI ID: Must contain an '@' symbol.")
        return
      }
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(idToSave)) {
        alert("Invalid UPI ID format. Please use a valid format like name@bank.")
        return
      }
    }

    setSaving(true)
    try {
      await updateUserProfile(currentUser.id, { upiId: idToSave })
      setCurrentUser({ ...currentUser, upiId: idToSave })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      alert(parseFirebaseError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white font-semibold text-lg mb-5">Your profile</h2>

      <div className="flex items-center gap-3 mb-6 p-3 bg-slate-700/30 rounded-xl">
        {currentUser?.avatar ? (
          <img src={currentUser.avatar} alt="" className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <User size={18} className="text-green-400" />
          </div>
        )}
        <div>
          <p className="text-white font-medium">{currentUser?.name}</p>
          <p className="text-slate-400 text-sm">{currentUser?.email}</p>
        </div>
      </div>

      {/* UPI ID setup — critical for receiving payments */}
      <div>
        <label className="text-slate-400 text-sm block mb-1.5">
          Your UPI ID
          <span className="text-slate-500 ml-1">(for receiving payments)</span>
        </label>
        <input
          type="text"
          value={upiId}
          onChange={e => setUpiId(e.target.value)}
          placeholder="yourname@ybl, 9876543210@paytm..."
          className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors font-mono text-sm"
        />
        <p className="text-slate-500 text-xs mt-1.5">
          This is shown to people who owe you money so they can pay via PhonePe, GPay, or Paytm
        </p>
      </div>

      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
          Close
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-medium transition-colors disabled:opacity-60"
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save UPI ID'}
        </button>
      </div>

      {/* ── DPDP Act Account Deletion ────────────────────────────── */}
      <div className="mt-8 pt-5 border-t border-slate-700/50 -mb-2">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <h3 className="text-red-400 font-medium mb-2">Delete your account?</h3>
            <p className="text-red-400/80 text-xs mb-4">
              Your profile will be deleted. Your expenses and group history will remain visible to other members.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await deleteAccount()
                    // onAuthStateChanged automatically logs us out and redirects!
                  } catch (err: any) {
                    console.error("Delete account error:", err)
                    if (err.code === 'auth/requires-recent-login') {
                      alert("Security check: Please log out and log back in to verify your identity before deleting your account.")
                    } else {
                      alert(parseFirebaseError(err))
                    }
                    setDeleting(false)
                    setShowDeleteConfirm(false)
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition-colors flex items-center justify-center"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  )
}

// ── Shared Modal Overlay ──────────────────────────────────────
// Reusable: dark backdrop + centered card + close on backdrop click
export function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 animate-slide-up"
        onClick={e => e.stopPropagation()} // prevent closing when clicking inside modal
      >
        {children}
      </div>
    </div>
  )
}

// Re-export for use in other files
export { CreateGroupModal }

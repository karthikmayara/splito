import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
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

import { GroupCardSkeleton } from '@/components/Skeletons'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const { currentUser, groups, groupsLoading } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  const [allExpenses, setAllExpenses] = useState<Record<string, Expense[]>>({})
  const [allSettlements, setAllSettlements] = useState<Record<string, Settlement[]>>({})
  const [showArchived, setShowArchived] = useState(false)

  const activeGroups = groups.filter(g => !g.isArchived)
  const archivedGroups = groups.filter(g => g.isArchived)

  // Route determining
  const isHome = location.pathname === '/dashboard'

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

  function calculateNetBalance(): number {
    if (!currentUser) return 0
    return groups.reduce((total, group) => {
      const expenses = allExpenses[group.id] || []
      const settlements = allSettlements[group.id] || []
      if (expenses.length === 0 && settlements.length === 0) return total
      const debts = minimizeDebts(expenses, group.members, settlements)
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
    <div className="flex h-[100dvh] overflow-hidden bg-[#0f172a] text-white selection:bg-green-500/30">
      
      {/* ── Sidebar (Dashboard) ─────────────────────────── */}
      {/* On Mobile: Hidden if NOT on Home. On Desktop: Always Visible (340px) */}
      <div className={`
        ${isHome ? 'flex' : 'hidden'} md:flex
        flex-col w-full md:w-[380px] border-r border-slate-800 bg-[#0f172a]/95 shrink-0 h-full overflow-y-auto custom-scrollbar
      `}>
        
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0f172a]/90 backdrop-blur-sm border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-2xl drop-shadow-md">💸</span>
            <span className="font-bold tracking-tight text-white text-lg">Splito</span>
          </div>
          <div className="flex items-center gap-1.5">
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
        </header>

        <div className="px-5 pt-6 pb-24 space-y-8 flex-1">
          
          {/* Net Balance Card */}
          <div className={`
            rounded-3xl p-6 border shadow-lg transition-colors duration-300
            ${isSettled
              ? 'bg-slate-800/40 border-slate-700/50 shadow-slate-900/50'
              : isOwed
                ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 shadow-green-900/20'
                : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 shadow-red-900/20'
            }
          `}>
            <p className="text-slate-400 text-sm font-medium mb-1.5">Overall balance</p>
            <div className="flex items-end gap-3">
              <p className={`text-4xl font-bold amount tracking-tight ${
                isSettled ? 'text-slate-200' : isOwed ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatAmount(Math.abs(netBalance))}
              </p>
            </div>
            {isSettled ? (
              <span className="inline-block mt-3 px-3 py-1 bg-slate-800/80 rounded-full text-slate-400 text-xs font-medium border border-slate-700/50">
                all settled up 🎉
              </span>
            ) : (
              <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium border ${
                isOwed ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {isOwed ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{isOwed ? 'you are owed' : 'you owe'}</span>
              </div>
            )}
          </div>

          {/* Groups List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg tracking-tight">Your groups</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-black text-sm font-medium px-3.5 py-2 rounded-xl transition-all duration-200"
              >
                <Plus size={16} />
                New
              </button>
            </div>

            {groupsLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => <GroupCardSkeleton key={i} />)}
              </div>
            ) : activeGroups.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl rotate-3 flex items-center justify-center mb-4 border border-green-500/20">
                  <span className="text-3xl -rotate-3">🚀</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Welcome to Splito!</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-[200px] leading-relaxed">
                  You're not part of any groups yet. Let's get started.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] text-black font-semibold py-3 px-5 rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Create group
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeGroups.map((group) => {
                  const isActive = location.pathname === `/group/${group.id}`
                  return (
                    <GroupCard
                      key={group.id}
                      group={group}
                      expenses={allExpenses[group.id] || []}
                      settlements={allSettlements[group.id] || []}
                      currentUserId={currentUser!.id}
                      isActive={isActive}
                      onClick={() => navigate(`/group/${group.id}`)}
                    />
                  )
                })}
              </div>
            )}

            {archivedGroups.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center justify-between w-full text-left bg-transparent border border-slate-800 rounded-2xl p-4 transition-colors hover:bg-slate-800/30"
                >
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Archive size={16} />
                    <span className="font-medium text-sm">Archived ({archivedGroups.length})</span>
                  </div>
                  {showArchived ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </button>
                {showArchived && (
                  <div className="mt-2.5 space-y-2.5">
                    {archivedGroups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        expenses={allExpenses[group.id] || []}
                        settlements={allSettlements[group.id] || []}
                        currentUserId={currentUser!.id}
                        isActive={location.pathname === `/group/${group.id}`}
                        onClick={() => navigate(`/group/${group.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content Area (Right Side) ──────────────── */}
      <div className={`
        ${!isHome ? 'flex' : 'hidden'} md:flex
        flex-1 flex-col h-full overflow-hidden bg-[#0f172a] relative z-0
      `}>
        {isHome ? (
          // Desktop Empty State
          <div className="hidden md:flex flex-col items-center justify-center h-full text-center p-10 animate-fade-in">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 bg-green-500/10 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-slate-800 border border-slate-700 w-full h-full rounded-3xl rotate-12 flex items-center justify-center shadow-2xl">
                <span className="text-4xl -rotate-12">👋</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Select a group</h2>
            <p className="text-slate-400 max-w-sm">
              Choose a group from the sidebar to view expenses, or create a new one to start splitting.
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} currentUserId={currentUser!.id} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  )
}

// ── Shared UI Sub-components (GroupCard, Modals) ───────────

function GroupCard({
  group, expenses, settlements, currentUserId, isActive, onClick,
}: {
  group: Group; expenses: Expense[]; settlements: Settlement[]; currentUserId: string; isActive: boolean; onClick: () => void;
}) {
  const { usersCache } = useStore()
  const debts = minimizeDebts(expenses, group.members, settlements)
  const groupNet = debts.reduce((net, debt) => {
    if (debt.toUserId === currentUserId) return net + debt.amountCents
    if (debt.fromUserId === currentUserId) return net - debt.amountCents
    return net
  }, 0)
  const isOwed = groupNet > 0
  const isEven = groupNet === 0
  const visibleMembers = group.members.slice(0, 4)

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl p-4 transition-all duration-200 border group
        ${isActive 
          ? 'bg-slate-800/80 border-slate-600 shadow-lg shadow-black/20' 
          : 'bg-slate-800/30 border-slate-800/50 hover:bg-slate-800/50 hover:border-slate-700'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <p className={`font-semibold truncate transition-colors ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
            {group.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 opacity-80">
            <Users size={12} className="text-slate-500" />
            <span className="text-slate-400 text-xs">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {isEven ? (
            <span className="inline-block px-2 py-0.5 rounded text-slate-500 bg-slate-800/50 border border-slate-700/50 text-[10px] font-medium uppercase tracking-wider">
              Settled
            </span>
          ) : (
            <>
              <p className={`text-sm font-bold amount ${isOwed ? 'text-green-400' : 'text-red-400'}`}>
                {isOwed ? '+' : '-'}{formatAmount(Math.abs(groupNet), group.currency)}
              </p>
              <p className="text-slate-500 text-[10px] uppercase font-medium mt-0.5 tracking-wider">
                {isOwed ? 'Owes you' : 'You owe'}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-4">
        {visibleMembers.map(memberId => {
          const user = usersCache[memberId]
          return (
            <div key={memberId} className="w-7 h-7 rounded-full bg-slate-700 border-2 border-[#0f172a] overflow-hidden -ml-2 first:ml-0 flex items-center justify-center relative shadow-sm">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-medium text-slate-300">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          )
        })}
        {group.members.length > 4 && (
          <span className="text-slate-500 text-xs ml-2 font-medium">+{group.members.length - 4}</span>
        )}
      </div>
    </button>
  )
}

function CreateGroupModal({ onClose, currentUserId }: { onClose: () => void; currentUserId: string }) {
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
      setError(parseFirebaseError(err))
      setLoading(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white font-bold text-xl mb-6">Create a group</h2>
      <div className="space-y-4">
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Group name *</label>
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Goa Trip, Flat 4B" maxLength={50}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-slate-800 transition-all font-medium" />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Description <span className="text-slate-600 font-normal lowercase tracking-normal">(optional)</span></label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this group for?" maxLength={100}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-slate-800 transition-all" />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value as Group['currency'])}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 focus:bg-slate-800 transition-all appearance-none cursor-pointer">
            <option value="INR">₹ Indian Rupee (INR)</option>
            <option value="USD">$ US Dollar (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
            <option value="GBP">£ British Pound (GBP)</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}
        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold transition-all shadow-lg shadow-green-500/20 disabled:shadow-none disabled:opacity-60 active:scale-[0.98]">
            {loading ? 'Creating...' : 'Create group'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

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
      if (!idToSave.includes('@')) { alert("Invalid UPI ID: Must contain an '@' symbol."); return }
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(idToSave)) { alert("Invalid UPI ID format. Please use a valid format like name@bank."); return }
    }
    setSaving(true)
    try {
      await updateUserProfile(currentUser.id, { upiId: idToSave })
      setCurrentUser({ ...currentUser, upiId: idToSave })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { alert(parseFirebaseError(err)) } finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white font-bold text-xl mb-6">Your profile</h2>
      <div className="flex items-center gap-4 mb-8 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
        {currentUser?.avatar ? (
          <img src={currentUser.avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-slate-700" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <User size={20} className="text-green-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{currentUser?.name}</p>
          <p className="text-slate-400 text-sm truncate">{currentUser?.email}</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider block mb-2">
          Your UPI ID <span className="text-slate-500 ml-1 font-normal lowercase tracking-normal">(for receiving payments)</span>
        </label>
        <div className="relative">
          <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@ybl, 9876543210@paytm..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-4 pr-24 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:bg-slate-800 transition-all font-mono text-sm" />
          <div className="absolute right-2 top-2 bottom-2">
            <button onClick={handleSave} disabled={saving} className="h-full px-4 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold text-xs transition-all disabled:opacity-50">
              {saved ? 'Saved!' : saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">Shown to people who owe you money so they can pay via PhonePe, GPay, or Paytm.</p>
      </div>

      <div className="pt-6 border-t border-slate-700/50">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-semibold">
            Delete Account
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <h3 className="text-red-400 font-bold mb-1">Delete your account?</h3>
            <p className="text-red-400/80 text-xs mb-4 leading-relaxed">Your profile will be deleted. Your expenses and group history will remain visible to other members.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-700 transition-colors">Cancel</button>
              <button disabled={deleting} onClick={async () => {
                setDeleting(true)
                try {
                  await deleteAccount()
                } catch (err: any) {
                  if (err.code === 'auth/requires-recent-login') alert("Security check: Please log out and log back in to verify your identity before deleting your account.")
                  else alert(parseFirebaseError(err))
                  setDeleting(false); setShowDeleteConfirm(false)
                }
              }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors flex items-center justify-center">
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <button onClick={onClose} className="w-full py-3 rounded-xl text-slate-400 hover:text-white font-medium hover:bg-slate-800 transition-colors">Close Profile</button>
      </div>
    </ModalOverlay>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

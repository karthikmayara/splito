// ─────────────────────────────────────────────────────────────
// GroupDetail.tsx — Single group view
//
// Shows:
// - All expenses in the group (real-time)
// - Who owes whom (minimized debt list)
// - "Settle up" button with UPI deep link
// - Invite link for adding new members
// - Add expense button
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Share2,
  Receipt, UserCheck, Copy, Check, ChevronRight, Download, Trash2
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  subscribeToGroupExpenses,
  subscribeToGroupSettlements,
  getUsers,
  checkGroupAccess,
  toggleGroupArchive,
  deleteGroupAndContents,
} from '@/utils/firestoreService'
import {
  minimizeDebts,
  formatAmount,
  computeExpenseStatuses,
} from '@/utils/splitCalculator'
import { exportGroupToCSV } from '@/utils/exportUtils'
import {
  buildWhatsAppShareLink,
  buildSmsShareLink,
  buildInviteMessage,
} from '@/utils/paymentLinks'
import { ModalOverlay } from '@/pages/Dashboard'
import { SettleUpSheet } from '@/components/SettleUpSheet'
import { ExpenseCard } from '@/components/ExpenseCard'
import { SettlementCard } from '@/components/SettlementCard'
import { GroupSummary } from '@/components/GroupSummary'
import type { Expense, Debt, Group, Settlement } from '@/types'

// App URL — change this to your actual domain after deployment
const APP_URL = window.location.origin

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const {
    currentUser,
    groups,
    expenses, setExpenses, setExpensesLoading,
    settlements, setSettlements,
    groupsLoading,
    usersCache, addUserToCache,
  } = useStore()

  const [debts, setDebts] = useState<Debt[]>([])
  const [settleDebt, setSettleDebt] = useState<Debt | null>(null) // debt being settled
  const [showInvite, setShowInvite] = useState(false)
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [activeTab, setActiveTab] = useState<'expenses' | 'settled' | 'balances'>('expenses')
  const [accessState, setAccessState] = useState<'check' | 'not-found' | 'denied'>('check')

  // Find the group from the store
  const group = groups.find(g => g.id === groupId)

  // ── Subscribe to expenses ─────────────────────────────────
  useEffect(() => {
    if (!groupId) return

    setExpensesLoading(true)
    const unsubExpenses = subscribeToGroupExpenses(groupId, async (fetchedExpenses) => {
      setExpenses(fetchedExpenses)
      setExpensesLoading(false)

      // Load any member profiles not yet in cache
      if (group) {
        const uncached = group.members.filter(id => !usersCache[id])
        if (uncached.length > 0) {
          const users = await getUsers(uncached)
          users.forEach(u => addUserToCache(u))
        }
      }
    })

    const unsubSettlements = subscribeToGroupSettlements(groupId, (fetchedSettlements) => {
      setSettlements(fetchedSettlements)
    })

    return () => {
      unsubExpenses()
      unsubSettlements()
    }
  }, [groupId])

  // ── Recalculate debts when expenses change ────────────────
  useEffect(() => {
    if (!group || (expenses.length === 0 && settlements.length === 0)) {
      setDebts([])
      return
    }
    const computed = minimizeDebts(expenses, group.members, settlements)
    setDebts(computed)
  }, [expenses, settlements, group?.members.join(',')])

  // ── Explicitly check access for direct links ──────────────
  useEffect(() => {
    if (!groupsLoading && !group && groupId && accessState === 'check') {
      checkGroupAccess(groupId).then(status => {
        if (status === 'denied' || status === 'not-found') {
          setAccessState(status)
        }
      })
    }
  }, [groupsLoading, group, groupId, accessState])

  if (groupsLoading || (!group && accessState === 'check')) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading group info...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="text-center w-full max-w-sm bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <span className="text-2xl">{accessState === 'denied' ? '🔒' : '👻'}</span>
          </div>
          <h2 className="text-white font-medium text-lg mb-2">
            {accessState === 'denied' ? 'Access Denied' : 'Group Not Found'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {accessState === 'denied' 
              ? "You are not a member of this group. If you have an invite link, please use it to join."
              : "This group doesn't exist or may have been deleted."}
          </p>
          <button onClick={() => navigate('/')} className="w-full text-slate-900 bg-white hover:bg-slate-100 font-medium py-2.5 rounded-xl transition-colors">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // Debts relevant to the current user
  const myDebts = debts.filter(
    d => d.fromUserId === currentUser?.id || d.toUserId === currentUser?.id
  )

  return (
    <div className="min-h-screen bg-[#0f172a] pb-24">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[#0f172a]/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h1 className="text-white font-semibold truncate">{group.name}</h1>
            {group.isArchived && (
              <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                Archived
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-slate-500 text-xs">{group.members.length} members</p>
          </div>
          <button
            onClick={() => exportGroupToCSV(group, expenses, usersCache)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Export to CSV"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Invite members"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* ── Group Summary ────────────────────────────── */}
        <div className="max-w-lg mx-auto w-full">
          <GroupSummary group={group} expenses={expenses} />
        </div>

        {/* Tabs */}
        <div className="max-w-lg mx-auto w-full px-4 pb-0 flex gap-1 pt-2">
          {(['expenses', 'settled', 'balances'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize
                ${activeTab === tab
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-slate-400 hover:text-slate-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── My balance summary ───────────────────────── */}
        {myDebts.length === 0 ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <Check size={16} />
              </div>
              <p className="text-green-400 font-medium">You're all settled up! 🎉</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {myDebts.map((debt, i) => {
              const iOwe = debt.fromUserId === currentUser?.id
              const otherUserId = iOwe ? debt.toUserId : debt.fromUserId
              const otherUser = usersCache[otherUserId]

              return (
                <div
                  key={i}
                  className={`
                    flex items-center justify-between p-4 rounded-xl border
                    ${iOwe
                      ? 'bg-red-500/5 border-red-500/20'
                      : 'bg-green-500/5 border-green-500/20'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                      {otherUser?.avatar
                        ? <img src={otherUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        : otherUser?.name?.[0]?.toUpperCase() || '?'
                      }
                    </div>
                    <div>
                      <p className="text-white text-sm">
                        {iOwe ? 'You owe' : 'Owed by'}{' '}
                        <span className="font-medium">{otherUser?.name || 'someone'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-medium amount text-sm ${iOwe ? 'text-red-400' : 'text-green-400'}`}>
                      {formatAmount(debt.amountCents, group.currency)}
                    </span>
                    <button
                      onClick={() => setSettleDebt(debt)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        iOwe
                          ? 'bg-green-500 hover:bg-green-400 text-black'
                          : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                      }`}
                    >
                      {iOwe ? 'Pay' : 'Mark settled'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Tab Content ──────────────────────────────── */}
        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            group={group}
            currentUserId={currentUser?.id || ''}
            settlements={settlements.filter(s => s.groupId === groupId)}
          />
        )}
        {activeTab === 'settled' && (
          <SettledTab
            settlements={settlements}
            group={group}
          />
        )}
        {activeTab === 'balances' && (
          <BalancesTab
            debts={debts}
            group={group}
            currentUserId={currentUser?.id || ''}
            onSettle={setSettleDebt}
          />
        )}
      </div>

      {currentUser?.id === group.createdBy && (
        <div className="max-w-lg mx-auto px-4 mt-8 pb-32">
          <button
            onClick={() => setShowDeleteGroupModal(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete Group
          </button>
        </div>
      )}

      {/* ── FAB: Add expense ─────────────────────────── */}
      <button
        onClick={() => navigate(`/group/${groupId}/add-expense`)}
        className="
          fixed bottom-6 right-6 z-20
          flex items-center gap-2
          bg-green-500 hover:bg-green-400 active:scale-95
          text-black font-medium
          px-5 py-3.5 rounded-2xl
          shadow-lg shadow-green-500/25
          transition-all duration-150
        "
      >
        <Plus size={18} />
        Add expense
      </button>

      {/* ── Settle up sheet ──────────────────────────── */}
      {settleDebt && (
        <SettleUpSheet
          debt={settleDebt}
          group={group}
          onClose={() => setSettleDebt(null)}
          onSettled={() => setSettleDebt(null)}
        />
      )}

      {showInvite && (
        <InviteModal
          group={group}
          inviterName={currentUser?.name || 'Someone'}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* ── Delete Group Modal ───────────────────────── */}
      {showDeleteGroupModal && (
        <ModalOverlay onClose={() => !deletingGroup && setShowDeleteGroupModal(false)}>
           <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-4 mx-auto">
             <Trash2 size={24} />
           </div>
           <h2 className="text-white font-semibold text-lg mb-2 text-center">Delete Group</h2>
           <p className="text-slate-400 text-sm mb-6 text-center">
             Are you sure you want to delete <strong className="text-slate-300">{group.name}</strong>? This will permanently delete all expenses and settlements. This action cannot be undone.
           </p>
           <div className="flex gap-3">
             <button
               onClick={() => setShowDeleteGroupModal(false)}
               disabled={deletingGroup}
               className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
             >
               Cancel
             </button>
             <button
               onClick={async () => {
                 setDeletingGroup(true)
                 try {
                   await deleteGroupAndContents(group.id)
                   navigate('/')
                 } catch (err) {
                   console.error(err)
                   alert("Failed to delete group")
                   setDeletingGroup(false)
                   setShowDeleteGroupModal(false)
                 }
               }}
               disabled={deletingGroup}
               className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors text-sm disabled:opacity-50 flex items-center justify-center"
             >
               {deletingGroup ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 'Delete forever'
               )}
             </button>
           </div>
        </ModalOverlay>
      )}
    </div>
  )
}

// ── Expenses Tab ──────────────────────────────────────────────
function ExpensesTab({
  expenses,
  group,
  currentUserId,
  settlements,
}: {
  expenses: Expense[]
  group: Group
  currentUserId: string
  settlements: Settlement[]
}) {

  const statuses = useMemo(
    () => computeExpenseStatuses(expenses, settlements),
    [expenses, settlements]
  )

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt size={32} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No expenses yet</p>
        <p className="text-slate-500 text-sm mt-1">Tap "Add expense" to get started</p>
      </div>
    )
  }

  // Group expenses by date for cleaner display
  const grouped = expenses.reduce((acc, exp) => {
    const date = new Date(exp.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(exp)
    return acc
  }, {} as Record<string, Expense[]>)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, dayExpenses]) => (
        <div key={date}>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">{date}</p>
          <div className="space-y-2">
            {dayExpenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                group={group}
                currentUserId={currentUserId}
                status={statuses[expense.id]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Settled Tab ──────────────────────────────────────────────
function SettledTab({
  settlements,
  group,
}: {
  settlements: Settlement[]
  group: Group
}) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt size={32} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No settlements yet</p>
        <p className="text-slate-500 text-sm mt-1">When members pay each other, they will appear here.</p>
      </div>
    )
  }

  // Group settlements by date for cleaner display
  // They are already sorted by createdAt descending from firestoreService
  const grouped = settlements.reduce((acc, set) => {
    const date = new Date(set.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(set)
    return acc
  }, {} as Record<string, Settlement[]>)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, daySettlements]) => (
        <div key={date}>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">{date}</p>
          <div className="space-y-2">
            {daySettlements.map(settlement => (
              <SettlementCard
                key={settlement.id}
                settlement={settlement}
                group={group}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Balances Tab ──────────────────────────────────────────────
function BalancesTab({
  debts,
  group,
  currentUserId,
  onSettle,
}: {
  debts: Debt[]
  group: Group
  currentUserId: string
  onSettle: (debt: Debt) => void
}) {
  const { usersCache } = useStore()

  if (debts.length === 0) {
    return (
      <div className="text-center py-12">
        <UserCheck size={32} className="text-green-500 mx-auto mb-3" />
        <p className="text-white font-medium">All settled up! 🎉</p>
        <p className="text-slate-400 text-sm mt-1 mb-8">No outstanding balances in this group</p>
        
        <button
          onClick={async () => {
            if (confirm(`Are you sure you want to ${group.isArchived ? 'unarchive' : 'archive'} this group?`)) {
              await toggleGroupArchive(group.id, !group.isArchived)
            }
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors border border-slate-700 mx-auto inline-flex"
        >
          {group.isArchived ? 'Unarchive Group' : 'Archive Group'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-slate-400 text-xs mb-3">
        Minimum {debts.length} transaction{debts.length !== 1 ? 's' : ''} to settle this group
      </p>
      {debts.map((debt, i) => {
        const fromUser = usersCache[debt.fromUserId]
        const toUser = usersCache[debt.toUserId]
        const iMine = debt.fromUserId === currentUserId

        return (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-slate-300 truncate">
                <span className={`font-medium ${iMine ? 'text-white' : ''}`}>
                  {iMine ? 'You' : fromUser?.name || 'Someone'}
                </span>
                <span className="text-slate-500 mx-2">→</span>
                <span className="font-medium">{toUser?.name || 'Someone'}</span>
              </span>
            </div>
            <span className="amount text-sm font-medium text-white flex-shrink-0">
              {formatAmount(debt.amountCents, group.currency)}
            </span>
            {iMine ? (
              <button
                onClick={() => onSettle(debt)}
                className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-green-500/20"
              >
                Pay <ChevronRight size={12} />
              </button>
            ) : (
              <button
                onClick={() => onSettle(debt)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                Mark settled
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}



// ── Invite Modal ──────────────────────────────────────────────
function InviteModal({
  group,
  inviterName,
  onClose,
}: {
  group: Group
  inviterName: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const inviteLink = `${APP_URL}/join/${group.inviteCode}`

  const message = buildInviteMessage({
    groupName: group.name,
    inviterName,
    inviteCode: group.inviteCode,
    appUrl: APP_URL,
  })

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white font-semibold text-lg mb-1">Invite members</h2>
      <p className="text-slate-400 text-sm mb-5">Share this link to add people to "{group.name}"</p>

      {/* Invite link display */}
      <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-3 mb-4">
        <p className="text-slate-400 text-xs mb-1">Invite link</p>
        <p className="text-white text-sm font-mono truncate">{inviteLink}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* WhatsApp */}
        <a
          href={buildWhatsAppShareLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl p-3 transition-colors"
        >
          <span className="text-xl">💬</span>
          <span className="text-xs text-green-300">WhatsApp</span>
        </a>

        {/* SMS */}
        <a
          href={buildSmsShareLink(message)}
          className="flex flex-col items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl p-3 transition-colors"
        >
          <span className="text-xl">📱</span>
          <span className="text-xs text-slate-300">SMS</span>
        </a>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="flex flex-col items-center gap-1.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl p-3 transition-colors"
        >
          {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-slate-300" />}
          <span className="text-xs text-slate-300">{copied ? 'Copied!' : 'Copy link'}</span>
        </button>
      </div>

      <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm">
        Done
      </button>
    </ModalOverlay>
  )
}



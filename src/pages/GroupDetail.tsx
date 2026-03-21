import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Share2, Search, Filter,
  Receipt, UserCheck, Copy, Check, Download, Trash2, MessageSquare, FileDown
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
import { exportGroupToCSV, exportGroupToPDF } from '@/utils/exportUtils'
import { ExpenseCardSkeleton } from '@/components/Skeletons'
import {
  buildWhatsAppShareLink,
  buildSmsShareLink,
  buildInviteMessage,
  buildPaymentReminder,
} from '@/utils/paymentLinks'
import { CATEGORIES } from '@/utils/categories'
import { ModalOverlay } from '@/pages/Dashboard'
import { SettleUpSheet } from '@/components/SettleUpSheet'
import { ExpenseCard } from '@/components/ExpenseCard'
import { SettlementCard } from '@/components/SettlementCard'
import { GroupSummary } from '@/components/GroupSummary'
import { parseFirebaseError } from '@/utils/errorUtils'
import type { Expense, Debt, Group, Settlement } from '@/types'

const APP_URL = window.location.href.split('#')[0].replace(/\/$/, '') + '/#'

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const {
    currentUser,
    groups,
    expenses, setExpenses, setExpensesLoading, expensesLoading,
    settlements, setSettlements,
    groupsLoading,
    usersCache, addUserToCache,
  } = useStore()

  const [debts, setDebts] = useState<Debt[]>([])
  const [settleDebt, setSettleDebt] = useState<Debt | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [activeTab, setActiveTab] = useState<'expenses' | 'settled' | 'balances'>('expenses')
  const [accessState, setAccessState] = useState<'check' | 'not-found' | 'denied'>('check')

  const group = groups.find(g => g.id === groupId)

  useEffect(() => {
    if (!groupId) return

    setExpensesLoading(true)
    const unsubExpenses = subscribeToGroupExpenses(groupId, async (fetchedExpenses) => {
      setExpenses(fetchedExpenses)
      setExpensesLoading(false)

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

  useEffect(() => {
    if (!group || (expenses.length === 0 && settlements.length === 0)) {
      setDebts([])
      return
    }
    const computed = minimizeDebts(expenses, group.members, settlements)
    setDebts(computed)
  }, [expenses, settlements, group?.members.join(',')])

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
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-green-500"
                style={{ animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
          <p className="text-slate-400 text-sm">Loading group info...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-[100dvh] bg-[#0f172a] flex items-center justify-center px-4">
        <div className="text-center w-full max-w-sm bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl animate-fade-in shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-5 border border-slate-700 rotate-3">
            <span className="text-3xl -rotate-3">{accessState === 'denied' ? '🔒' : '👻'}</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">
            {accessState === 'denied' ? 'Access Denied' : 'Group Not Found'}
          </h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {accessState === 'denied' 
              ? "You are not a member of this group. If you have an invite link, please use it to join."
              : "This group doesn't exist or may have been deleted."}
          </p>
          <button onClick={() => navigate('/')} className="w-full text-slate-900 bg-white hover:bg-slate-200 font-bold py-3 px-5 rounded-xl transition-all shadow-lg shadow-white/10 active:scale-[0.98]">
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const myDebts = debts.filter(
    d => d.fromUserId === currentUser?.id || d.toUserId === currentUser?.id
  )

  const iOweDebts = myDebts.filter(d => d.fromUserId === currentUser?.id)
  const totalIOwe = iOweDebts.reduce((sum, d) => sum + d.amountCents, 0)

  const myBalanceSummaryNode = (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-white font-semibold flex items-center gap-2">
          Your Balance
        </h3>
      </div>
      {myDebts.length === 0 ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
              <Check size={20} />
            </div>
            <div>
              <p className="text-green-400 font-bold">You're all settled up! 🎉</p>
              <p className="text-green-500/70 text-xs mt-0.5">No outstanding debts.</p>
            </div>
          </div>
        </div>
      ) : (
        myDebts.map((debt, i) => {
          const iOwe = debt.fromUserId === currentUser?.id
          const otherUserId = iOwe ? debt.toUserId : debt.fromUserId
          const otherUser = usersCache[otherUserId]

          return (
            <div
              key={i}
              className={`
                flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-4
                ${iOwe
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-green-500/5 border-green-500/20'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-[#0f172a] flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0 relative">
                  {otherUser?.avatar
                    ? <img src={otherUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    : otherUser?.name?.[0]?.toUpperCase() || '?'
                  }
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f172a] ${iOwe ? 'bg-red-500' : 'bg-green-500'}`}></div>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {iOwe ? 'You owe' : 'Owed by'} <span className="font-bold">{otherUser?.name || 'someone'}</span>
                  </p>
                  <p className={`text-xl font-bold font-mono tracking-tight mt-0.5 ${iOwe ? 'text-red-400' : 'text-green-400'}`}>
                    {formatAmount(debt.amountCents, group.currency)}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <button
                  onClick={() => setSettleDebt(debt)}
                  className={`w-full sm:w-auto text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 ${
                    iOwe
                      ? 'bg-green-500 hover:bg-green-400 text-black shadow-green-500/20'
                      : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                  }`}
                >
                  {iOwe ? 'Pay now' : 'Mark settled'}
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  return (
    <div className="h-full bg-[#0f172a] flex flex-col md:flex-row relative text-white selection:bg-green-500/30 overflow-hidden">
      
      {/* ── LEFT COLUMN (Expenses & Header) ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        
        {/* ── Header ──────────────────────────────────────── */}
        <header className="sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-3 md:py-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => navigate('/')}
                className="md:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white truncate">{group.name}</h1>
                  {group.isArchived && (
                    <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest flex-shrink-0">
                      Archived
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 opacity-80">
                  <p className="text-slate-400 text-xs font-medium">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                  <span className="text-slate-600 text-xs">•</span>
                  <p className="text-slate-400 text-xs font-medium">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => exportGroupToPDF(group, expenses, usersCache, debts, settlements)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                title="Download PDF Statement"
              >
                <FileDown size={18} />
              </button>
              <button
                onClick={() => exportGroupToCSV(group, expenses, usersCache)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                title="Export RAW CSV"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => setShowInvite(true)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                title="Invite members"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="md:hidden max-w-lg mx-auto w-full px-4 pb-0 flex gap-2 overflow-x-auto scrollbar-hide border-t border-slate-800/50 pt-3">
            {(['expenses', 'settled', 'balances'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-2 text-sm font-bold rounded-t-xl transition-colors capitalize whitespace-nowrap
                  ${activeTab === tab
                    ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Mobile "Pay Now" Banner (Sticky) */}
          {(totalIOwe > 0 && activeTab !== 'balances') && (
            <div className="md:hidden bg-red-500/10 border-b border-red-500/20 flex items-center justify-between animate-fade-in relative z-20">
              <div 
                className="flex-1 px-4 py-2.5 cursor-pointer"
                onClick={() => {
                  if (iOweDebts.length === 1) {
                    setSettleDebt(iOweDebts[0])
                  } else {
                    setActiveTab('balances')
                  }
                }}
              >
                <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-widest">Pending Debt</p>
                <p className="text-red-400 text-sm font-mono font-bold mt-0.5">{formatAmount(totalIOwe, group.currency)}</p>
              </div>
              <button 
                onClick={() => {
                  if (iOweDebts.length === 1) {
                    setSettleDebt(iOweDebts[0])
                  } else {
                    setActiveTab('balances')
                  }
                }}
                className="bg-red-500 hover:bg-red-400 active:bg-red-600 text-white text-xs font-bold px-4 py-2 mr-4 rounded-lg shadow-sm transition-colors"
              >
                Pay Now
              </button>
            </div>
          )}
          
          {/* Desktop Tabs (Only Expenses & Settled) */}
          <div className="hidden md:flex max-w-4xl mx-auto w-full px-8 pt-2 gap-8">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`pb-4 text-sm font-bold border-b-2 transition-all capitalize tracking-wide ${
                activeTab === 'expenses' || activeTab === 'balances' ? 'border-green-400 text-green-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('settled')}
              className={`pb-4 text-sm font-bold border-b-2 transition-all capitalize tracking-wide ${
                activeTab === 'settled' ? 'border-green-400 text-green-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              Settled History
            </button>
          </div>
        </header>

        {/* ── Scrollable Content Area ──────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar md:px-0 relative">
          <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 space-y-8 pb-32 md:pb-24">
            
            {/* Desktop Left Column renders Expenses or Settled */}
            <div className="hidden md:block">
              {activeTab === 'settled' ? (
                <SettledTab settlements={settlements} group={group} />
              ) : (
                <ExpensesTab expenses={expenses} group={group} currentUserId={currentUser?.id || ''} settlements={settlements} loading={expensesLoading} />
              )}
            </div>

            {/* Mobile renders active tab strictly */}
            <div className="md:hidden space-y-8">
              {activeTab === 'balances' && (
                <div className="space-y-8 animate-fade-in">
                  {myBalanceSummaryNode}
                  
                  {/* UPI Warning Mobile */}
                  {!currentUser?.upiId && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
                      <div className="text-amber-500 text-xl font-bold flex-shrink-0 animate-pulse">!</div>
                      <div>
                        <h4 className="text-amber-500 font-bold text-sm tracking-wide">Add your UPI ID</h4>
                        <p className="text-amber-500/80 text-xs mt-1 leading-relaxed">People can't pay you easily via UPI until you list your UPI ID. You are currently missing out on instant settlements.</p>
                        <button onClick={() => navigate('/profile')} className="mt-3 text-xs font-bold text-amber-900 bg-amber-500 hover:bg-amber-400 px-4 py-2 rounded-lg transition-colors shadow-lg active:scale-95">Complete Profile</button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-6 space-y-3">
                    <h3 className="text-white font-semibold px-1">Group Summary</h3>
                    <GroupSummary group={group} expenses={expenses} />
                  </div>
                  <div className="border-t border-slate-800 pt-6 space-y-3">
                    <h3 className="text-white font-semibold px-1">All Group Balances</h3>
                    <BalancesTab debts={debts} group={group} currentUserId={currentUser?.id || ''} onSettle={setSettleDebt} />
                  </div>
                  {currentUser?.id === group.createdBy && (
                    <div className="pt-8">
                      <button
                        onClick={() => setShowDeleteGroupModal(true)}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-colors text-sm font-bold shadow-sm"
                      >
                        <Trash2 size={16} /> Delete Group
                      </button>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'expenses' && <ExpensesTab expenses={expenses} group={group} currentUserId={currentUser?.id || ''} settlements={settlements} loading={expensesLoading} />}
              {activeTab === 'settled' && <SettledTab settlements={settlements} group={group} />}
            </div>
          </div>
        </div>

        {/* FAB: Add expense */}
        <button
          onClick={() => navigate(`/group/${groupId}/add-expense`)}
          className="
            absolute bottom-6 md:bottom-10 right-6 md:right-10 z-20
            flex items-center gap-2
            bg-green-500 hover:bg-green-400 active:scale-[0.96]
            text-black font-bold uppercase tracking-wider text-sm
            px-6 py-4 rounded-full
            shadow-xl shadow-green-500/20
            transition-all duration-200 border border-green-400
          "
        >
          <Plus size={18} strokeWidth={3} />
          Add Expense
        </button>

      </div>

      {/* ── RIGHT SIDEBAR (Balances & Summary) ── Desktop Only */}
      <div className="hidden md:flex w-[400px] border-l border-slate-800 bg-[#0f172a]/40 backdrop-blur-3xl flex-col h-[100dvh] overflow-y-auto custom-scrollbar z-10 shrink-0 shadow-2xl">
        <div className="p-8 space-y-10 min-h-full">
          {myBalanceSummaryNode}
          
          {/* UPI Warning */}
          {!currentUser?.upiId && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
              <div className="text-amber-500 text-xl font-bold flex-shrink-0 animate-pulse">!</div>
              <div>
                <h4 className="text-amber-500 font-bold text-sm tracking-wide">Add your UPI ID</h4>
                <p className="text-amber-500/80 text-xs mt-1 leading-relaxed">People can't pay you easily via UPI until you list your UPI ID. You are currently missing out on instant settlements.</p>
                <button onClick={() => navigate('/profile')} className="mt-3 text-xs font-bold text-amber-900 bg-amber-500 hover:bg-amber-400 px-4 py-2 rounded-lg transition-colors shadow-lg active:scale-95">Complete Profile</button>
              </div>
            </div>
          )}

          <section className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest text-slate-400">All Group Balances</h3>
            <BalancesTab debts={debts} group={group} currentUserId={currentUser?.id || ''} onSettle={setSettleDebt} />
          </section>

          <section className="space-y-4">
            <h3 className="text-white font-semibold text-sm uppercase tracking-widest text-slate-400">Group Analytics</h3>
            <GroupSummary group={group} expenses={expenses} />
          </section>

          {currentUser?.id === group.createdBy && (
            <div className="mt-auto pt-10">
              <button
                onClick={() => setShowDeleteGroupModal(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-red-500/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all text-sm font-bold"
              >
                <Trash2 size={16} /> Delete Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals & Drawers ──────────────────────────── */}
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

      {showDeleteGroupModal && (
        <ModalOverlay onClose={() => !deletingGroup && setShowDeleteGroupModal(false)}>
           <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 mb-6 mx-auto border border-red-500/20 rotate-3 shadow-lg shadow-red-500/10">
             <Trash2 size={28} className="-rotate-3" />
           </div>
           <h2 className="text-white font-bold text-xl mb-3 text-center">Delete Group</h2>
           <p className="text-slate-400 text-sm mb-8 text-center leading-relaxed px-2">
             Are you sure you want to delete <strong className="text-white tracking-wide">{group.name}</strong>? This will permanently wipe all its expenses and records. This action cannot be reversed.
           </p>
           <div className="flex gap-3">
             <button
               onClick={() => setShowDeleteGroupModal(false)}
               disabled={deletingGroup}
               className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold transition-colors shadow-sm disabled:opacity-50"
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
                   alert(parseFirebaseError(err))
                   setDeletingGroup(false)
                   setShowDeleteGroupModal(false)
                 }
               }}
               disabled={deletingGroup}
               className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-red-500/20 active:scale-[0.98]"
             >
               {deletingGroup ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete Forever'}
             </button>
           </div>
        </ModalOverlay>
      )}
    </div>
  )
}

// ── Expenses Tab & Search/Filter Logic ──────────────────────────────
function ExpensesTab({
  expenses,
  group,
  currentUserId,
  settlements,
  loading,
}: {
  expenses: Expense[]
  group: Group
  currentUserId: string
  settlements: Settlement[]
  loading?: boolean
}) {
  const { usersCache } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPaidBy, setFilterPaidBy] = useState<string>('all')

  const statuses = useMemo(
    () => computeExpenseStatuses(expenses, settlements),
    [expenses, settlements]
  )

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (searchQuery && !exp.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
      if (filterPaidBy !== 'all' && exp.paidBy !== filterPaidBy) return false;
      return true;
    })
  }, [expenses, searchQuery, filterCategory, filterPaidBy])

  const grouped = filteredExpenses.reduce((acc, exp) => {
    const date = new Date(exp.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(exp)
    return acc
  }, {} as Record<string, Expense[]>)

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Filters ── */}
      {(expenses.length > 0 || searchQuery || filterCategory !== 'all' || filterPaidBy !== 'all') && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search expenses..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 transition-colors text-sm font-medium" 
            />
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            <div className="relative flex-1 min-w-[140px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <select 
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/50 appearance-none font-medium cursor-pointer"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[140px]">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <select 
                value={filterPaidBy} 
                onChange={e => setFilterPaidBy(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-green-500/50 appearance-none font-medium cursor-pointer"
              >
                <option value="all">Paid by Anyone</option>
                <option value={currentUserId}>Paid by You</option>
                {group.members.filter(id => id !== currentUserId).map(id => (
                  <option key={id} value={id}>{usersCache[id]?.name || 'Unknown'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4].map(i => <ExpenseCardSkeleton key={i} />)}
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/20 border border-slate-800/50 rounded-3xl mt-6">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Receipt size={24} className="text-slate-500" />
          </div>
          <p className="text-white font-bold text-lg">No expenses found</p>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            {expenses.length === 0 ? 'Tap the Add Expense button to get started.' : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayExpenses]) => (
            <div key={date}>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1 mb-3">{date}</p>
              <div className="space-y-3">
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
      )}
    </div>
  )
}

function SettledTab({ settlements, group }: { settlements: Settlement[], group: Group }) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/20 border border-slate-800/50 rounded-3xl animate-fade-in">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
          <Receipt size={24} className="text-slate-500" />
        </div>
        <p className="text-white font-bold text-lg">No settlements yet</p>
        <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">When members pay each other back, the history will appear here.</p>
      </div>
    )
  }

  const grouped = settlements.reduce((acc, set) => {
    const date = new Date(set.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(set)
    return acc
  }, {} as Record<string, Settlement[]>)

  return (
    <div className="space-y-6 animate-fade-in">
      {Object.entries(grouped).map(([date, daySettlements]) => (
        <div key={date}>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest pl-1 mb-3">{date}</p>
          <div className="space-y-3">
            {daySettlements.map(settlement => (
              <SettlementCard key={settlement.id} settlement={settlement} group={group} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BalancesTab({ debts, group, currentUserId, onSettle }: { debts: Debt[], group: Group, currentUserId: string, onSettle: (debt: Debt) => void }) {
  const { usersCache } = useStore()

  const handleRemind = (debt: Debt) => {
    const lastReminded = localStorage.getItem(`reminded_${debt.fromUserId}_${debt.toUserId}_${group.id}`)
    if (lastReminded && Date.now() - parseInt(lastReminded, 10) < 24 * 60 * 60 * 1000) {
      alert("You can only send one reminder every 24 hours to prevent spam.")
      return
    }

    const fromUser = usersCache[debt.fromUserId]
    const toUser = usersCache[debt.toUserId]
    const amount = formatAmount(debt.amountCents, group.currency)

    const msg = buildPaymentReminder({
      payerName: fromUser?.name || 'Someone',
      receiverName: toUser?.id === currentUserId ? 'me' : (toUser?.name || 'Someone'),
      amount,
      groupName: group.name,
      receiverUpiId: toUser?.upiId
    })

    window.open(buildWhatsAppShareLink(msg), '_blank')
    localStorage.setItem(`reminded_${debt.fromUserId}_${debt.toUserId}_${group.id}`, Date.now().toString())
  }

  if (debts.length === 0) {
    return (
      <div className="text-center py-10 bg-green-500/5 border border-green-500/10 rounded-3xl">
        <div className="w-16 h-16 bg-green-500/10 border-2 border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-green-500/10">
          <UserCheck size={28} className="text-green-500" />
        </div>
        <p className="text-green-400 font-bold text-lg tracking-tight px-4">All settled up! 🎉</p>
        <p className="text-green-500/60 text-sm mt-1 font-medium mb-6">No outstanding balances remaining.</p>
        <button
          onClick={async () => {
            if (confirm(`Are you sure you want to ${group.isArchived ? 'unarchive' : 'archive'} this group?`)) {
              await toggleGroupArchive(group.id, !group.isArchived)
            }
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold px-5 py-2.5 rounded-xl transition-all border border-slate-700 shadow-sm active:scale-95"
        >
          {group.isArchived ? 'Unarchive Group' : 'Archive Group'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50 inline-block">
          {debts.length} unresolved debt{debts.length !== 1 ? 's' : ''}
        </p>
      </div>
      {debts.map((debt, i) => {
        const fromUser = usersCache[debt.fromUserId]
        const toUser = usersCache[debt.toUserId]
        const iMine = debt.fromUserId === currentUserId

        return (
          <div
            key={i}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-800"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0f172a] shadow-sm flex items-center justify-center z-10 text-xs font-bold text-white relative">
                  {fromUser?.avatar ? <img src={fromUser.avatar} className="w-full h-full rounded-full object-cover" /> : fromUser?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-[#0f172a] shadow-sm flex items-center justify-center z-0 text-xs font-bold text-white relative">
                  {toUser?.avatar ? <img src={toUser.avatar} className="w-full h-full rounded-full object-cover" /> : toUser?.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm truncate">
                  <span className={`font-bold ${iMine ? 'text-white' : 'text-slate-300'}`}>
                    {iMine ? 'You' : fromUser?.name || 'Someone'}
                  </span>
                  <span className="text-slate-500 mx-1 text-xs">owes</span>
                  <span className="font-bold text-slate-300">{toUser?.name || 'Someone'}</span>
                </p>
                <p className="text-lg font-bold font-mono tracking-tight text-white mt-0.5">
                  {formatAmount(debt.amountCents, group.currency)}
                </p>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              {iMine ? (
                <button
                  onClick={() => onSettle(debt)}
                  className="bg-green-500 hover:bg-green-400 text-black text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95"
                >
                  Pay Now
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleRemind(debt)}
                    className="flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-[10px] font-bold uppercase tracking-wider px-[14px] py-1.5 rounded-lg transition-colors border border-[#25D366]/20"
                  >
                    Remind
                  </button>
                  <button
                    onClick={() => onSettle(debt)}
                    className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors active:scale-95 text-center"
                  >
                    Settle
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function InviteModal({ group, inviterName, onClose }: { group: Group, inviterName: string, onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const inviteLink = `${APP_URL}/join/${group.inviteCode}`
  const message = buildInviteMessage({ groupName: group.name, inviterName, inviteCode: group.inviteCode, appUrl: APP_URL })

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-white font-bold text-xl mb-2">Invite members</h2>
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">Share this link to add friends, family, or colleagues to <strong className="text-slate-300">{group.name}</strong>.</p>

      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-6 relative overflow-hidden group">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Invite Link</p>
        <p className="text-green-400 text-sm font-mono truncate select-all">{inviteLink}</p>
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-800 to-transparent pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <a href={buildWhatsAppShareLink(message)} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 hover:border-[#25D366]/50 rounded-2xl p-4 transition-all active:scale-95">
          <svg viewBox="0 0 24 24" width="24" height="24" className="text-[#25D366] fill-current drop-shadow-sm">
            <path d="M12.031 0A12.031 12.031 0 0 0 0 12.031c0 2.126.551 4.186 1.594 6.01L0 24l6.113-1.556A11.967 11.967 0 0 0 12.031 24c6.634 0 12.031-5.397 12.031-12.031S18.665 0 12.031 0Zm6.46 17.265c-.276.772-1.583 1.48-2.185 1.545-.541.066-1.258.121-2.906-.554-1.996-.818-3.235-2.859-3.334-2.993-.099-.133-1.602-2.13-1.602-4.061 0-1.932 1.009-2.887 1.365-3.286.356-.399.771-.497 1.028-.497s.514-.01.742-.01c.228 0 .541-.086.847.66.306.746.99 2.41 1.079 2.585.089.175.148.381.049.58s-.148.324-.306.514c-.148.189-.313.407-.449.524-.148.116-.306.242-.128.549.178.307.791 1.31 1.696 2.115 1.166 1.037 2.146 1.357 2.453 1.503.307.146.488.126.666-.073.178-.199.761-.884.958-1.189.198-.305.396-.254.673-.148.277.106 1.748.824 2.045.972.296.148.494.22.564.343.069.123.069.713-.207 1.48Z"/>
          </svg>
          <span className="text-[11px] font-bold text-[#25D366] uppercase tracking-wider mt-1">WhatsApp</span>
        </a>
        <a href={buildSmsShareLink(message)} className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-all active:scale-95">
          <MessageSquare size={24} className="text-slate-300 drop-shadow-sm" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-1">SMS</span>
        </a>
        <button onClick={copyLink} className="flex flex-col items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-all active:scale-95">
          {copied ? <Check size={24} className="text-green-400 drop-shadow-sm" /> : <Copy size={24} className="text-slate-300 drop-shadow-sm" />}
          <span className={`text-[11px] font-bold uppercase tracking-wider mt-1 ${copied ? 'text-green-400' : 'text-slate-300'}`}>{copied ? 'Copied!' : 'Copy Link'}</span>
        </button>
      </div>

      <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 font-bold transition-all shadow-sm active:scale-[0.98]">
        Done
      </button>
    </ModalOverlay>
  )
}

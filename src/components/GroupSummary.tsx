import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, PieChart } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatAmount } from '@/utils/splitCalculator'
import { CATEGORY_ICONS } from '@/utils/categories'
import type { Expense, Group, ExpenseCategory } from '@/types'

interface GroupSummaryProps {
  group: Group
  expenses: Expense[]
}

export function GroupSummary({ group, expenses }: GroupSummaryProps) {
  const { usersCache } = useStore()
  const [expanded, setExpanded] = useState(false)

  // ── Calculate spending insights ──────────────────────────────────
  const summary = useMemo(() => {
    let totalSpend = 0
    let categorizedCount = 0
    const personalSpend: Record<string, number> = {} // how much each person paid
    const categorySpend: Record<string, number> = {} // total by category
    
    // Initialize personal
    group.members.forEach(m => personalSpend[m] = 0)
    
    expenses.forEach(expense => {
      totalSpend += expense.totalCents
      
      // Credit the payer
      if (personalSpend[expense.paidBy] !== undefined) {
        personalSpend[expense.paidBy] += expense.totalCents
      }
      
      // Track categories
      if (expense.category) {
        categorizedCount++
        categorySpend[expense.category] = (categorySpend[expense.category] || 0) + expense.totalCents
      }
    })

    // Sort personal spend descending
    const topSpenders = Object.entries(personalSpend)
      .map(([userId, cents]) => ({ userId, cents }))
      .sort((a, b) => b.cents - a.cents)

    // Sort categories descending
    const topCategories = Object.entries(categorySpend)
      .map(([cat, cents]) => ({ category: cat as ExpenseCategory, cents }))
      .sort((a, b) => b.cents - a.cents)

    const hasEnoughCategories = expenses.length > 0 && (categorizedCount / expenses.length) >= 0.5

    return { totalSpend, topSpenders, topCategories, hasEnoughCategories }
  }, [expenses, group.members])

  if (summary.totalSpend === 0) return null

  return (
    <div className="bg-slate-800/80 border-b border-slate-700 overflow-hidden transition-all duration-300">
      {/* ── Collapsed Header (Total only) ────────────────────── */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <PieChart size={16} />
          </div>
          <div className="text-left">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Group Spend</p>
            <p className="text-white font-semibold text-sm font-mono">
              {formatAmount(summary.totalSpend, group.currency)}
            </p>
          </div>
        </div>
        <div className="text-slate-500">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* ── Expanded Content ────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-5 pt-2 border-t border-slate-700/50 space-y-6">
          
          {/* Per-person breakdown bars */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-3">WHO PAID WHAT</p>
            <div className="space-y-3">
              {summary.topSpenders.map(({ userId, cents }) => {
                if (cents === 0) return null
                const user = usersCache[userId]
                const percentage = (cents / summary.totalSpend) * 100
                
                return (
                  <div key={userId} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate pr-4">{user?.name || 'Someone'}</span>
                      <span className="text-white font-mono">{formatAmount(cents, group.currency)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category breakdown (if > 50% categorized) */}
          {summary.hasEnoughCategories && summary.topCategories.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs font-medium mb-3">TOP CATEGORIES</p>
              <div className="bg-slate-900/40 rounded-xl p-3 space-y-3 border border-slate-700/30">
                {summary.topCategories.map(({ category, cents }) => {
                  const percentage = (cents / summary.totalSpend) * 100
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm shadow-inner shrink-0">
                        {CATEGORY_ICONS[category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 truncate">{category}</span>
                          <span className="text-slate-400 font-mono">{formatAmount(cents, group.currency)}</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

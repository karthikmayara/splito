// ─────────────────────────────────────────────────────────────
// ExpenseCard.tsx — Single expense row in the expenses list
//
// Displays:
// - Title + auto-detected category icon
// - Who paid
// - Total amount + the current user's personal share
// - Long-press / swipe hint for delete (creator only)
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Trash2, Edit2, AlertTriangle, X, Image as ImageIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { deleteExpense } from '@/utils/firestoreService'
import { formatAmount } from '@/utils/splitCalculator'
import type { Expense, Group } from '@/types'

interface ExpenseCardProps {
  expense: Expense
  group: Group
  currentUserId: string
  status?: 'settled' | 'partial' | 'unpaid'
}

import { CATEGORY_ICONS } from '@/utils/categories'

export function ExpenseCard({ expense, group, currentUserId, status }: ExpenseCardProps) {
  const navigate = useNavigate()
  const { usersCache } = useStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const payer = usersCache[expense.paidBy]
  const iPaid = expense.paidBy === currentUserId
  const iCreator = expense.createdBy === currentUserId

  const myShare = expense.splits.find(s => s.userId === currentUserId)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteExpense(expense.id)
      // Firestore listener automatically removes card
    } catch (err) {
      console.error('Failed to delete expense:', err)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const statusStyles = {
    unpaid: 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
    partial: 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    settled: 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
  }

  const borderClass = status ? statusStyles[status] : 'border-slate-700/50'

  return (
    <>
      <div className={`bg-slate-800/50 border rounded-xl p-4 flex flex-col gap-3 transition-colors relative overflow-hidden ${borderClass}`}>
        <div className="flex items-start gap-3 relative z-10">
          {/* Category icon */}
          <div className="w-10 h-10 rounded-xl bg-slate-700/70 flex items-center justify-center text-lg flex-shrink-0">
            {CATEGORY_ICONS[expense.category ?? 'Other']}
          </div>

          {/* Title + payer */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white text-sm font-medium truncate">{expense.title}</p>
              {expense.receiptUrl && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowReceiptModal(true) }} 
                  className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  title="View Receipt"
                >
                  <ImageIcon size={14} />
                </button>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {iPaid
                ? <span className="text-green-400/70">You paid</span>
                : <span>{payer?.name || 'Someone'} paid</span>
              }
              {expense.notes && (
                <span className="text-slate-500"> · {expense.notes}</span>
              )}
            </p>
          </div>

          {/* Amounts */}
          <div className="text-right flex-shrink-0">
            <p className="text-white text-sm font-medium amount">
              {formatAmount(expense.totalCents, group.currency)}
            </p>
            {myShare && (
              <p className={`text-xs amount mt-0.5 ${
                iPaid ? 'text-green-400/70' : 'text-slate-400'
              }`}>
                {iPaid
                  ? 'you paid'
                  : `you owe ${formatAmount(myShare.amountCents, group.currency)}`
                }
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons (Creator Only) */}
        {iCreator && (
          <div className="flex items-center justify-end gap-2 mt-1 border-t border-slate-700/30 pt-3">
            <button
              onClick={() => navigate(`/group/${group.id}/edit-expense/${expense.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <Edit2 size={12} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <AlertTriangle size={20} />
              </div>
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-white text-lg font-semibold mb-2">Delete Expense?</h3>
            
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 mb-4 flex items-center justify-between">
              <span className="text-slate-300 text-sm font-medium truncate pr-4">{expense.title}</span>
              <span className="text-white text-sm font-mono flex-shrink-0">
                {formatAmount(expense.totalCents, group.currency)}
              </span>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">
              This action cannot be undone. Splito will automatically recalculate everyone's balances.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Yes, delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {showReceiptModal && expense.receiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={(e) => { e.stopPropagation(); setShowReceiptModal(false) }} 
          />
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowReceiptModal(false) }} 
                className="bg-black/60 hover:bg-black p-2 rounded-full text-slate-300 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-2">
              <img 
                src={expense.receiptUrl} 
                alt="Receipt" 
                className="w-full h-auto max-h-[85vh] object-contain rounded-xl" 
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

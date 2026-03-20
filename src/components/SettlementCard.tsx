import { useState } from 'react'
import { Trash2, ArrowRight, AlertTriangle, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { deleteSettlement } from '@/utils/firestoreService'
import { formatAmount } from '@/utils/splitCalculator'
import type { Settlement, Group } from '@/types'

interface SettlementCardProps {
  settlement: Settlement
  group: Group
}

export function SettlementCard({ settlement, group }: SettlementCardProps) {
  const { usersCache, currentUser } = useStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const payer = usersCache[settlement.fromUserId]
  const receiver = usersCache[settlement.toUserId]

  // A settlement can only be deleted by the person who paid it or received it
  const canDelete = currentUser && (currentUser.id === settlement.fromUserId || currentUser.id === settlement.toUserId)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteSettlement(settlement.id)
    } catch (err) {
      console.error('Failed to delete settlement:', err)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <>
      <div 
        className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 flex-shrink-0">
          <ArrowRight size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm">
            <span className="font-medium">{payer?.name || 'Someone'}</span> paid{' '}
            <span className="font-medium">{receiver?.name || 'Someone'}</span>
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            {formatAmount(settlement.amountCents, group.currency)} via {settlement.method === 'upi' ? 'UPI' : 'Cash'}
          </p>
        </div>

        {canDelete && (
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="flex-shrink-0 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Delete settlement"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-2xl z-10">
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
            
            <h3 className="text-white text-lg font-semibold mb-2">Delete Settlement?</h3>
            
            <p className="text-slate-400 text-sm mb-6">
              Deleting this record will restore the <strong className="text-white">{formatAmount(settlement.amountCents, group.currency)}</strong> debt from <strong>{payer?.name || 'Someone'}</strong> to <strong>{receiver?.name || 'Someone'}</strong>.
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
                className="flex-[2] py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-medium text-sm shadow-sm shadow-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

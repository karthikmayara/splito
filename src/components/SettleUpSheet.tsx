// ─────────────────────────────────────────────────────────────
// SettleUpSheet.tsx — Payment bottom sheet
//
// Shown when a user taps "Pay" on a debt.
// Offers UPI deep link as primary option.
// Falls back gracefully if no UPI app is installed or
// the receiver hasn't set their UPI ID yet.
//
// Payment flow:
//   1. Tap "Pay via UPI" → opens PhonePe/GPay/Paytm pre-filled
//   2. User confirms in their payment app
//   3. Returns to app → taps "Mark as paid" to record settlement
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Check, Copy, ChevronRight, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { recordSettlement } from '@/utils/firestoreService'
import { buildUpiLink, openPaymentLink } from '@/utils/paymentLinks'
import { formatAmount } from '@/utils/splitCalculator'
import { useClipboard } from '@/hooks/useClipboard'
import type { Debt, Group } from '@/types'

interface SettleUpSheetProps {
  debt: Debt                    // the debt being settled
  group: Group
  onClose: () => void
  onSettled: () => void         // called after recording settlement
}

export function SettleUpSheet({ debt, group, onClose, onSettled }: SettleUpSheetProps) {
  const { currentUser, usersCache } = useStore()
  const { copy, copied } = useClipboard()

  // States for the multi-step payment flow
  const [step, setStep] = useState<'choose' | 'upi-fallback' | 'confirm'>('choose')
  const [recording, setRecording] = useState(false)

  const iOwe = currentUser?.id === debt.fromUserId
  const otherUserId = iOwe ? debt.toUserId : debt.fromUserId
  const otherUser = usersCache[otherUserId]
  const amount = formatAmount(debt.amountCents, group.currency)
  const hasUpiId = Boolean(otherUser?.upiId)

  // ── Attempt to open UPI deep link ────────────────────────
  function handleUpiTap() {
    if (!iOwe) return // only the payer should be able to trigger a deep link

    if (!hasUpiId) {
      // Receiver hasn't set up UPI — show manual fallback
      setStep('upi-fallback')
      return
    }

    const link = buildUpiLink({
      upiId: otherUser!.upiId!,
      name: otherUser!.name,
      amountCents: debt.amountCents,
      note: `Splito · ${group.name}`,
    })

    // Try to open the UPI app
    openPaymentLink(link, () => {
      // App didn't open — show UPI ID for manual entry
      setStep('upi-fallback')
    })

    // After attempting to open the app, show "mark as paid" step
    // User comes back to this screen after paying in their app
    setTimeout(() => setStep('confirm'), 800)
  }

  // ── Record the settlement in Firestore ───────────────────
  async function handleMarkPaid(method: 'upi' | 'cash') {
    if (!currentUser) return
    setRecording(true)
    try {
      await recordSettlement({
        groupId: group.id,
        fromUserId: debt.fromUserId,
        toUserId: debt.toUserId,
        amountCents: debt.amountCents,
        method,
        note: `Splito · ${group.name}`,
      })
      onSettled()
    } catch (err) {
      console.error('Failed to record settlement:', err)
      setRecording(false)
    }
  }

  return (
    // Bottom sheet overlay
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1a2744] border border-slate-700 rounded-t-3xl p-5 pb-8 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors"
        >
          <X size={16} />
        </button>

        {/* ── Step: Choose payment method ─────────────── */}
        {step === 'choose' && (
          <>
            <div className="mb-5">
              <p className="text-slate-400 text-sm">{iOwe ? 'Pay to' : 'Receive from'}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-white">
                  {otherUser?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-white font-semibold">{otherUser?.name || 'Someone'}</p>
                  <p className="text-green-400 font-mono text-sm">{amount}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {iOwe ? (
                <>
                  {/* UPI — primary option for India */}
                  <button
                    onClick={handleUpiTap}
                    className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">💳</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Pay via UPI</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {hasUpiId
                          ? 'PhonePe · Google Pay · Paytm · BHIM'
                          : 'UPI ID not set — tap to copy manually'
                        }
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
                  </button>

                  {/* Cash — for offline payments */}
                  <button
                    onClick={() => handleMarkPaid('cash')}
                    disabled={recording}
                    className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-all text-left disabled:opacity-60"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">💵</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Already paid in cash</p>
                      <p className="text-slate-400 text-xs mt-0.5">Mark this debt as settled</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleMarkPaid('cash')}
                  disabled={recording}
                  className="w-full flex items-center gap-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-all text-left disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">✅</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Mark as settled</p>
                    <p className="text-slate-400 text-xs mt-0.5">They paid me via cash, UPI, or other means</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Step: UPI fallback (manual entry) ──────── */}
        {step === 'upi-fallback' && (
          <>
            <h3 className="text-white font-semibold mb-1">Pay manually</h3>
            <p className="text-slate-400 text-sm mb-5">
              Open PhonePe, Google Pay, or Paytm and enter these details
            </p>

            {hasUpiId ? (
              <div className="space-y-3">
                {/* UPI ID with copy button */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1.5">UPI ID</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white font-mono text-sm truncate">{otherUser?.upiId}</p>
                    <button
                      onClick={() => copy(otherUser?.upiId || '')}
                      className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 flex-shrink-0 transition-colors"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1.5">Amount to pay</p>
                  <p className="text-white font-mono text-lg">{amount}</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <p className="text-amber-300 text-sm font-medium mb-1">No UPI ID set</p>
                <p className="text-amber-300/70 text-xs">
                  Ask {otherUser?.name} to add their UPI ID in their Splito profile settings.
                </p>
              </div>
            )}

            {/* After manual payment, mark as paid */}
            <button
              onClick={() => handleMarkPaid('upi')}
              disabled={recording}
              className="w-full mt-4 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-medium transition-colors disabled:opacity-60"
            >
              {recording ? 'Recording...' : "I've paid — mark as settled"}
            </button>
          </>
        )}

        {/* ── Step: Confirm after opening UPI app ─────── */}
        {step === 'confirm' && (
          <>
            <div className="text-center py-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-white font-semibold mb-1">Complete payment in your UPI app</h3>
              <p className="text-slate-400 text-sm">
                Once you've confirmed the payment of{' '}
                <span className="text-green-400 font-medium amount">{amount}</span>{' '}
                in PhonePe / GPay / Paytm, come back here to mark it as settled.
              </p>
            </div>

            <button
              onClick={() => handleMarkPaid('upi')}
              disabled={recording}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-medium transition-colors disabled:opacity-60"
            >
              {recording ? 'Recording...' : "I've paid — mark as settled"}
            </button>

            <button
              onClick={() => setStep('choose')}
              className="w-full mt-2 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}

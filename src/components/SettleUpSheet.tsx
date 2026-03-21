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
import { QRCodeSVG } from 'qrcode.react'
import { useStore } from '@/store/useStore'
import { recordSettlement } from '@/utils/firestoreService'
import { openPaymentLink, buildUpiLink } from '@/utils/paymentLinks'
import { formatAmount } from '@/utils/splitCalculator'
import { useClipboard } from '@/hooks/useClipboard'
import { parseFirebaseError } from '@/utils/errorUtils'
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
  const [step, setStep] = useState<'choose' | 'upi-fallback' | 'confirm' | 'upi-qr'>('choose')
  const [recording, setRecording] = useState(false)

  const iOwe = currentUser?.id === debt.fromUserId
  const otherUserId = iOwe ? debt.toUserId : debt.fromUserId
  const otherUser = usersCache[otherUserId]
  const fullAmountStr = (debt.amountCents / 100).toFixed(2)
  const fullAmountFormatted = formatAmount(debt.amountCents, group.currency)
  const hasUpiId = Boolean(otherUser?.upiId)
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)

  const [payAmountStr, setPayAmountStr] = useState(fullAmountStr)
  const payAmountNum = Math.max(0.01, Math.min(debt.amountCents / 100, parseFloat(payAmountStr) || 0))

  const upiIntentLink = hasUpiId ? buildUpiLink({
    upiId: otherUser!.upiId!,
    name: otherUser!.name,
    amountCents: Math.round(payAmountNum * 100),
    note: `Splito · ${group.name}`,
  }) : ''

  // ── Attempt to open UPI deep link ────────────────────────
  function handleUpiTap() {
    if (!iOwe) return // only the payer should be able to trigger a deep link

    if (!hasUpiId) {
      // Receiver hasn't set up UPI — show manual fallback
      setStep('upi-fallback')
      return
    }

    if (isMobile) {
      // Try to open the UPI app
      openPaymentLink(upiIntentLink, () => {
        // App didn't open — show UPI ID for manual entry
        setStep('upi-fallback')
      })
      // After attempting to open the app, show "mark as paid" step
      setTimeout(() => setStep('confirm'), 800)
    } else {
      // Desktop context -> Render QR Code
      setStep('upi-qr')
    }
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
        amountCents: Math.round(payAmountNum * 100),
        method,
        note: `Splito · ${group.name}`,
      })
      onSettled()
    } catch (err) {
      console.error('Failed to record settlement:', err)
      alert(parseFirebaseError(err))
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
                </div>
              </div>
            </div>

            {/* Editable Amount for Partial Payments */}
            <div className="mb-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-4">
              <label className="text-slate-400 text-xs mb-2 block font-medium">Paying Amount</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 font-bold">{group.currency}</span>
                <input
                  type="number"
                  value={payAmountStr}
                  onChange={e => setPayAmountStr(e.target.value)}
                  max={fullAmountStr}
                  min="0.01"
                  step="0.01"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white font-mono text-xl focus:outline-none focus:border-green-500/50 transition-colors"
                />
              </div>
              <p className="text-slate-400 text-xs mt-3 flex justify-between items-center px-1">
                <span>Full Balance: <strong className="text-slate-300">{fullAmountFormatted}</strong></span>
                {Math.round(payAmountNum * 100) < debt.amountCents && (
                  <span className="text-amber-400/80 font-medium tracking-tight bg-amber-500/10 px-2 py-0.5 rounded">
                    Partial payment
                  </span>
                )}
              </p>
              {group.currency === 'INR' && payAmountNum > 100000 && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <p className="text-amber-400 text-xs font-medium flex items-start gap-1.5">
                    <span>⚠️</span>
                    <span>
                      UPI limits are usually capped at <strong>₹1 Lakh</strong> per transaction. 
                      Amounts higher than this may get rejected by PhonePe, GPay, or your bank.
                    </span>
                  </p>
                </div>
              )}
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

        {/* ── Step: Desktop QR Code ─────────────── */}
        {step === 'upi-qr' && (
          <div className="flex flex-col items-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📱</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Scan to Pay</h3>
            <p className="text-slate-400 text-sm mb-6 text-center leading-relaxed">
              Scan this code with PhonePe, <br /> GPay, or any UPI app on your phone.
            </p>
            
            <div className="bg-white p-4 rounded-3xl mb-6 shadow-xl shadow-black/50">
              <QRCodeSVG value={upiIntentLink} size={180} level="M" />
            </div>
            
            <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400 text-xs font-medium">Paying {otherUser?.name}</span>
              </div>
              <p className="text-white font-mono text-xl tracking-tight">
                {formatAmount(Math.round(payAmountNum * 100), group.currency)}
              </p>
             </div>

            <button
              onClick={() => handleMarkPaid('upi')}
              disabled={recording}
              className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-transform active:scale-95 disabled:opacity-60 mb-2"
            >
               {recording ? 'Recording...' : "I've scanned and paid"}
            </button>
            
            <button
              onClick={() => setStep('choose')}
              className="w-full py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              Back to options
            </button>
          </div>
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
                  <p className="text-white font-mono text-lg">{formatAmount(Math.round(payAmountNum * 100), group.currency)}</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <p className="text-amber-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                  ⚠️ No UPI ID set
                </p>
                <p className="text-amber-400/80 text-xs leading-relaxed">
                  {otherUser?.name} hasn't set up their UPI ID yet on Splito.
                </p>
                <button
                  onClick={() => {
                    const msg = `Hey ${otherUser?.name}! Please add your UPI ID on Splito so I can smoothly pay you back ${formatAmount(Math.round(payAmountNum * 100), group.currency)}.`
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                  }}
                  className="mt-3 text-xs w-full text-center font-bold text-amber-900 bg-amber-400 hover:bg-amber-400/90 active:scale-95 px-3 py-2.5 rounded-lg transition-all"
                >
                  Tap to remind them on WhatsApp
                </button>
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
                <span className="text-green-400 font-medium amount">{formatAmount(Math.round(payAmountNum * 100), group.currency)}</span>{' '}
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

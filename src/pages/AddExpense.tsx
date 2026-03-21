// ─────────────────────────────────────────────────────────────
// AddExpense.tsx — Form to log a new expense
//
// Supports all 3 split types:
//   equal    → divide total evenly (with penny rounding)
//   percentage → each person pays their specified %
//   exact    → manually type each person's amount
//
// All math uses integer cents — no float bugs.
// Validation happens before saving.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { addExpense, getUsers, uploadReceiptImage } from '@/utils/firestoreService'
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  validateExactSplit,
  parseToCents,
  formatAmount,
} from '@/utils/splitCalculator'
import { CATEGORIES, CATEGORY_ICONS, guessCategory } from '@/utils/categories'
import { parseFirebaseError } from '@/utils/errorUtils'
import type { SplitType, Split, ExpenseCategory } from '@/types'

export default function AddExpense() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { currentUser, groups, usersCache, addUserToCache } = useStore()

  const group = groups.find(g => g.id === groupId)

  // ── Form state ────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [amountInput, setAmountInput] = useState('')   // raw string the user types
  const [paidBy, setPaidBy] = useState(currentUser?.id || '')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [date, setDate] = useState(() => {
    // Default to today in YYYY-MM-DD format for the date input
    return new Date().toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Other')
  const [userManuallyPickedCategory, setUserManuallyPickedCategory] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Auto-guess category as user types, unless they manually picked one
  useEffect(() => {
    if (!userManuallyPickedCategory && title.trim().length > 2) {
      setCategory(guessCategory(title))
    }
  }, [title, userManuallyPickedCategory])

  // For percentage splits: track each member's percentage
  const [percentages, setPercentages] = useState<Record<string, string>>({})

  // For exact splits: track each member's exact amount
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Load member profiles ──────────────────────────────────
  useEffect(() => {
    if (!group) return

    // Initialize equal percentages when group loads
    const equalPct = (100 / group.members.length).toFixed(2)
    const initPct: Record<string, string> = {}
    group.members.forEach(id => { initPct[id] = equalPct })
    setPercentages(initPct)

    // Fetch uncached members
    const uncached = group.members.filter(id => !usersCache[id])
    if (uncached.length > 0) {
      getUsers(uncached).then(users => users.forEach(u => addUserToCache(u)))
    }
  }, [group?.id])

  if (!group) return null

  // ── Build the splits array based on current inputs ────────
  function buildSplits(): { splits: Split[], error: string | null } {
    const totalCents = parseToCents(amountInput)
    if (!totalCents || totalCents <= 0) {
      return { splits: [], error: 'Enter a valid amount' }
    }

    try {
      if (splitType === 'equal') {
        return {
          splits: calculateEqualSplit(totalCents, group!.members),
          error: null,
        }
      }

      if (splitType === 'percentage') {
        const members = group!.members.map(id => ({
          userId: id,
          percentage: parseFloat(percentages[id] || '0'),
        }))
        return {
          splits: calculatePercentageSplit(totalCents, members),
          error: null,
        }
      }

      if (splitType === 'exact') {
        const splits: Split[] = group!.members.map(id => ({
          userId: id,
          amountCents: parseToCents(exactAmounts[id] || '0') || 0,
        }))
        const validationError = validateExactSplit(totalCents, splits)
        return { splits, error: validationError }
      }
    } catch (err: unknown) {
      return { splits: [], error: (err as Error).message }
    }

    return { splits: [], error: 'Unknown split type' }
  }

  // ── Save expense ──────────────────────────────────────────
  async function handleSave() {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) newErrors.title = 'Title is required'

    const totalCents = parseToCents(amountInput)
    if (!totalCents || totalCents <= 0) newErrors.amount = 'Enter a valid amount greater than 0'

    const { splits, error: splitError } = buildSplits()
    if (splitError) newErrors.split = splitError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    if (!group) return
    try {
      let receiptUrl = undefined
      if (receiptFile) {
        receiptUrl = await uploadReceiptImage(receiptFile, group.id)
      }

      await addExpense({
        groupId: group.id,
        title: title.trim(),
        totalCents: totalCents!,
        paidBy,
        splits,
        splitType,
        date: new Date(date).getTime(),
        notes: notes.trim(),
        category,
        createdBy: currentUser!.id,
        ...(receiptUrl ? { receiptUrl } : {})
      })
      navigate(`/group/${groupId}`)
    } catch (err) {
      console.error(err)
      setErrors({ general: parseFirebaseError(err) })
      setSaving(false)
    }
  }

  // Total cents for displaying per-person amounts as user types
  const totalCents = parseToCents(amountInput) || 0

  return (
    <div className="min-h-[100dvh] md:min-h-0 md:h-full bg-[#0f172a] md:bg-transparent pb-24 md:pb-0 md:overflow-y-auto custom-scrollbar md:flex md:items-center md:justify-center md:p-6">
      
      <div className="md:w-full md:max-w-xl md:bg-slate-900/80 md:backdrop-blur-xl md:border md:border-slate-700/50 md:rounded-3xl md:overflow-hidden md:shadow-2xl animate-fade-in">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="sticky top-0 z-10 bg-[#0f172a]/90 md:bg-transparent backdrop-blur-sm border-b border-slate-800 md:border-slate-800/60">
          <div className="max-w-lg mx-auto md:max-w-none px-4 md:px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-white font-semibold text-lg tracking-tight">Add expense</h1>
          </div>
        </header>

        <div className="max-w-lg mx-auto md:max-w-none px-4 md:px-6 py-6 space-y-6">

        {/* ── Title ────────────────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">What was this for? *</label>
          <input
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })) }}
            placeholder="Dinner, Electricity bill, Groceries..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors"
            autoFocus
            maxLength={100}
          />
          {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        {/* ── Amount ───────────────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Total amount *</label>
          <div className="relative">
            {/* Currency symbol */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
              {group.currency === 'INR' ? '₹' : group.currency === 'USD' ? '$' : group.currency === 'EUR' ? '€' : '£'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={amountInput}
              onChange={e => { setAmountInput(e.target.value); setErrors(prev => ({ ...prev, amount: '' })) }}
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors font-mono text-lg"
              min="0"
              step="0.01"
            />
          </div>
          {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
        </div>

        {/* ── Paid by ──────────────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Paid by</label>
          <div className="relative">
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
            >
              {group.members.map(memberId => {
                const user = usersCache[memberId]
                return (
                  <option key={memberId} value={memberId}>
                    {memberId === currentUser?.id ? 'You' : user?.name || 'Loading...'}
                  </option>
                )
              })}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Date ─────────────────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        {/* ── Category Picker ──────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Category</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat)
                  setUserManuallyPickedCategory(true)
                  // Auto-fill title if clicked
                  setTitle(cat)
                  setErrors(prev => ({ ...prev, title: '' }))
                }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition-colors
                  ${category === cat
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }
                `}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Split type selector ───────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-2">Split type</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'equal', label: 'Equal', desc: 'Split evenly' },
              { value: 'percentage', label: 'By %', desc: 'Custom %' },
              { value: 'exact', label: 'Exact', desc: 'Manual amounts' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setSplitType(opt.value); setErrors(prev => ({ ...prev, split: '' })) }}
                className={`
                  p-3 rounded-xl border text-left transition-all
                  ${splitType === opt.value
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                  }
                `}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs opacity-60 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Split breakdown ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-sm">Split breakdown</label>
            {totalCents > 0 && (
              <span className="text-slate-500 text-xs amount">
                Total: {formatAmount(totalCents, group.currency)}
              </span>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {group.members.map((memberId, index) => {
              const user = usersCache[memberId]
              const isMe = memberId === currentUser?.id
              const name = isMe ? 'You' : user?.name || 'Loading...'

              // Calculate preview amount for this member
              let previewAmount = ''
              if (totalCents > 0) {
                try {
                  const { splits: previewSplits } = buildSplits()
                  const mySplit = previewSplits.find(s => s.userId === memberId)
                  if (mySplit) {
                    previewAmount = formatAmount(mySplit.amountCents, group.currency)
                  }
                } catch {
                  // Don't show preview if there's an error
                }
              }

              return (
                <div
                  key={memberId}
                  className={`flex items-center gap-3 px-4 py-3 ${index !== 0 ? 'border-t border-slate-700/50' : ''}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                    {user?.avatar
                      ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      : name[0]?.toUpperCase()
                    }
                  </div>

                  <span className="text-white text-sm flex-1">{name}</span>

                  {/* Input based on split type */}
                  {splitType === 'equal' && (
                    <span className="text-slate-400 text-sm amount">{previewAmount || '—'}</span>
                  )}

                  {splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={percentages[memberId] || ''}
                        onChange={e => {
                          setPercentages(prev => ({ ...prev, [memberId]: e.target.value }))
                          setErrors(prev => ({ ...prev, split: '' }))
                        }}
                        className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-green-500 font-mono"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <span className="text-slate-400 text-sm">%</span>
                      {previewAmount && (
                        <span className="text-slate-500 text-xs amount ml-1">{previewAmount}</span>
                      )}
                    </div>
                  )}

                  {splitType === 'exact' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm font-mono">
                        {group.currency === 'INR' ? '₹' : '$'}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={exactAmounts[memberId] || ''}
                        onChange={e => {
                          setExactAmounts(prev => ({ ...prev, [memberId]: e.target.value }))
                          setErrors(prev => ({ ...prev, split: '' }))
                        }}
                        className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-green-500 font-mono"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Percentage sum validator */}
          {splitType === 'percentage' && (
            <PercentageValidator percentages={percentages} members={group.members} />
          )}

          {/* Exact amount sum validator */}
          {splitType === 'exact' && totalCents > 0 && (
            <ExactAmountValidator
              exactAmounts={exactAmounts}
              members={group.members}
              totalCents={totalCents}
              currency={group.currency}
            />
          )}

          {errors.split && <p className="text-red-400 text-xs mt-2">{errors.split}</p>}
        </div>

        {/* ── Notes ────────────────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any extra details..."
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
            maxLength={200}
          />
        </div>

        {/* ── Receipt Photo ────────────────────────────────────── */}
        <div>
          <label className="text-slate-400 text-sm block mb-1.5">Receipt (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setReceiptFile(e.target.files?.[0] || null)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600"
          />
        </div>

        {errors.general && (
          <p className="text-red-400 text-sm text-center">{errors.general}</p>
        )}

        {/* ── Save button ───────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="
            w-full py-4 mt-2 rounded-2xl
            bg-green-500 hover:bg-green-400 active:scale-[0.98]
            text-black font-semibold text-base
            transition-all duration-150
            disabled:opacity-60 disabled:cursor-not-allowed
            shadow-lg shadow-green-500/20
          "
        >
          {saving ? 'Saving...' : 'Save expense'}
        </button>
        </div>
      </div>
    </div>
  )
}

// ── Percentage validator ──────────────────────────────────────
// Shows live feedback as user types percentages
function PercentageValidator({
  percentages,
  members,
}: {
  percentages: Record<string, string>
  members: string[]
}) {
  const total = members.reduce((sum, id) => sum + (parseFloat(percentages[id] || '0') || 0), 0)
  const diff = Math.abs(100 - total)
  const isValid = diff < 0.01

  if (isValid) return (
    <p className="text-green-400 text-xs mt-2">✓ Percentages add up to 100%</p>
  )

  return (
    <p className="text-amber-400 text-xs mt-2">
      Total: {total.toFixed(2)}% — {total > 100 ? `over by ${(total - 100).toFixed(2)}%` : `${(100 - total).toFixed(2)}% remaining`}
    </p>
  )
}

// ── Exact amount validator ────────────────────────────────────
function ExactAmountValidator({
  exactAmounts,
  members,
  totalCents,
  currency,
}: {
  exactAmounts: Record<string, string>
  members: string[]
  totalCents: number
  currency: string
}) {
  const splitTotal = members.reduce((sum, id) => {
    return sum + (parseToCents(exactAmounts[id] || '0') || 0)
  }, 0)

  const diff = totalCents - splitTotal

  if (diff === 0) return (
    <p className="text-green-400 text-xs mt-2">✓ Amounts add up correctly</p>
  )

  return (
    <p className="text-amber-400 text-xs mt-2">
      {diff > 0
        ? `${formatAmount(diff, currency)} still unassigned`
        : `Over by ${formatAmount(Math.abs(diff), currency)}`
      }
    </p>
  )
}

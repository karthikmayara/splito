// ─────────────────────────────────────────────────────────────
// splitCalculator.ts — All money math lives here
//
// KEY RULE: Never use floating point for money.
// Store and calculate everything in CENTS (integers).
// Only convert to display strings at the last moment.
//
// Example: ₹450.50 → stored as 45050 (cents/paise)
// ─────────────────────────────────────────────────────────────

import type { Split, Debt, Expense, Settlement } from '@/types'

// ── Equal Split ───────────────────────────────────────────────
// Divide a total equally among N people.
// The "extra penny" problem: ₹100 among 3 people = 33.33...
// We give the extra cent to the first person using largest-remainder.
//
// Example: 100 cents / 3 people
//   base share = Math.floor(100/3) = 33 cents each
//   remainder  = 100 - (33*3) = 1 cent left over
//   person[0] gets 33+1=34, person[1] gets 33, person[2] gets 33
//   total = 34+33+33 = 100 ✓
export function calculateEqualSplit(
  totalCents: number,
  memberIds: string[]
): Split[] {
  const n = memberIds.length
  if (n === 0) return []

  // Base amount each person pays (rounded down)
  const baseShare = Math.floor(totalCents / n)

  // How many cents are left over after giving everyone the base
  const remainder = totalCents - baseShare * n

  return memberIds.map((userId, index) => ({
    userId,
    // The first `remainder` people get one extra cent
    // This ensures total always adds up perfectly
    amountCents: baseShare + (index < remainder ? 1 : 0),
  }))
}

// ── Percentage Split ──────────────────────────────────────────
// Split by percentages. Same largest-remainder approach.
// Validates that percentages add up to 100 before calculating.
//
// Example: ₹1000, person A = 60%, person B = 40%
//   A: Math.floor(1000 * 60/100) = 600
//   B: Math.floor(1000 * 40/100) = 400
//   total = 1000 ✓
export function calculatePercentageSplit(
  totalCents: number,
  members: { userId: string; percentage: number }[]
): Split[] {
  // Validate percentages sum to 100 (allow small floating point error)
  const totalPct = members.reduce((sum, m) => sum + m.percentage, 0)
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages must add up to 100, got ${totalPct}`)
  }

  // Calculate raw (possibly fractional) amounts
  const rawAmounts = members.map(m => ({
    userId: m.userId,
    exact: totalCents * m.percentage / 100,
    floor: Math.floor(totalCents * m.percentage / 100),
    fraction: (totalCents * m.percentage / 100) % 1,
  }))

  // Total after flooring everyone
  const floorTotal = rawAmounts.reduce((sum, m) => sum + m.floor, 0)
  const remainder = totalCents - floorTotal

  // Sort by fractional part descending — people with bigger fractions
  // are first in line to receive the extra cents
  const sorted = [...rawAmounts].sort((a, b) => b.fraction - a.fraction)

  // Give extra cents to those with largest remainders
  const bonuses = new Set(sorted.slice(0, remainder).map(m => m.userId))

  return rawAmounts.map(m => ({
    userId: m.userId,
    amountCents: m.floor + (bonuses.has(m.userId) ? 1 : 0),
    percentage: members.find(x => x.userId === m.userId)!.percentage,
  }))
}

// ── Validate Exact Split ──────────────────────────────────────
// When users manually type in amounts, check they add up to total.
// Returns null if valid, error message if not.
export function validateExactSplit(
  totalCents: number,
  splits: { userId: string; amountCents: number }[]
): string | null {
  const splitTotal = splits.reduce((sum, s) => sum + s.amountCents, 0)
  if (splitTotal !== totalCents) {
    const diff = (Math.abs(totalCents - splitTotal) / 100).toFixed(2)
    const direction = splitTotal > totalCents ? 'over' : 'under'
    return `Split is ${direction} by ₹${diff}. Adjust the amounts.`
  }
  return null // valid
}

// ── Debt Minimization Algorithm ───────────────────────────────
// This is the most important function in the app.
//
// Problem: After 20 expenses in a group, you'd normally have
// dozens of individual debts. This is confusing and requires
// many transfers to settle.
//
// Solution: Collapse all debts into a minimal set of transfers.
// "You owe ₹500 to Alice" is better than:
//   "You owe ₹200 to Alice, ₹150 to Bob, Alice owes ₹50 to Bob, ..."
//
// Algorithm:
// 1. Calculate each person's NET balance (sum of what they're owed
//    minus sum of what they owe)
// 2. Separate into creditors (net positive) and debtors (net negative)
// 3. Greedily match the biggest debtor to the biggest creditor
//
// This produces the minimum number of transactions needed to settle
// a group completely.
//
// Example:
//   Alice paid ₹300, Bob paid ₹0, Carol paid ₹0, total expenses ₹300
//   Equal split = ₹100 each
//   Net: Alice = +200, Bob = -100, Carol = -100
//   Result: Bob pays Alice ₹100, Carol pays Alice ₹100
//   → 2 transactions instead of potentially many
export function minimizeDebts(
  expenses: Expense[],
  memberIds: string[],
  settlements: Settlement[] = []
): Debt[] {
  // Step 1: Calculate net balance for each member
  // netBalance[userId] = total they are owed - total they owe
  const netBalance: Record<string, number> = {}
  memberIds.forEach(id => { netBalance[id] = 0 })

  expenses.forEach(expense => {
    expense.splits.forEach(split => {
      // The payer gets credit for the full amount
      // The split member owes their share
      if (split.userId !== expense.paidBy) {
        // split.userId owes expense.paidBy
        netBalance[split.userId] = (netBalance[split.userId] || 0) - split.amountCents
        netBalance[expense.paidBy] = (netBalance[expense.paidBy] || 0) + split.amountCents
      }
    })
  })

  // applied settlements: payer's balance increases, receiver's balance decreases
  settlements.forEach(settlement => {
    netBalance[settlement.fromUserId] = (netBalance[settlement.fromUserId] || 0) + settlement.amountCents
    netBalance[settlement.toUserId] = (netBalance[settlement.toUserId] || 0) - settlement.amountCents
  })

  // Step 2: Separate into who is owed money (creditors) and who owes money (debtors)
  const creditors: { id: string; amount: number }[] = [] // amount > 0: they are owed
  const debtors:   { id: string; amount: number }[] = [] // amount < 0: they owe

  Object.entries(netBalance).forEach(([id, amount]) => {
    if (amount > 0)  creditors.push({ id, amount })
    else if (amount < 0) debtors.push({ id, amount: -amount }) // store as positive
  })

  // Step 3: Greedily match debtors to creditors
  const debts: Debt[] = []

  // Work through until everyone is settled
  let ci = 0 // creditor index
  let di = 0 // debtor index

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor   = debtors[di]

    // The transfer amount is the smaller of what the debtor owes
    // and what the creditor is owed
    const transferAmount = Math.min(creditor.amount, debtor.amount)

    if (transferAmount > 0) {
      debts.push({
        fromUserId: debtor.id,
        toUserId:   creditor.id,
        amountCents: transferAmount,
      })
    }

    // Reduce both balances by the transfer amount
    creditor.amount -= transferAmount
    debtor.amount   -= transferAmount

    // Move to next creditor/debtor once fully settled
    if (creditor.amount === 0) ci++
    if (debtor.amount === 0)   di++
  }

  return debts
}

// ── Display Helpers ───────────────────────────────────────────
// Convert cents to display string. Only use for rendering, never for math.

export function formatAmount(cents: number, currency: string = 'INR'): string {
  const amount = cents / 100

  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }

  const symbol = symbols[currency] || currency
  // toFixed(2) ensures "₹100.50" not "₹100.5"
  return `${symbol}${amount.toFixed(2)}`
}

// Parse a user-typed string like "450.50" into cents (45050)
// Returns null if the input is not a valid number
export function parseToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[₹$€£,]/g, '') // remove currency symbols
  const num = parseFloat(trimmed)
  if (isNaN(num) || num < 0) return null
  // Round to avoid floating point: 450.50 * 100 = 45050.000000000001
  return Math.round(num * 100)
}

// ── Expense Status Utility ────────────────────────────────────
// Mathematically computes whether a given expense is considered Settled,
// Partial, or Unpaid based on the overall net balance of each debtor toward the payer.
export function getExpenseStatus(
  expense: Expense,
  allExpenses: Expense[],
  allSettlements: Settlement[]
): 'settled' | 'partial' | 'unpaid' {
  const payerId = expense.paidBy
  let allSettled = true
  let anyPaid = false

  for (const split of expense.splits) {
    if (split.userId === payerId) continue

    const debtorId = split.userId
    
    // totalOwed by debtor to payer across ALL expenses
    let totalOwed = 0
    for (const e of allExpenses) {
      if (e.paidBy === payerId) {
        const s = e.splits.find(x => x.userId === debtorId)
        if (s) totalOwed += s.amountCents
      }
    }

    // totalPaid by debtor to payer across ALL settlements
    let totalPaid = 0
    for (const s of allSettlements) {
      if (s.fromUserId === debtorId && s.toUserId === payerId) {
        totalPaid += s.amountCents
      }
    }

    if (totalPaid >= totalOwed) {
      anyPaid = true
    } else if (totalPaid > 0) {
      allSettled = false
      anyPaid = true
    } else {
      allSettled = false
    }
  }

  // If there are no splits (e.g. they paid for themselves only)
  if (expense.splits.every(s => s.userId === payerId)) {
    return 'settled'
  }

  if (allSettled) return 'settled'
  if (anyPaid) return 'partial'
  return 'unpaid'
}

export function computeExpenseStatuses(
  expenses: Expense[],
  settlements: Settlement[]
): Record<string, 'settled' | 'partial' | 'unpaid'> {
  const statuses: Record<string, 'settled' | 'partial' | 'unpaid'> = {}
  expenses.forEach(e => {
    statuses[e.id] = getExpenseStatus(e, expenses, settlements)
  })
  return statuses
}

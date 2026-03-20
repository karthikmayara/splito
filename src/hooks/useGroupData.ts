// ─────────────────────────────────────────────────────────────
// useGroupData.ts — Reusable hook for loading group + expenses
//
// Both GroupDetail and Dashboard need to:
//   1. Subscribe to expenses in real-time
//   2. Load member user profiles into cache
//   3. Recalculate debts whenever expenses change
//
// Extracting this into a hook prevents duplicating that logic
// in multiple pages.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { subscribeToGroupExpenses, getUsers } from '@/utils/firestoreService'
import { minimizeDebts } from '@/utils/splitCalculator'
import type { Debt, Group } from '@/types'

interface UseGroupDataResult {
  debts: Debt[]
  loading: boolean
}

export function useGroupData(group: Group | null | undefined): UseGroupDataResult {
  const {
    setExpenses,
    setExpensesLoading,
    expenses,
    usersCache,
    addUserToCache,
  } = useStore()

  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  // ── Subscribe to expenses in real-time ────────────────────
  useEffect(() => {
    if (!group) return

    setExpensesLoading(true)
    setLoading(true)

    const unsub = subscribeToGroupExpenses(group.id, async (fetched) => {
      setExpenses(fetched)
      setExpensesLoading(false)
      setLoading(false)

      // Pre-fetch any member profiles not yet in the local cache
      // We need names and UPI IDs to show in the UI
      const uncachedIds = group.members.filter(id => !usersCache[id])
      if (uncachedIds.length > 0) {
        const users = await getUsers(uncachedIds)
        users.forEach(u => addUserToCache(u))
      }
    })

    // Clean up the Firestore listener when the component unmounts
    // or when the group changes
    return () => {
      unsub()
      setExpenses([])
    }
  }, [group?.id])

  // ── Recalculate debts whenever expenses change ────────────
  // minimizeDebts is pure (no side effects), so calling it here
  // on every render with the same inputs is safe and fast
  useEffect(() => {
    if (!group || expenses.length === 0) {
      setDebts([])
      return
    }
    const computed = minimizeDebts(expenses, group.members)
    setDebts(computed)
  }, [expenses, group?.members.join(',')])

  return { debts, loading }
}
